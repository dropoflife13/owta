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
- Staff accounts are inactive until an admin sets `is_verified = TRUE`. Unverified staff behave as residents.
- `barangay_official` scope is enforced by RLS through `profiles.assigned_barangay_id`.

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

- RA 10173 applies: consent recorded, purpose limited, retention enforced, named privacy contact (see `docs/PRIVACY.md`).
- RLS enabled with explicit policies on every table. Tables with no policy are unreadable.
- Anonymous writes: CAPTCHA, rate limits, and Zod validation.
- Residents never insert into `water_reports` directly; they call `submit_report()` through a server route.
- The audit log is append-only for every role (`audit_logs`).
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
| Report grouping | 200 m, 3 h |
| Contact retention | 30 days |

## Repo layout

```
owta/
  AGENTS.md, CLAUDE.md
  package.json, tsconfig.json, next.config.ts, components.json, middleware.ts
  .env.example            variable names only
  docs/                   CONTEXT.md, DATA_MODEL.md, METHODOLOGY.md, ENGINEERING.md, SPEC.md, LATER.md, PRIVACY.md, RUNBOOK.md, tickets/
  supabase/
    migrations/           numbered SQL, 0001_extensions.sql to 0009_views_and_rls.sql
    seed.sql              sample seed data
    tests/                RLS and view tests
  public/                 static assets, logos
  app/                    Next.js App Router (page.tsx, index/, methodology/, report/, login/, staff/, api/)
  components/             status/, forms/, staff/, ui/
  lib/                    core business logic and shared utilities
  utils/                  supabase/{client,server,middleware}.ts
```
