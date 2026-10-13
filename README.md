# ProMatrix

> **Multi-company, secure real-estate and business operations — built on a single shared record.**

---

## What Is ProMatrix?

ProMatrix is an enterprise-grade operating system for real estate and business operations. It is designed from the ground up to serve multiple companies, teams, and roles through one unified, secure platform — eliminating data silos, duplicated workflows, and inconsistent records.

Whether managing properties, tenants, leases, financials, or internal processes, ProMatrix provides a single source of truth that every stakeholder can trust.

---

## Core Principles

### 1. One Shared Operational Record
There is no "per-department" copy of the truth. Every transaction, document, status change, and decision is written once and propagated consistently across all views and all companies within the system. If it happened, it's recorded. If it's recorded, it's authoritative.

### 2. Process Before Screen
The user interface reflects business reality — it does not define it. Workflows, validation rules, approval chains, and state transitions are modelled as explicit server-side processes first. Screens are a window into those processes, not a substitute for them. Adding a new UI should never require re-implementing business logic.

### 3. Server Validation Is Authoritative
Client-side validation is a convenience for the user, never a contract with the system. All business rules, permission checks, data integrity constraints, and state-machine transitions are enforced on the server. No client can bypass them. This principle ensures correctness regardless of which client — web, mobile, API, or internal script — touches the system.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React (TypeScript) |
| Backend API | Node.js / Python |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 |
| Containerization | Docker / Docker Compose |
| Version Control | Git → GitHub |

---

## Getting Started (Local Development)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 20+ and/or Python 3.11+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Corel41/ProMatrix.git
cd ProMatrix
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your local credentials
```

### 3. Start Infrastructure Services
```bash
docker compose up -d
```

This starts:
- **promatrix_db** — PostgreSQL 15 on port `5432`
- **promatrix_redis** — Redis 7 on port `6379`

Data is persisted to local Docker volumes (`postgres_data`, `redis_data`) and survives container restarts.

### 4. Verify Services Are Running
```bash
docker compose ps
docker compose logs --follow
```

---

## Project Structure *(evolving)*

```
ProMatrix/
├── docker-compose.yml     # Infrastructure services
├── .gitignore
├── README.md
├── backend/               # API server (Node.js / Python)
├── frontend/              # React application
└── docs/                  # Architecture & process documentation
```

---

## Contributing

All contributions must respect the three core principles above. Business logic lives on the server. The database record is the truth. Screens follow process — not the other way around.

---

*ProMatrix — One shared operational record. Process before screen. Server validation is authoritative.*
