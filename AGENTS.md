# OWTA: Agent Instructions

OWTA (Open Water Transparency Architecture) is a public water-transparency and relief-triage web app for Iloilo City.

Stack: Next.js App Router, React, TypeScript (strict), Tailwind CSS, shadcn/ui, Supabase (Postgres + PostGIS, Auth), Zod, MapLibre GL, Recharts, Vercel.

## Read first

1. `docs/CONTEXT.md` before every task.
2. `docs/DATA_MODEL.md` when a task touches tables, RLS, views, or RPCs.
3. `docs/METHODOLOGY.md` when a task touches status, relief priority, report grouping, or the delivery index.

## Hard rules

- Build only what the ticket and spec authorize. Phase 2 and Phase 3 items are out of scope for the MVP. New ideas go to `docs/LATER.md`.
- Derive, do not store. Status, dry hours, and indexes are computed from readings and schedules, never added as columns.
- RLS on every table. Roles come from `profiles.role` on the server, never from the browser. UI visibility is not authorization.
- No secret or service-role key in source or in any `NEXT_PUBLIC_` variable. `.env.example` holds names only.
- Public pages read through views. No personal data and no exact report coordinates in any public view or API.
- Every public number shows its source and as-of time. Stale data shows `unknown` and a banner. Simulated data is always visibly flagged.
- Validate every input with Zod. Anonymous writes need CAPTCHA and rate limiting.
- Schema changes are numbered SQL migrations in `supabase/migrations/`. Never edit an applied migration.
- Store `timestamptz`; render in Asia/Manila.
- Done means: runs on the hosted stack, RLS tests pass, lint, type-check, tests, and build pass, checked at 375 px and desktop, and loading, empty, error, and stale states exist.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
