# Finvia Invoice Backend

A robust invoice management system built with Express, PostgreSQL and BullMQ. This backend provides a secure, transaction-safe environment for managing the lifecycle of invoices, from draft creation to finalization and payment.

## 🚀 Tech Stack

- **Core**: [Express.js](https://expressjs.com/) (Node.js framework)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Queue & Background Jobs**: [BullMQ](https://docs.bullmq.io/) with [Redis](https://redis.io/)
- **Validation**: [Zod](https://zod.dev/)
- **Documentation**: [Swagger / OpenAPI](https://swagger.io/)

---

## 🛠 Core Features

### 1. Strict State Machine Enforcement
The system enforces a strict lifecycle for every invoice to ensure data integrity and prevent illegal operations.

**Transitions:**
- `DRAFT` → `FINALIZED`: Once items are locked and an invoice number is assigned.
- `FINALIZED` → `PAID`: Marking the invoice as settled.
- `FINALIZED` → `VOID`: Cancelling the invoice (e.g., due to error).

> [!IMPORTANT]
> - Only `DRAFT` invoices can be edited (items, quantities, totals).
> - Once `FINALIZED`, the content is immutable.
> - Illegal transitions (e.g., `DRAFT` → `PAID` or `PAID` → `VOID`) are blocked at the service layer by the state machine logic in `src/modules/invoices/invoice.state.ts`.

### 2. Transaction-Safe Finalization & Concurrency
Finalizing an invoice is a critical operation that involves generating a unique invoice number, calculating final totals, and updating the state.

- **Atomic Transactions**: All database operations during finalization are wrapped in a single transaction to ensure "all-or-nothing" execution.
- **Optimistic Concurrency Control (OCC)**: To prevent race conditions (e.g., two users editing the same invoice simultaneously), the system uses a `version` field. Every update checks the current version:
  ```sql
  UPDATE invoices 
  SET status = 'FINALIZED', version = version + 1 
  WHERE id = ? AND version = current_expected_version;
  ```
  If the version has changed in the meantime, the operation fails with a conflict error, prompting the user to refresh.

### 3. Asynchronous Job Processing
The backend utilizes **BullMQ** and **Redis** to handle time-consuming tasks outside the main request-response cycle.

When an invoice is **FINALIZED**, the system automatically enqueues the following background jobs:
- **`invoice.generate-pdf`**: Simulates the generation of a high-quality PDF document for the invoice.
- **`invoice.send-email`**: Simulates dispatching the invoice to the customer's email.

**Reliability Features:**
- **Automatic Retries**: Failed jobs are retried up to 3 times with exponential backoff.
- **Concurrency Control**: Dedicated workers (see `src/workers/invoice.worker.ts`) handle these tasks efficiently.

### 4. Audit Logging
Every state transition is meticulously tracked to provide a full audit trail.

- **Status Timestamps**: Dedicated columns track when each milestone was reached:
  - `finalizedAt`: When the invoice was finalized.
  - `paidAt`: When the invoice was marked as paid.
  - `voidedAt`: When the invoice was voided.
- **User Context**: The `updatedBy` field stores the identifier of the actor who performed each transition, ensuring accountability for every state change.

---

## 🏗 Project Structure

```text
src/
├── config/             # Database and Redis configurations
├── db/                 # Drizzle schema and migrations
├── middlewares/        # Error handling and authentication
├── modules/            # Domain-driven feature modules
│   ├── invoices/       # Invoice management (Service, Repo, State, Queue)
│   └── products/       # Product catalog management
├── utils/              # Calculation helpers (Money, Pagination)
├── workers/            # BullMQ background job handlers
└── server.ts           # Application entry point
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js**: v18+
- **PostgreSQL**: v14+
- **Redis**: v6+

### Supabase + Drizzle connection setup

For Supabase, use two database URLs:

- `DATABASE_URL`: use the Supabase Session Pooler / Shared Pooler URL for the running app.
- `DATABASE_MIGRATION_URL`: use the direct database URL for Drizzle migrations when possible.

This split avoids a common issue where application traffic works through the pooler, but schema migrations fail because the CLI is using the wrong connection mode.

If your environment cannot reach Supabase over IPv6, you can temporarily point `DATABASE_MIGRATION_URL` to the same value as `DATABASE_URL`, but direct connection is still the preferred option for migrations.

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd invoice-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase DB and Redis credentials
   ```
4. Generate and apply database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Start the worker in a second terminal:
   ```bash
   npm run worker:dev
   ```

### API Documentation

Once the server is running, you can access the interactive Swagger UI at:
`http://localhost:3000/docs`

---

## 📜 License

Created by **Ajay Negi**. Standard ISC License.
