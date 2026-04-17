#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
RUN_ID="${RUN_ID:-$(date +%s)}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
START_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found in PATH."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is required but was not found."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for the health checks."
  exit 1
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required but was not found. Install Grafana k6 and rerun this script."
  exit 1
fi

cd "$ROOT_DIR"

service_is_running() {
  local service="$1"
  local running
  running="$("${COMPOSE_CMD[@]}" ps --status running --services 2>/dev/null || true)"
  grep -qx "$service" <<<"$running"
}

needs_build=false
for service in app worker migrate; do
  if ! "${COMPOSE_CMD[@]}" images -q "$service" 2>/dev/null | grep -q .; then
    needs_build=true
    break
  fi
done

stack_ready=true
for service in postgres redis app worker; do
  if ! service_is_running "$service"; then
    stack_ready=false
    break
  fi
done

if [ "$stack_ready" = true ]; then
  echo "Reusing running Docker Compose stack."
else
  if [ "$needs_build" = true ]; then
    echo "Compose images missing. Building and starting stack."
    "${COMPOSE_CMD[@]}" up -d --build
  else
    echo "Starting existing Compose stack."
    "${COMPOSE_CMD[@]}" up -d
  fi
fi

echo "Applying migrations..."
"${COMPOSE_CMD[@]}" run --rm migrate >/dev/null

echo "Waiting for API health endpoint..."
for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
  echo "API did not become healthy in time."
  exit 1
fi

echo "Running k6 requirement verification flow..."
k6 run "$ROOT_DIR/tests/k6/requirements-flow.js" \
  -e BASE_URL="$BASE_URL" \
  -e RUN_ID="$RUN_ID"

echo "Waiting briefly for worker jobs to finish..."
sleep 4

echo
echo "Checking database evidence..."
DB_REPORT="$("${COMPOSE_CMD[@]}" exec -T postgres psql -U postgres -d invoice_db -At -F '|' -c "
SELECT
  i.customer_name,
  i.status,
  COUNT(a.id),
  COALESCE(string_agg(a.action, ',' ORDER BY a.created_at), '')
FROM invoices i
LEFT JOIN audit_logs a ON a.invoice_id = i.id
WHERE i.customer_name IN ('K6 Paid Flow $RUN_ID', 'K6 Void Flow $RUN_ID')
GROUP BY i.id, i.customer_name, i.status
ORDER BY i.customer_name;
")"

echo "$DB_REPORT"

paid_line="$(grep "^K6 Paid Flow $RUN_ID|" <<<"$DB_REPORT" || true)"
void_line="$(grep "^K6 Void Flow $RUN_ID|" <<<"$DB_REPORT" || true)"

if [[ "$paid_line" != *"|PAID|"* ]]; then
  echo "Requirement check failed: paid invoice was not found in PAID state."
  exit 1
fi

if [[ "$paid_line" != *"INVOICE_CREATED"* || "$paid_line" != *"INVOICE_ITEMS_UPDATED"* || "$paid_line" != *"INVOICE_FINALIZED"* || "$paid_line" != *"INVOICE_PAID"* ]]; then
  echo "Requirement check failed: paid invoice audit trail is incomplete."
  exit 1
fi

if [[ "$void_line" != *"|VOID|"* ]]; then
  echo "Requirement check failed: void invoice was not found in VOID state."
  exit 1
fi

if [[ "$void_line" != *"INVOICE_CREATED"* || "$void_line" != *"INVOICE_FINALIZED"* || "$void_line" != *"INVOICE_VOIDED"* ]]; then
  echo "Requirement check failed: void invoice audit trail is incomplete."
  exit 1
fi

echo
echo "Checking worker logs for async jobs..."
WORKER_LOGS="$("${COMPOSE_CMD[@]}" logs worker --since "$START_TIME_UTC" 2>/dev/null || true)"

if ! grep -q "PDF generation completed" <<<"$WORKER_LOGS"; then
  echo "Requirement check failed: PDF generation job was not observed in worker logs."
  exit 1
fi

if ! grep -q "Email dispatch completed" <<<"$WORKER_LOGS"; then
  echo "Requirement check failed: email dispatch job was not observed in worker logs."
  exit 1
fi

echo
echo "Requirement verification passed for run id $RUN_ID."
