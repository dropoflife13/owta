# OWTA — Iloilo Water Transparency Tracker

> Civic water supply monitoring, rotational schedule transparency, and emergency relief triage for Iloilo City.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Live Production URL:** [https://owta.vercel.app](https://owta.vercel.app) *(or your deployed Vercel domain)*  
**Repository:** [https://github.com/dropoflife13/owta](https://github.com/dropoflife13/owta)  
**Database:** Supabase (PostgreSQL 15 + PostGIS)  

---

## Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling & UI:** Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- **Database & Auth:** Supabase (PostgreSQL with PostGIS, Row Level Security, PostgREST views)
- **ORM / Pooler:** Prisma (`DATABASE_URL` via PgBouncer on port 6543, `DIRECT_URL` on port 5432)
- **Mapping:** MapLibre GL
- **Data Validation:** Zod

---

## Core Documentation

All technical documentation resides in [`docs/`](./docs):

- [`docs/CONTEXT.md`](./docs/CONTEXT.md) — System boundaries, roles, 12 business rules (`WR01`–`WR12`), data sources.
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — Authoritative SQL schemas, migrations, RLS policies, views, RPCs.
- [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md) — Status derivation, relief dry hours, and Water Delivery Index mathematical formulas.
- [`docs/SPEC.md`](./docs/SPEC.md) — Functional requirements, API table, RLS test matrix, ADRs, glossary.
- [`docs/PRIVACY.md`](./docs/PRIVACY.md) — Philippine Data Privacy Act of 2012 (RA 10173) compliance and 30-day purge protocol.
- [`docs/LATER.md`](./docs/LATER.md) — Phase 2 (Next) and Phase 3 (Out of Scope) roadmap items.
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — Standard operating procedures, seeding, and troubleshooting guide.
- [`docs/tickets/`](./docs/tickets) — Vertical-slice build tickets (`01` through `06`).

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Populate NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Start local development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```
