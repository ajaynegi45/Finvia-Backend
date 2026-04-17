# Finvia - Enterprise Invoice Management System

Finvia provides a resilient backend for managing invoice lifecycles with strict state transitions, transactional audit trails, and asynchronous processing. The system handles high-concurrency environments through optimistic locking and decouples heavy operations like PDF generation and email dispatch using a robust task queue.

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Persistence) & Redis (Task Queue)
- **ORM**: Drizzle ORM
- **Task Management**: BullMQ
- **Validation**: Zod
- **Documentation**: Swagger UI
- **Testing**: Grafana k6

---

## 🏗 Architectural Choices & Defense

### 1. Feature-Based Modular Architecture
The project organizes code into domain-specific modules (`src/modules/invoices`, `src/modules/products`, `src/modules/audit`).
- **Defense**: This structure ensures clear boundaries. If a specific domain (like Invoices) requires massive scaling, its logic is already encapsulated, making it trivial to extract into a dedicated microservice without refactoring the entire codebase.

### 2. Transactional Audit Trail
Every state change (Create, Finalize, Pay, Void) executes within a single PostgreSQL transaction that simultaneously updates the invoice and writes a record to the `audit_logs` table.
- **Defense**: This guarantees absolute consistency between the system state and the audit trail. You can never have a status change without a corresponding audit log.

### 3. Optimistic Concurrency Control
The system uses a `version` column for all invoice updates. Every transition checks the current version before applying changes.
- **Defense**: This prevents race conditions in high-concurrency scenarios (e.g., two users trying to finalize the same invoice simultaneously). The system rejects stale updates, ensuring data integrity without the performance overhead of pessimistic locking.

### 4. Immutable Snapshots
When an invoice is created, the system snapshots product details (Name, SKU, Price) into the `invoice_items` table.
- **Defense**: This preserves historical accuracy. Changing a product's price in the master catalog will not alter existing invoices, ensuring audit-compliant financial records.

### 5. Decoupled Asynchronous Processing
Heavy tasks (PDF generation, Email simulation) are offloaded to BullMQ workers once an invoice reaches the `FINALIZED` state.
- **Defense**: This keeps the API responsive. Users receive a success response immediately, while the system handles background processing reliably with built-in retries and backoff strategies.

---

## 🏗 Project Structure

```text
src/
├── config/             # DB, Redis, and Swagger configurations
├── db/                 # Drizzle schema and bootstrap logic
│   └── schema/         # Table definitions (Invoices, Items, Products, Audit)
├── middlewares/        # Auth, role-based access, and validation
├── modules/            # Domain-driven feature modules
│   ├── invoices/       # Core business logic (Service, Repo, State, Queue)
│   ├── products/       # Product catalog management
│   └── audit/          # Audit logging service
├── routes/             # API route aggregation and health checks
├── utils/              # Shared helpers (Money, Pagination, Response)
├── workers/            # BullMQ background job handlers
├── server.ts           # Application API entry point
└── worker.ts           # Background job worker entry point
```

---

## 🚀 Local Setup

### Prerequisites
- Docker & Docker Compose
- Grafana k6 (for running performance/verification tests)

### Quick Start (Docker)
The most reliable way to run the entire stack (API, Worker, Postgres, Redis) is via Docker Compose.

```bash
# 1. Clone the repository
git clone <repo-url>
cd invoice-backend

# 2. Build the system images
docker compose build

# 3. Start all services in the background
docker compose up -d
```

The API will be available at `http://localhost:3000`.
Swagger Documentation: `http://localhost:3000/docs`

---

## 🧪 Testing & Verification

The project includes a comprehensive verification suite that simulates end-to-end requirements.

### Automated Requirement Verification
The `verify` script automates the entire process: it starts the stack, runs a k6 requirements flow, verifies the audit trail in the database, and checks worker logs for async job completion.

```bash
npm run verify
```

### What the Verification Script checks:
- **State Machine Integrity**: Rejects invalid transitions (e.g., DRAFT -> PAID).
- **Audit Consistency**: Verifies that every status change created a valid audit log with the correct `actorId`.
- **Async Delivery**: Scans worker logs to confirm that PDF generation and Email dispatch were triggered and completed successfully.

---

## 🛡 Security & Auth
The system identifies actors via `x-user-id` and `x-user-role` headers.
- Operations changing the system state (Post/Put) **require** these headers for the audit trail.
- Mark as **PAID** requires the `admin` or `finance` role.
