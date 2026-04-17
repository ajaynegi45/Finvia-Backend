#!/usr/bin/env bash
set -euo pipefail

########################################
# BASIC CONFIG
########################################

# Stable compose project name → predictable container names
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-invoice-backend}"

# Script is inside tests/scripts → go to repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Compose file location
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

# Unique run id (used inside k6 + DB verification)
RUN_ID="${RUN_ID:-$(date +%s)}"

# API base URL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Used to filter worker logs only for this run
START_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Where k6 will write summary output
SUMMARY_PATH="$ROOT_DIR/tests/k6/results-summary.json"

########################################
# BREW INSTALL HELPERS (MAC ONLY)
########################################

BREW_BIN=""

detect_brew() {
  # Try normal PATH first
  if command -v brew >/dev/null 2>&1; then
    BREW_BIN="$(command -v brew)"
    return 0
  fi

  # Try common install paths
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$candidate" ]; then
      BREW_BIN="$candidate"
      eval "$("$BREW_BIN" shellenv)"
      return 0
    fi
  done

  return 1
}

install_if_missing() {
  local cmd="$1"
  local pkg="$2"

  if command -v "$cmd" >/dev/null 2>&1; then
    echo "$cmd already installed"
    return
  fi

  if ! detect_brew; then
    echo "Homebrew not found. Install it first: https://brew.sh"
    exit 1
  fi

  echo "$cmd missing → installing via brew..."
  "$BREW_BIN" install "$pkg"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Failed to install $cmd"
    exit 1
  fi
}

########################################
# PRECHECKS
########################################

install_if_missing curl curl
install_if_missing k6 k6

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose not found"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not running"
  exit 1
fi

# Ensure k6 summary folder exists
mkdir -p "$(dirname "$SUMMARY_PATH")"

cd "$ROOT_DIR"

########################################
# STACK MANAGEMENT
########################################

# Check if service is running
service_is_running() {
  local service="$1"
  local running
  running="$("${COMPOSE_CMD[@]}" ps --status running --services 2>/dev/null || true)"
  grep -qx "$service" <<<"$running"
}

# Check if images exist
needs_build=false
for service in app worker migrate; do
  if ! "${COMPOSE_CMD[@]}" images -q "$service" 2>/dev/null | grep -q .; then
    needs_build=true
    break
  fi
done

# Check if stack is already up
stack_ready=true
for service in postgres redis app worker; do
  if ! service_is_running "$service"; then
    stack_ready=false
    break
  fi
done

if [ "$stack_ready" = true ]; then
  echo "Reusing running stack"
else
  if [ "$needs_build" = true ]; then
    echo "Building and starting stack"
    "${COMPOSE_CMD[@]}" up -d --build
  else
    echo "Starting existing stack"
    "${COMPOSE_CMD[@]}" up -d
  fi
fi

########################################
# MIGRATIONS
########################################

echo "Running migrations..."
"${COMPOSE_CMD[@]}" run --rm migrate >/dev/null

########################################
# HEALTH CHECK
########################################

echo "Waiting for API..."

for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
  echo "API not healthy"
  exit 1
fi

########################################
# RUN K6 TEST
########################################

echo "Running k6..."
k6 run "$ROOT_DIR/tests/k6/requirements-flow.js" \
  -e BASE_URL="$BASE_URL" \
  -e RUN_ID="$RUN_ID" \
  -e SUMMARY_PATH="$SUMMARY_PATH"

########################################
# WORKER VERIFICATION (IMPORTANT FIX)
########################################

echo "Checking worker logs..."

worker_ok=false

# Poll logs instead of fixed sleep
for _ in $(seq 1 30); do
  LOGS="$("${COMPOSE_CMD[@]}" logs --since "$START_TIME_UTC" --no-color worker 2>/dev/null || true)"

  if grep -q "PDF generation completed" <<<"$LOGS" && \
     grep -q "Email dispatch completed" <<<"$LOGS"; then
    worker_ok=true
    break
  fi

  sleep 2
done

# If not found → print logs (critical for debugging)
if [ "$worker_ok" != true ]; then
  echo "Worker jobs not observed"
  echo
  echo "Last worker logs:"
  "${COMPOSE_CMD[@]}" logs --no-color --tail=200 worker || true
  exit 1
fi

########################################
# DATABASE VERIFICATION
########################################

echo "Checking database..."

DB_REPORT="$("${COMPOSE_CMD[@]}" exec -T postgres psql -U postgres -d invoice_db -At -F '|' -c "
SELECT
  i.customer_name,
  i.status,
  COUNT(a.id),
  COALESCE(string_agg(a.action::text, ',' ORDER BY a.created_at), '')
FROM invoices i
LEFT JOIN audit_logs a ON a.invoice_id = i.id
WHERE i.customer_name IN ('K6 Paid Flow $RUN_ID', 'K6 Void Flow $RUN_ID')
GROUP BY i.id, i.customer_name, i.status
ORDER BY i.customer_name;
")"

echo "$DB_REPORT"

paid_line="$(grep "^K6 Paid Flow $RUN_ID|" <<<"$DB_REPORT" || true)"
void_line="$(grep "^K6 Void Flow $RUN_ID|" <<<"$DB_REPORT" || true)"

########################################
# STRICT ASSERTIONS
########################################

if [[ "$paid_line" != *"|PAID|"* ]]; then
  echo "Paid invoice failed"
  exit 1
fi

if [[ "$paid_line" != *"INVOICE_CREATED"* || \
      "$paid_line" != *"INVOICE_ITEMS_UPDATED"* || \
      "$paid_line" != *"INVOICE_FINALIZED"* || \
      "$paid_line" != *"INVOICE_PAID"* ]]; then
  echo "Paid audit trail incomplete"
  exit 1
fi

if [[ "$void_line" != *"|VOID|"* ]]; then
  echo "Void invoice failed"
  exit 1
fi

if [[ "$void_line" != *"INVOICE_CREATED"* || \
      "$void_line" != *"INVOICE_FINALIZED"* || \
      "$void_line" != *"INVOICE_VOIDED"* ]]; then
  echo "Void audit trail incomplete"
  exit 1
fi

########################################
# SUCCESS
########################################

echo
echo "Verification passed for RUN_ID=$RUN_ID"