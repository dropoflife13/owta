# OWTA: Technical & Engineering Skills Specification
## Engineering Practices, Architecture, and Operational Standards

**Document Code:** OWTA-ENG-V1  
**Classification:** Core Engineering Specification  
**Status:** Approved & Enforced  
**Core Technologies:** Next.js (App Router, Turbopack), React 19, TypeScript (Strict), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL 15+, PostGIS, Supabase Auth), Vercel.  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`, `docs/METHODOLOGY.md`, `AGENTS.md`

---

## 1. Software Architecture
Application structure, design patterns, and maintainability across the full-stack web ecosystem.

### 1.1 Server & Client Component Architecture (RSC)
- **Server Components by Default:** All page routes and layouts in `app/` are React Server Components unless client-side interactivity, local UI state (`useState`, `useMemo`), or browser APIs (GPS geolocation, clipboard) are strictly required.
- **Client Component Leaf Boundaries:** Client components (`use client`) are placed as far down the component tree as possible (e.g. `components/forms/CitizenReportForm.tsx`, `components/staff/ReportTriageBoard.tsx`).
- **Zero Client Data Fetching for Public Views:** Public status boards, scorecards, and methodology pages fetch data directly on the server via Supabase Server Clients and pass typed props down to presentational components.

### 1.2 Service Layer Architecture (Server Actions & Route Handlers)
- **Mutations via Server Actions:** Authorized staff mutations (incident triage, tanker dispatch, schedule publishing/superseding) are encapsulated in `app/staff/actions.ts` using `'use server'`.
- **Public & System Ingestion via Route Handlers:** Anonymous citizen submissions, webhook callbacks, cron workers, and health probes reside in `app/api/` (e.g. `app/api/reports/route.ts`).
- **Encapsulated Business Logic:** Common database operations, coordinate validations, and audit trail insertions are centralized in the service layer to prevent logic drift between Server Actions and Route Handlers.

### 1.3 REST & RPC API Architecture
- **Complex Spatial Operations via Database RPCs:** Operations requiring atomic geometry computations or multi-table orchestration (e.g., spatiotemporal clustering in `submit_report()`, secure reference lookup in `get_ticket_status()`) are authored as PostgreSQL `SECURITY DEFINER` functions in `public` schema.
- **Declarative Read Queries via PostgREST Views:** Public clients consume high-level security-invoker views (`v_public_barangay_status`, `v_public_water_index`, `v_active_advisories`) with zero direct exposure of underlying raw tables.

### 1.4 SOLID Principles & Separation of Concerns
- **Single Responsibility Principle (SRP):** Presentation components render UI; actions process mutations; RPCs handle database clustering; views handle data projection and PII redaction.
- **Open/Closed Principle (OCP):** Methodology revisions create new versioned parameter rows (`methodology_parameters`) rather than modifying historical equations in-place.
- **Dependency Inversion:** Clients depend on typed interfaces (`TriageReportItem`, `ReliefQueueItem`, `BarangayStatusItem`) defined at the component/service boundary.

---

## 2. Database Engineering
Reliable data models, spatial indexing, and efficient operations with Supabase (PostgreSQL + PostGIS).

### 2.1 Database Design & Relational Modeling (PostgreSQL 15+)
- **Third Normal Form (3NF):** Strict relational hierarchy from `districts` $\rightarrow$ `barangays` $\rightarrow$ `dma_zones` $\rightarrow$ `monitoring_points` $\rightarrow$ `pressure_readings`.
- **Derive, Do Not Store:** Status (`flowing`, `low_pressure`, `dry`, `unknown`), dry hours elapsed, and weekly index percentages are computed dynamically from timestamped telemetry and schedules, never stored as static columns.
- **Timestamptz Canonical Standard:** All temporal columns use `timestamptz` stored in UTC. The UI exclusively renders timestamps in `Asia/Manila` (PHT, UTC+8).

### 2.2 Database Indexing (B-Tree, GiST, GIN)
- **Spatial GiST Indexing:** Polygon boundaries (`barangays.boundary`, `dma_zones.boundary`) and point locations (`monitoring_points.location`, `report_clusters.cluster_center`) utilize GiST indexing for sub-millisecond bounding box intersection and `ST_DWithin` proximity queries.
- **Schedule Non-Overlap Guard (Rule WR01):** Active schedule lookups and conflict prevention leverage compound indexes on `(dma_zone_id, window_start, window_end) WHERE superseded_at IS NULL`.
- **High-Frequency Foreign Keys & Status Lookups:** Indexes on `water_reports(cluster_id)`, `water_reports(barangay_id)`, `water_reports(status)`, and `relief_dispatches(barangay_id)`.

### 2.3 ACID Transactions & Concurrency Handling
- **Atomic Cluster Ingestion:** When concurrent citizen reports arrive, `submit_report()` runs inside an atomic transaction, locking candidate clusters via `FOR UPDATE` or creating a new cluster without race conditions.
- **Superseding State Machine (Rule WR01):** Superseding a schedule window atomically inserts the new replacement record and updates `superseded_at` and `superseded_by_id` on the previous window.

### 2.4 Database Migrations (Supabase CLI)
- **Numbered, Immutable SQL Migrations:** Schema changes are authored strictly as sequential SQL files in `supabase/migrations/` (`0001_extensions.sql` through `0009_views_and_rls.sql`). Applied migrations are never edited in-place.

---

## 3. DevOps & Deployment
Automated delivery, preview verification, and production operations with Vercel and hosted Supabase.

### 3.1 CI/CD & Production Git Workflows
- **Branch Hierarchy:** Features and tickets are implemented and verified on branch `dev`. Once `npm run build` passes with zero errors, changes are fast-forward merged into `main` and pushed to GitHub (`origin/main`).
- **Automated Vercel Deployment:** Pushes to `main` automatically trigger production deployments at [https://owta.vercel.app/](https://owta.vercel.app/).
- **Zero-Downtime Deployments:** Server Actions and Route Handlers are backward-compatible with active database views and RPCs to prevent downtime during rolling deployments.

### 3.2 Environment Variable & Secret Management
- **Client vs. Server Isolation:**
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only Supabase keys exposed to the browser.
  - `SUPABASE_SERVICE_ROLE_KEY` is strictly reserved for administrative tasks and background cron endpoints, never present in any client bundle or `NEXT_PUBLIC_` variable.
  - `.env.example` documents variable names without values.

### 3.3 Next.js 16 App Router Runtime Configuration
- **Dynamic Streaming Guard:** Any server-rendered route or action using dynamic headers or cookies (`await cookies()`) explicitly declares `export const instant = false` to guarantee compatibility with Next.js 16 Partial Prerendering (PPR).
- **Turbopack Build Optimization:** Next.js build runs under Turbopack (`next build`) with strict type-checking and automated route bundling.

---

## 4. Backend Engineering
Business logic, role-based authorization, and resilient server-side workflows.

### 4.1 Authentication & Session Management
- **Supabase SSR Cookie Sessions:** Authenticated sessions use `@supabase/ssr` with HTTP-only, secure, same-site cookies, preventing token leakage into local storage.
- **Role-Based Access Control (RBAC):**
  - Roles originate exclusively from `profiles.role` validated server-side.
  - UI visibility is never treated as authorization. Server Actions explicitly verify `profile.role` and `profile.is_verified` before executing mutations (**Rule WR06**).

### 4.2 Input Validation & Schema Parsing (Zod)
- **Zero Unchecked Inputs:** Every user input, form payload, query parameter, and route argument is validated against a strict Zod schema before database interaction.
- **Sanitized Coordinates:** Geolocation inputs are constrained to Iloilo City geographic bounds ($10.60^\circ - 10.85^\circ\text{ N}, 122.45^\circ - 122.65^\circ\text{ E}$).

### 4.3 Data Caching & Path Revalidation
- **On-Demand Cache Invalidation:** Server Actions call `revalidatePath('/staff/...')` and `revalidatePath('/')` upon successful state changes to guarantee immediate UI consistency without aggressive polling.

---

## 5. Security & Statutory Compliance
Systemic defense-in-depth, OWASP mitigation, and Philippine Data Privacy Act (RA 10173) compliance.

### 5.1 Row-Level Security (RLS)
- **RLS Enabled on Every Table:** Every table has Row-Level Security enabled with explicit policies. Tables with no policy default to unreadable.
- **Barangay Geographic Scoping (Rule WR06):** Barangay officials can only query and mutate reports, clusters, and requests for their assigned jurisdiction (`barangay_id = public.app_barangay()`).
- **Append-Only Audit Trail (Rule WR08):** All state modifications by staff write an immutable record to `audit_logs` capturing `actor_id`, `actor_role`, `action`, `target_table`, `record_id`, and `new_state`. `UPDATE` and `DELETE` on `audit_logs` are revoked.

### 5.2 Zero Public Exposure of Coordinates & PII (Rule WR07)
- **Anonymized Public Views:** The public reads exclusively through views (`v_public_barangay_status`, `v_public_water_index`, `v_active_advisories`).
- **Opaque Reference Code Lookup:** Citizens track report progress via an unguessable 8-character token (e.g. `A9F3E1B2`) backed by `get_ticket_status()`, returning lifecycle state without exposing exact coordinates or telephone numbers.

### 5.3 RA 10173 Statutory Compliance (Rule WR09)
- **Affirmative Opt-In Consent:** Mobile numbers are captured only when the citizen explicitly checks the consent toggle. Without consent, contact details are forced to `NULL`.
- **Ephemeral Retention:** Outage contact records are purged following incident resolution.

### 5.4 Anti-Sybil Rate Limiting (Salted Device Hashing)
- To curb submission spam without collecting invasive hardware fingerprints, edge routes compute a salted HMAC hash (`device_hash = HMAC-SHA256(IP + UserAgent, PEPPER)`).

---

## 6. Performance & Scalability
High-efficiency queries, responsive loading, and resilient architecture under civic surge traffic.

### 6.1 Database Query Optimization
- **N+1 Prevention:** Data queries join related entities in a single roundtrip (e.g., `water_reports` joined with `barangays(name, districts(name))` and `report_clusters(report_count)`).
- **Security-Invoker Views:** Views declare `WITH (security_invoker = true)` to ensure query execution plans leverage caller-specific RLS index paths.

### 6.2 Mobile-First Performance & Accessibility
- **WCAG 2.1 AA Compliance:** Status is never conveyed by color alone; contrast ratios exceed 4.5:1; touch targets are at least $44 \times 44\text{ px}$.
- **Lightweight Payloads:** Public views are compact, pre-rendered, and optimized for sub-2.5s LCP over 3G/4G connections on low-cost mobile devices.

---

## 7. Testing & Code Quality
Verification standards, static analysis, and regression prevention.

### 7.1 Static Analysis & Strict Typing
- **TypeScript Strict Mode:** Zero untyped `any` leaks in production code. All database models are strongly typed via generated schema types.
- **ESLint & Prettier:** Code formatted cleanly, maintaining consistent imports, proper hook dependencies, and zero unused variables.

### 7.2 Build Verification Gate
- Every ticket, pull request, or commit must execute and pass `npm run build` prior to merging into `main`. A build failure immediately blocks deployment.
