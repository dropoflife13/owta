# OWTA: Agent Instructions & Engineering Guidelines

OWTA (Open Water Transparency Architecture) is a public water-transparency and relief-triage web app for Iloilo City.

Stack: Next.js App Router (Next.js 16, Turbopack), React 19, TypeScript (strict), Tailwind CSS, shadcn/ui, Supabase (Postgres 15+ + PostGIS, Auth, RLS), Zod, MapLibre GL, Recharts, Vercel.

## Read first

1. `docs/CONTEXT.md` before every task (Project context, user roles, phase scope, defaults).
2. `docs/DATA_MODEL.md` when a task touches tables, RLS, views, or RPCs (Schema truth).
3. `docs/METHODOLOGY.md` when a task touches status, relief priority, report grouping, or the delivery index.
4. `docs/ENGINEERING.md` for full-stack engineering standards, architecture patterns, and security practices.

## Hard rules

- Build only what the ticket and spec authorize. Phase 2 and Phase 3 items are out of scope for the MVP. New ideas go to `docs/LATER.md`.
- Derive, do not store. Status, dry hours, and indexes are computed from readings and schedules, never added as static columns.
- RLS on every table. Roles come from `profiles.role` on the server, never from the browser. UI visibility is not authorization.
- No secret or service-role key in source or in any `NEXT_PUBLIC_` variable. `.env.example` holds names only.
- Public pages read through views. No personal data and no exact report coordinates in any public view or API (Rule WR07).
- Every public number shows its source and as-of time. Stale data shows `unknown` and a banner (Rule WR02, WR03). Simulated data is always visibly flagged (Rule WR12).
- Validate every input with Zod. Anonymous writes need CAPTCHA and rate limiting.
- Schema changes are numbered SQL migrations in `supabase/migrations/`. Never edit an applied migration.
- Store `timestamptz` in UTC; render in `Asia/Manila` (PHT, UTC+8).
- Next.js 16 Partial Prerendering (PPR): dynamic pages or actions reading cookies/headers must declare `export const instant = false`.
- Done means: runs on the hosted stack, RLS tests pass, lint, type-check, tests, and build pass (`npm run build`), checked at 375 px and desktop, and loading, empty, error, and stale states exist.

---

## Technical & Engineering Skills

Every change in this codebase adheres to these 7 engineering pillars:

### 1. Software Architecture
- **RSC vs. Client Components:** Server Components by default; Client Components (`'use client'`) only at interactive leaves (forms, map widgets, client filters).
- **Service Layer Pattern:** Mutations encapsulated in Server Actions (`app/staff/actions.ts`); public ingestion, cron, and health probes in Route Handlers (`app/api/`).
- **RPC & View Offloading:** Multi-table spatial operations use PostgreSQL RPCs (`submit_report()`, `get_ticket_status()`); reads use security-invoker views (`v_public_barangay_status`, `v_public_water_index`, `v_relief_priority_queue`).
- **SOLID & Separation of Concerns:** Clean separation between presentation components, service mutations, database logic, and data validation.

### 2. Database Engineering
- **Postgres + PostGIS Relational Modeling:** 3NF relational design across districts, barangays, DMA zones, monitoring points, and reports.
- **Indexing Architecture:** Spatial GiST indexes for polygons and points (`ST_DWithin`, bounding box lookups); compound indexes for schedule non-overlap enforcement (`WR01`).
- **ACID & Concurrency:** Atomic report clustering and schedule superseding executed inside database transactions or atomic RPC blocks.
- **Numbered Migrations:** All schema evolutions are versioned SQL migrations in `supabase/migrations/`.

### 3. DevOps & Deployment
- **Git Branching Workflow:** Work on branch `dev`, verify with `npm run build`, fast-forward merge into `main`, and push to `origin/main` to trigger Vercel deployment.
- **Secret Isolation:** Public keys (`NEXT_PUBLIC_`) strictly decoupled from backend secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
- **Zero-Downtime Releases:** Backward-compatible database views and server actions.

### 4. Backend Engineering
- **Supabase Auth (SSR Cookies):** Session tokens stored in HTTP-only, secure cookies via `@supabase/ssr`.
- **Server-Side RBAC:** Verification of `profiles.role` and `profiles.is_verified` inside Server Actions before executing mutations.
- **Zod Validation:** Schema validation on every boundary (API requests, forms, server actions).
- **Path Revalidation:** Immediate cache revalidation via `revalidatePath()` upon successful mutations.

### 5. Security & Statutory Privacy
- **Row-Level Security (RLS):** Enabled on every table with strict role policies.
- **OWASP & Defense-in-Depth:** Parameterized queries, CSRF protection via Server Actions, XSS prevention via React escaping, anti-sybil salted device hashing (`device_hash`).
- **RA 10173 Compliance (Rule WR09):** Affirmative opt-in consent for mobile numbers; ephemeral retention; automated purging of resolved incident contact data.

### 6. Performance & Scalability
- **N+1 Prevention:** Unified queries joining relations in single roundtrips.
- **Security-Invoker Views:** `WITH (security_invoker = true)` ensures execution plans utilize caller RLS indexes.
- **Mobile-First Accessibility:** WCAG 2.1 AA compliance, touch targets $\ge 44\text{ px}$, sub-2.5s LCP over mobile 4G networks.

### 7. Testing & Code Quality
- **Strict TypeScript:** No untyped `any` leaks.
- **Build Gate:** `npm run build` must succeed with zero errors prior to merging into `main`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
