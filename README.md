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
├── src/                # Application source code
│   ├── config/         # Database, Redis, and Swagger configurations
│   ├── db/             # Drizzle schema and bootstrap logic
│   │   └── schema/     # Table definitions (Invoices, Items, Products, Audit)
│   ├── middlewares/    # Auth, role-based access, and validation
│   ├── modules/        # Domain-driven feature modules
│   │   ├── invoices/   # Core business logic (Service, Repo, State, Queue)
│   │   ├── products/   # Product catalog management
│   │   └── audit/      # Audit logging service
│   ├── routes/         # API route aggregation and health checks
│   ├── types/          # Centralized TypeScript domain definitions
│   ├── utils/          # Shared helpers (Money, Pagination, Response)
│   ├── workers/        # BullMQ background job handlers
│   ├── app.ts          # Express application setup 
│   ├── server.ts       # Application API entry point
│   └── worker.ts       # Background job worker entry point
├── tests/              # Test infrastructure
│   ├── k6/             # Requirement flow and performance tests
│   └── scripts/        # Bash scripts for requirement verification
├── Dockerfile          # Multi-stage production build definition
└── docker-compose.yml  # Local stack orchestration
```

---

## 🚀 Local Setup

### Prerequisites
- Docker & Docker Compose
- Grafana k6 (for running performance/verification tests)

### Quick Start (Docker)

This system uses **Docker Compose** to run the API, Worker, Database, and Cache together. Even if you don't have Node.js installed locally, you can run everything with these commands.

#### 1. Build the Application
This step compiles the TypeScript code and prepares the container images for the API and the background worker.
```bash
docker compose build
```

#### 2. Start the Stack
This starts all services (API, Worker, Postgres, Redis) in the background. Docker will automatically handle container naming and networking.
```bash
docker compose up -d
```

#### 3. Accessing the System
Once the services are running, the system exposes the following ports on your machine:

| Service | Local Port | Usage |
| :--- | :--- | :--- |
| **API** | `3000` | The main invoice system API |
| **PostgreSQL** | `5432` | Primary database |
| **Redis** | `6379` | Task queue and cache |

- **Swagger Documentation**: Open [http://localhost:3000/docs](http://localhost:3000/docs) to view and test the API.
- **Health Check**: Visit [http://localhost:3000/health](http://localhost:3000/health) to confirm the service is up.

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
