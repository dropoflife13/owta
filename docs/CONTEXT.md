# OWTA: Project Context

Open Water Transparency Architecture for Iloilo City. Read this before every task.

## Purpose

Water in Iloilo City is delivered in rotating windows. Residents often do not know the exact window, whether water actually arrived, or when a repair will end. Advisories are scattered, and barangays, City Hall, CDRRMO, and the utility do not share one picture.

OWTA is a mobile-first public web app plus a role-based back office. It publishes supply windows, shows current status with a visible as-of time, accepts and de-duplicates citizen reports, ranks barangays for relief, and computes a delivery index under a published methodology. SMS alerts follow in Phase 2.

Stance: neutral and evidence-first. The tool closes information gaps; it does not accuse anyone. UI copy and docs stay neutral toward the utility, the LGU, and barangays.

## Principles

- Derive, do not store. Status and indexes are computed from readings and schedules.
- The server is the authority. UI visibility is never authorization; RLS decides.
- Public reads are cheap and cacheable. Traffic spikes during outages and typhoons.
- Every number carries its source and as-of time.
- Degrade gracefully: last known data first, then a static page and SMS.

## Roles

| Role | Who | Scope |
|---|---|---|
| public (anon) | Any visitor | Read-only; may submit a report through the protected endpoint |
| resident | Registered resident | Optional account; own reports and subscriptions |
| barangay_official | Punong Barangay, secretary, SK, staff | One barangay only |
| lgu_dispatcher | City Hall, CDRRMO | City-wide; relief priority and tankers |
| utility_operator | Utility data steward or delegate | Schedules and readings; no personal data |
| admin | Project team | Verifies users, assigns roles, manages methodology and moderation |
| auditor | Researchers, council staff, media | Read-only aggregates; no personal data |

Rules:
- Roles come only from `profiles.role`. The browser never supplies a role, and users cannot edit their own.
- Staff accounts are inactive until an admin sets `verified_at`. Unverified staff behave as residents.
- `barangay_official` scope is enforced by RLS through `profiles.barangay_id`.

Capabilities:
- Everyone views status, published schedules, and active advisories.
- Everyone except utility_operator and auditor submits reports. Residents also view their own reports.
- Triage and exact report locations: barangay_official (own barangay), lgu_dispatcher and admin (all).
- Publish schedules and enter readings: utility_operator and admin.
- Publish advisories: barangay_official (own barangay); lgu_dispatcher, utility_operator, admin (any).
- Request a tanker: barangay_official. Dispatch: lgu_dispatcher and admin.
- Manage methodology and verify users: admin. View audit log: admin and auditor.
- Export aggregate data: barangay_official (own barangay), lgu_dispatcher, utility_operator, admin, auditor.

## Scope

MVP job: a resident finds when water is coming to their barangay and reports when it does not. A barangay or LGU user triages the report and sees where relief is needed.

| Phase | Contents |
|---|---|
| 1 MVP | Public portal, schedules via operator entry, manual readings, reports with dedup, relief priority, methodology and weekly index, admin verification, audit trail |
| 2 Next | SMS subscriptions and outbox, dispatch workflow, realtime staff dashboard, Filipino and Hiligaynon, report tracking codes, CSV schedule import, right-of-reply notes, photo upload, PWA caching, exports, audit viewer, moderation |
| 3 Later | Sensor ingestion, tanker GPS, Viber and Telegram bots, public API, connection applications and pipe GIS. Not authorized. |

Three-minute demo flow (MVP gate):
1. Resident opens the site, picks a barangay, sees status, today's window, and the as-of time.
2. Resident submits a dry-tap report with a landmark.
3. A second resident reports the same problem; the group count becomes 2.
4. Barangay official signs in, sees the grouped report, marks it verified.
5. Dispatcher opens the relief priority list.
6. Operator publishes a revised schedule; the public page updates.
7. The weekly page shows promised versus delivered with a methodology link.

## Business rules

| ID | Rule |
|---|---|
| WR01 | Published windows for one DMA never overlap. Changes supersede the old row; nothing is overwritten. |
| WR02 | Status derives from the latest reading per monitoring point. A reading older than the stale threshold gives `unknown`, never `flowing`. |
| WR03 | Every public figure shows source and as-of time. Data older than the threshold triggers a banner. |
| WR04 | The delivery index uses only published schedules and recorded readings under a versioned methodology. Recomputing never edits history. |
| WR05 | Reports of the same type and barangay within a radius and time window join one group. Members are kept; the group count is public. |
| WR06 | A barangay enters relief priority when dry hours reach the threshold and status is `dry`. `unknown` never triggers relief. |
| WR07 | The public never sees personal data or exact report coordinates. |
| WR08 | Every staff state change writes an audit record with actor, role, before, and after. |
| WR09 | Phone numbers are stored only with recorded consent. STOP is honored immediately. Contact data is purged after the retention period. |
| WR10 | The utility or LGU may attach a dated note to any index period. Notes never edit numbers. |
| WR11 | Dispatch states move only requested, then dispatched, then delivered or cancelled. |
| WR12 | Readings and schedules carry a source type. Simulated data is flagged and excluded from the public index unless the demo flag is set. |

