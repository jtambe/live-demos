# MRA VBC Opportunities Platform

An MRA (Medicare Risk Adjustment) platform for managing Medicare Advantage (MA) coding opportunities. Consolidates healthcare provider records to identify chronic condition documentation gaps and routes them to clinical coders for disposition, enabling providers to capture missing HCC codes that drive risk adjustment revenue. Built with FastAPI (Python backend), Next.js/TypeScript (frontend), PostgreSQL (Supabase), and deployed on Vercel.

---

## Documentation

- **[README.md](./README.md)** — Core requirements (C1–C4), non-functional expectations (NF1–NF3), and real-world data handling (32 members, dual-payer scenarios, year-over-year tracking, cross-payer conflicts, null handling)

- **[Database.md](./Database.md)** — Database schema, table relationships, encryption strategy, indexes, and stored procedures

- **[tests.md](./tests.md)** — Testing instructions for both Python backend (pytest) and TypeScript frontend (Jest); step-by-step setup from repo root

---

## Architecture & Design Diagrams

- **[Architecture Diagram](https://miro.com)** — System components, data flow, authentication, role-based access (Miro board)

- **[UML Diagram](https://miro.com)** — Entity relationships, disposition workflow state transitions, audit trail design (Miro board)

---

## Quick Start

```bash
# Backend tests
cd api && source venv/bin/activate && pytest -v

# Frontend tests
cd app && npm test

# Local development (requires FastAPI backend running)
cd app && npm run dev
```

See [tests.md](./tests.md) for detailed setup.