## Security and privacy

- RA 10173 applies: consent recorded, purpose limited, retention enforced, named privacy contact.
- RLS enabled with explicit policies on every table. Tables with no policy are unreadable.
- Anonymous writes: CAPTCHA, rate limits, and Zod validation.
- Residents never insert into `citizen_reports` directly; they call `submit_report()` through a server route.
- The audit log is append-only for every role. Do not attach the generic audit trigger to tables holding personal data.
- Photos (Phase 2): private bucket, signed URLs, EXIF stripped.
- Strict security headers including CSP.

## Data sources and trust labels

| Phase | Source | Value |
|---|---|---|
| 1 | Public utility advisories, transcribed by staff with a source link | schedule `operator_entry` |
| 1 | Pressure readings entered by operators or agreed volunteers; simulated readings for demos only | reading `manual`, `simulated` |
| 1 | Citizen reports | `citizen` |
| 2 | Utility or LGU CSV or API under an agreement | schedule `utility_advisory` |
| 3 | Authenticated pressure sensors at DMA valves | reading `sensor` |

Simulated data is visibly flagged everywhere it appears. Seed data is fictional and labeled sample.

## Configurable defaults [A]

Values marked [A] are assumptions to confirm with the team and pilot barangays. Keep them configurable. Never present them as fact.

| Setting | Default |
|---|---|
| Stale threshold | 360 min |
| Minimum PSI for flowing | 5 |
| Relief dry hours | 48 |
| Minimum coverage | 0.70 |
| Report grouping | 300 m, 6 h |
| Contact retention | N days (to be assigned) |

Unverified, never stated as fact: number of DMAs, number of barangays, boundary source and license, utility telemetry, typical window times, SMS rates, RA 10173 registration duties. A barangay may be served by more than one DMA [A].

## Stack and conventions

- Next.js App Router, React, TypeScript strict. Match installed versions (Next.js 15, React 19).
- Tailwind CSS and shadcn/ui with central design tokens. Recharts takes server-provided data only.
- Map: MapLibre GL with a tile provider whose terms allow production use. City GeoJSON is a simplified static asset on the CDN (under 300 KB gzip [A]).
- Zod at every boundary. `@supabase/supabase-js` and `@supabase/ssr`; types from `supabase gen types`.
- Server Components by default; Client Components only for the map and forms. Shared UI components take props and never fetch data.
- Server Actions for staff mutations. Route Handlers for public JSON, webhooks, health, cron, and device ingestion. A shared service layer in `lib/` keeps both consistent.
- Public pages use ISR with on-demand revalidation on publish plus a short time-based fallback. Staff pages are server-rendered behind auth. Middleware role guards are a UX convenience; RLS is the authority.
- Realtime only for staff dashboards (Phase 2). A static last-known snapshot is the fallback if the database is unreachable.
- Jobs: pg_cron or Vercel Cron (confirm plan limits): weekly index, nightly retention purge, outbox drain.
- Errors return `{ error, errorId, details }`. Status codes: 400 validation, 401 not signed in, 403 role or scope, 404 not found, 409 conflict, 429 rate limit with `Retry-After`, 500 unexpected.
- Accessibility: WCAG 2.1 AA, status never by color alone, 44 px touch targets, responsive from 375 px. Plain language; a barangay status is reachable within 3 taps from landing.
- UI strings externalized in `i18n/`. English at MVP; Filipino and Hiligaynon in Phase 2.
- Performance: LCP under 2.5 s at p75 on a mid-range Android over 4G; initial JS under 200 KB gzip [A].
- Testing: Vitest, Playwright, axe. pgTAP optional for SQL.
- Environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser); `SUPABASE_SERVICE_ROLE_KEY` (server only, background jobs only); `CAPTCHA_SECRET`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`; `CRON_SECRET`; Phase 2: `SMS_API_KEY`, `SMS_WEBHOOK_SECRET`; Phase 3: `DEVICE_KEY_PEPPER`.

## Repo layout

```
owta/
  AGENTS.md
  package.json, tsconfig.json, next.config.ts, components.json, middleware.ts
  .env.example            variable names only
  docs/                   CONTEXT.md, DATA_MODEL.md, METHODOLOGY.md, SPEC.md, LATER.md, PRIVACY.md, RUNBOOK.md, tickets/
  supabase/
    migrations/           numbered SQL, 0001_extensions.sql onward
    seed.sql              fictional, labeled sample data
    tests/                RLS and view tests
  public/geo/             simplified barangay and DMA GeoJSON
  src/
    app/
      (public)/           landing, b/[barangayId], map, report, methodology, advisories
      (auth)/login/
      staff/              reports, relief, schedules, readings, advisories, index, admin/{users,methodology,audit}
      api/                public, reports, readings, subscriptions, webhooks/sms, cron, health
    components/           ui/ (shadcn), map/, charts/, status/, forms/
    lib/                  supabase/{client,server,middleware,types}.ts, permissions.ts, validators.ts,
                          rateLimit.ts, captcha.ts, logger.ts, sms/, geo.ts, time.ts, index-method.ts
    i18n/                 en.json, fil.json, hil.json
    tests/                unit/, e2e/
```
