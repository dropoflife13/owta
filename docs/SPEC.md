# OWTA: System Specification
## Document Code: OWTA-SPEC-V1

**Version:** 1.0.0  
**Classification:** Core Functional Specification  
**Status:** Approved & Enforced  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`, `docs/METHODOLOGY.md`

---

## 1. Scope & Boundaries

The **Open Water Transparency Architecture (OWTA)** is a mobile-first public water transparency and emergency relief triage system for Iloilo City. It is designed to close the systemic information asymmetry between the water utility (MPIW/MIWD), the City Government (CDRRMO, City Hall), 180 Barangay Councils, and residents.

### 1.1 In-Scope (Phase 1 MVP)
- Public portal: current barangay water supply status, published DMA rotational schedules, and emergency advisories.
- Citizen outage and incident reporting with landmark description, Turnstile CAPTCHA, and client rate limiting.
- Automated spatial-temporal report grouping (default 300 m radius, 6-hour sliding window).
- Barangay official portal: localized incident triage and verification for assigned barangays.
- LGU CDRRMO dispatch matrix: automated relief ranking for barangays dry for $\ge 48$ consecutive hours.
- Utility operator desk: manual rotational schedule publishing (with GiST exclusion constraints) and field gauge pressure logging.
- Mathematical computation of the weekly Water Delivery Index under a published, versioned methodology.
- Immutable, append-only security auditing (`audit_logs`) and role-based access control (RLS) across all tables.

### 1.2 Explicitly Deferred (Phase 2 & Phase 3)
- Phase 2: SMS notification subscriptions and outbox drain, multi-language localization (Hiligaynon, Filipino), photo uploads, and right-of-reply notes.
- Phase 3: Hardware IoT telemetry streaming, automated SCADA valve control, live tanker GPS tracking, pipe GIS network hydraulics (EPANET), and in-app billing disputes. All Phase 3 items are documented in `docs/LATER.md`.

---

## 2. Business Integrity Rules (`WR01` – `WR12`)

Every transaction, API call, and database mutation within OWTA must satisfy these 12 immutable rules. Violations trigger transaction rollbacks and security audit logging.

| Rule ID | Rule Title | Formal Statement & Database Enforcement |
|---|---|---|
| **`WR01`** | **Non-Overlapping Schedules** | Published windows for a single DMA never overlap in time. Any schedule revision formally supersedes the preceding row; nothing is overwritten or deleted in-place. Enforced via PostgreSQL GiST exclusion constraint: `exclude using gist (dma_id with =, tstzrange(window_start, window_end) with &&) where (status = 'published')`. |
| **`WR02`** | **Status Derivation & Stale Fail-Safe** | Status is derived strictly from the latest reading per active pressure point (`v_point_latest`). When data is absent or older than `stale_after_minutes` (default 360 min), status resolves to `unknown`, never `flowing`. |
| **`WR03`** | **Mandatory Provenance & As-Of Time** | Every public number and status badge displays its source and exact as-of timestamp. When telemetry exceeds the staleness threshold, the UI displays a prominent warning banner. |
| **`WR04`** | **Versioned Delivery Index** | The weekly Water Delivery Index uses only published schedules and recorded readings under an immutable, versioned methodology (`index_methodologies`). Index snapshots (`delivery_snapshots`) are permanently preserved; updating methodology creates a new version without altering past history. |
| **`WR05`** | **Spatiotemporal Report Grouping** | Citizen reports of the same category and barangay submitted within 300 meters and 6 hours join an existing active group in `report_groups`. Member records are preserved in `citizen_reports`; the public sees only anonymized group counts through `v_public_report_groups`. |
| **`WR06`** | **Relief Ranking by Verified Dry Duration** | A barangay enters the emergency relief queue (`v_relief_priority`) only when a serving DMA has status `dry` and consecutive dry duration reaches or exceeds `relief_dry_hours` (default 48 hours). A DMA with `unknown` status never triggers relief. |
| **`WR07`** | **PII & Coordinate Shielding** | The public never sees personal data, citizen phone numbers, or exact report coordinates. Public clients consume only security-barrier views (`v_barangay_status`, `v_public_report_groups`). Coordinate data is accessible only to authorized staff (`barangay_official`, `lgu_dispatcher`, `admin`). |
| **`WR08`** | **Append-Only Audit Trail** | Every state modification by staff generates an audit log record with actor, role, table, and before/after states. The `audit_logs` table is strictly append-only; `UPDATE`, `DELETE`, and `TRUNCATE` operations are revoked and blocked via trigger. |
| **`WR09`** | **Lawful Consent & Ephemeral Retention** | In compliance with RA 10173, citizen mobile numbers are stored only with explicit affirmative consent (`consent_at IS NOT NULL`). Opt-out (STOP) is executed immediately, and contact data is purged after the statutory retention period. |
| **`WR10`** | **Right-of-Reply Period Notes** | Water utility operators and LGU dispatchers may attach contextual notes (`period_notes`) to any DMA and weekly index period. Notes are displayed alongside the figures but can never alter the computed metrics. |
| **`WR11`** | **Strict Dispatch State Machine** | Tanker dispatches follow a strict linear lifecycle: `requested` $\rightarrow$ `dispatched` $\rightarrow$ `delivered` or `cancelled`. State transitions require authenticated dispatcher action and delivered volume logging. |
| **`WR12`** | **Simulated Telemetry Isolation** | Pressure readings and schedules carry an explicit source type (`manual`, `sensor`, `simulated`). Simulated data is visibly flagged across all UI interfaces and strictly excluded from the official Delivery Index unless the demonstration flag is explicitly active. |

---

## 3. Functional Requirements Catalog

### 3.1 Public Portal (`FR-PUB`)
- **`FR-PUB-01`: Barangay Status Board:** Renders real-time status (`flowing`, `low`, `dry`, `unknown`) across all barangays. A barangay reflects the worst status among its serving DMAs (per `v_barangay_status`).
- **`FR-PUB-02`: Rotational Supply Schedule Viewer:** Allows residents to view active and upcoming published supply windows, hours until next window, and schedule notes.
- **`FR-PUB-03`: Interactive Supply & Incident Map:** Renders MapLibre GL map with color-coded barangay polygons and aggregated report group markers (no raw coordinates).
- **`FR-PUB-04`: Emergency Advisory Feed:** Displays active public advisories filtered by geographic scope (`city`, `district`, `dma`, `barangay`) and severity (`info`, `warning`, `emergency`).
- **`FR-PUB-05`: Delivery Index Scoreboard:** Displays weekly promised hours, delivered hours, coverage ratio, and index percentage, linked to the published methodology page.
- **`FR-PUB-06`: Stale Data Warning Banner:** Displays an amber warning banner with exact as-of time whenever telemetry staleness exceeds threshold parameters.

### 3.2 Citizen Reporting (`FR-CIT`)
- **`FR-CIT-01`: Rapid Outage Reporting:** Allows citizens to submit incidents (`dry_tap`, `low_pressure`, `pipe_burst`, `discolored_water`, `other`) with landmark description in under 45 seconds.
- **`FR-CIT-02`: Anonymous Ticket Tracking:** Returns an unguessable 8-character reference code (e.g., `A9F3E1B2`) upon submission for status lookups without requiring account registration.
- **`FR-CIT-03`: Turnstile CAPTCHA & Rate Limiting:** Enforces client rate limiting and Cloudflare Turnstile token validation prior to database execution.
- **`FR-CIT-04`: Optional SMS Notification Consent:** Allows citizens to opt-in with explicit checkbox consent for incident resolution text updates pursuant to RA 10173.

### 3.3 Barangay Portal (`FR-BRG`)
- **`FR-BRG-01`: Localized Incident Queue:** Authenticated barangay officials view and triage report groups strictly belonging to their assigned barangay (`app_barangay()`).
- **`FR-BRG-02`: Incident Verification:** Officials update report status (`open`, `verified`, `dispatched`, `resolved`, `rejected`) and record triage notes.
- **`FR-BRG-03`: Tanker Assistance Request:** Officials initiate tanker assistance requests directly to the LGU CDRRMO dispatch queue when supply failure persists.
- **`FR-BRG-04`: Local Advisory Authoring:** Officials publish localized advisories scoped to their barangay.

### 3.4 LGU Relief Dispatch (`FR-LGU`)
- **`FR-LGU-01`: City-Wide Relief Priority Matrix:** CDRRMO dispatchers view barangays with $\ge 48$ consecutive dry hours ordered by dry hours descending (`v_relief_priority`).
- **`FR-LGU-02`: Fleet Inventory Management:** Dispatchers register and track water relief tankers (`tankers`), ownership organization, and volumetric capacity.
- **`FR-LGU-03`: Dispatch Order Lifecycle:** Dispatchers assign tankers to requesting barangays and transition status through `requested` $\rightarrow$ `dispatched` $\rightarrow$ `delivered`.
- **`FR-LGU-04`: Relief Audit Reporting:** System exports timestamped records of total volume delivered and response duration.

### 3.5 Utility Operational Desk (`FR-UTL`)
- **`FR-UTL-01`: Rotational Schedule Publishing:** Operators draft and publish DMA schedules. The system rejects overlapping windows via exclusion constraint (`WR01`).
- **`FR-UTL-02`: Schedule Superseding:** Operators supersede existing schedules with replacement windows, logging operational justification.
- **`FR-UTL-03`: Manual Pressure Telemetry Logging:** Operators record calibrated gauge pressure readings at monitoring points with boundary validation ($P \ge 0$).
- **`FR-UTL-04`: Period Note Attaching:** Operators attach right-of-reply context (`period_notes`) to specific DMA weeks without altering calculated index values.

### 3.6 System Administration & Auditing (`FR-ADM`)
- **`FR-ADM-01`: User Role Management:** Admins verify staff accounts (`profiles.verified_at`) and assign roles. Unverified accounts default to resident privileges.
- **`FR-ADM-02`: Methodology Versioning:** Admins define new parameter sets in `index_methodologies` (`min_psi`, `stale_after_minutes`, `relief_dry_hours`, `min_coverage`).
- **`FR-ADM-03`: Immutable Audit Inspector:** Admins and independent auditors inspect the append-only `audit_logs` table.

---

## 4. API & Endpoint Specifications

### 4.1 Public Endpoints
| Method | Route | Auth | Purpose | Input / Parameters | Response |
|---|---|---|---|---|---|
| `GET` | `/api/public/status` | `anon` | Fetch current barangay supply status | `?district=ID&search=name` | `[{ barangay_id, name, district, status, min_avg_psi, as_of }]` |
| `GET` | `/api/public/schedules` | `anon` | Fetch published schedules | `?dma_id=UUID` or `?barangay_id=UUID` | `[{ id, dma_id, window_start, window_end, flow_type, status, source }]` |
| `GET` | `/api/public/advisories`| `anon` | Fetch active advisories | `?scope=city\|district\|dma\|barangay` | `[{ id, scope, severity, title, body, starts_at, ends_at }]` |
| `GET` | `/api/public/index` | `anon` | Fetch weekly delivery index snapshots | `?dma_id=UUID&week_start=YYYY-MM-DD` | `[{ dma_id, week_start, promised_hours, delivered_hours, coverage_ratio, insufficient_data }]` |
| `POST`| `/api/reports` | `anon` | Submit citizen incident report | `{ type, barangay_id, landmark, lng?, lat?, flow_loss?, description?, phone?, consent, captcha_token }` | `{ ok: true, reference_code: "..." }` (calls `submit_report()` RPC) |
| `GET` | `/api/reports/[code]` | `anon` | Check anonymous report status | Dynamic route: `[code]` | `{ reference_code, report_type, status, created_at, resolved_at }` (No coordinates/PII) |

### 4.2 Staff & Operator Endpoints (Server Actions / Authenticated Route Handlers)
| Method | Route | Required Role | Purpose | Input / Parameters | Response |
|---|---|---|---|---|---|
| `POST` | `/api/staff/readings` | `utility_operator`, `admin` | Record pressure reading | `{ monitoring_point_id, recorded_at, psi, source }` | `{ ok: true, reading_id: "..." }` |
| `POST` | `/api/staff/schedules` | `utility_operator`, `admin` | Publish or supersede schedule | `{ dma_id, window_start, window_end, flow_type, supersedes_id?, notes? }` | `{ ok: true, schedule_id: "..." }` |
| `POST` | `/api/staff/advisories`| `barangay_official` (own), `lgu_dispatcher`, `utility_operator`, `admin` | Create advisory | `{ scope, district_id?, dma_id?, barangay_id?, severity, title, body, ends_at? }` | `{ ok: true, advisory_id: "..." }` |
| `POST` | `/api/staff/reports/triage` | `barangay_official` (own), `lgu_dispatcher`, `admin` | Update report triage status | `{ report_id, status, notes }` | `{ ok: true }` |
| `POST` | `/api/staff/relief/request` | `barangay_official` | Request water relief tanker | `{ barangay_id, notes? }` | `{ ok: true, dispatch_id: "..." }` |
| `POST` | `/api/staff/relief/dispatch`| `lgu_dispatcher`, `admin` | Assign tanker and dispatch | `{ dispatch_id, tanker_id, notes? }` | `{ ok: true }` |
| `POST` | `/api/staff/relief/deliver` | `lgu_dispatcher`, `admin` | Confirm relief delivery | `{ dispatch_id, liters_delivered, notes? }` | `{ ok: true }` |
| `POST` | `/api/staff/period-notes` | `utility_operator`, `lgu_dispatcher`, `admin` | Add right-of-reply period note | `{ dma_id, week_start, note }` | `{ ok: true, note_id: "..." }` |

### 4.3 Governance & Automation Endpoints
| Method | Route | Auth | Purpose | Response |
|---|---|---|---|---|
| `POST` | `/api/cron/index` | Bearer `CRON_SECRET` | Weekly index batch computation | `{ processed_dmas: N, snapshots_created: N }` |
| `POST` | `/api/cron/purge` | Bearer `CRON_SECRET` | Nightly RA 10173 contact retention purge | `{ purged_records: N }` |
| `GET` | `/api/health` | Public | System health check (Postgres connectivity, PostGIS probe) | `{ status: "ok", timestamp: "..." }` |

---

## 5. Test Plan & Quality Assurance Gates

### 5.1 Row-Level Security (RLS) Verification Matrix
Every table and RPC must be verified against all 7 security roles (`anon`, `resident`, `barangay_official`, `lgu_dispatcher`, `utility_operator`, `admin`, `auditor`):

| Test Case ID | Target | Actor | Expected Result |
|---|---|---|---|
| `TC-RLS-01` | `citizen_reports` (Direct Insert) | `anon` | **Blocked** (`42501 permission denied`). Anonymous writes must invoke `submit_report()`. |
| `TC-RLS-02` | `citizen_reports` (Read All) | `anon` | **Blocked** (0 rows returned). Public reads only `v_public_report_groups`. |
| `TC-RLS-03` | `citizen_reports` (Cross-Barangay) | `barangay_official` | **Blocked** (Returns 0 rows for barangays other than `app_barangay()`). |
| `TC-RLS-04` | `profiles` (Self-Role Escalation) | `resident` | **Blocked** (Revoked column permissions on `role` and `verified_at`). |
| `TC-RLS-05` | `audit_logs` (Direct Mutation) | `admin` | **Blocked** (`UPDATE`/`DELETE` blocked by exception trigger). |
| `TC-RLS-06` | `audit_logs` (Read Access) | `auditor` | **Allowed** (Read-only access to governance trail). |
| `TC-RLS-07` | Unverified Staff Behavior | Unverified `barangay_official` | **Downgraded** (`app_role()` returns `'resident'`, access denied to staff triage). |

### 5.2 Methodology Test Fixtures
The SQL test suite (`supabase/tests/`) must validate against these explicit fixtures:
1. **Stale DMA Fixture:** Monitoring point with reading older than 360 minutes $\rightarrow$ status must resolve to `unknown`.
2. **Relief Elevation Fixture:** DMA with reading = 0 PSI for $\ge 48.0$ hours $\rightarrow$ serving barangay appears in `v_relief_priority` ordered by dry hours.
3. **Multi-DMA Barangay Fixture:** Barangay served by DMA A (`dry`) and DMA B (`flowing`) $\rightarrow$ barangay status resolves to `dry` (worst-case roll-up).
4. **Insufficient Coverage Fixture:** Week with $<70\%$ promised hours having valid readings $\rightarrow$ snapshot records `insufficient_data = true` and suppresses percentage.
5. **Simulated Isolation Fixture:** Pressure reading with `source = 'simulated'` $\rightarrow$ excluded from `compute_weekly_delivery_index()` when demo mode is inactive.
6. **Methodology Immutability Fixture:** Version 2 inserted into `index_methodologies` $\rightarrow$ snapshots computed under Version 1 remain strictly unchanged.

### 5.3 Playwright End-to-End Demo Gate (3-Minute Flow)
1. Unauthenticated citizen opens `/`, selects a pilot barangay, and checks status, scheduled window, and as-of time.
2. Citizen navigates to `/report`, passes Turnstile verification, and submits a dry tap report with landmark. Receives reference code.
3. Second submission in the same vicinity joins the cluster, incrementing `report_count` to 2.
4. Barangay official logs in, views the clustered report under `/staff/reports`, and verifies the incident.
5. LGU dispatcher logs in and views the elevated barangay in `/staff/relief`.
6. Utility operator publishes a revised schedule under `/staff/schedules`; public view revalidates.
7. Delivery Index page displays promised vs. delivered hours with an active link to `/methodology`.

---

## 6. Technical Risks & Architectural Decisions

### ADR-01: Derive, Do Not Store
- **Context:** Storing computed states (e.g., `status = 'flowing'`, `dry_hours = 52`) as static columns creates cache synchronization drift and stale data bugs during high-traffic outages.
- **Decision:** Derive current status dynamically via views (`v_dma_status`, `v_barangay_status`, `v_relief_priority`) from time-stamped telemetry (`pressure_readings`).
- **Consequences:** Eliminates stale column states. Requires indexing on `(monitoring_point_id, recorded_at DESC)`.

### ADR-02: Public Reads via Security-Barrier Views
- **Context:** Exposing direct database tables to PostgREST risks leaking reporter phone numbers, IP hashes, or precise GPS coordinates.
- **Decision:** All public reads are routed through views (`v_barangay_status`, `v_public_report_groups`) that deliberately omit personal and high-precision coordinates.
- **Consequences:** Guarantees compliance with Philippine Data Privacy Act (RA 10173).

### ADR-03: GiST Exclusion Constraint on Schedules
- **Context:** Concurrent operator edits could create overlapping promised supply windows, corrupting the Water Delivery Index calculation.
- **Decision:** Use PostgreSQL `EXCLUDE USING gist` over `dma_id WITH =, tstzrange(window_start, window_end) WITH &&` where `status = 'published'`.
- **Consequences:** Database enforces `WR01` at the storage layer; conflicting published schedules are rejected with constraint violation.

### ADR-04: Turnstile CAPTCHA & Keyed Rate Limiting
- **Context:** Malicious flooding of anonymous outage reports could distort the public map and misdirect emergency relief tankers.
- **Decision:** Require Cloudflare Turnstile token validation and client token-bucket rate limiting (`rate_limit_buckets`) before allowing calls to `submit_report()`.
- **Consequences:** Mitigates automated sybil attacks without creating friction for authentic mobile users.

---

## 7. System Glossary

| Term | Definition |
|---|---|
| **As-Of Time** | The exact UTC/Asia-Manila timestamp of the newest telemetry reading used to evaluate current operational status. |
| **Barangay** | The smallest municipal administrative division in the Philippines. Iloilo City comprises 180 barangays across 7 districts. |
| **CDRRMO** | City Disaster Risk Reduction and Management Office; the primary LGU authority managing municipal emergency relief water tankers. |
| **Delivery Index** | Mathematical ratio of delivered hours ($\ge \text{min\_psi}$) to promised schedule hours over a standard Monday-to-Monday week. |
| **DMA** | District Metered Area; an isolated hydrologic sector of the water distribution network where water inflow and pressure are monitored. |
| **Flow Type** | Rotational supply category: `full` (pressurized supply), `low` (low-pressure window), or `shut` (valves closed/rationed). |
| **Held Reading** | Telemetry reading that remains effective until the next reading arrives or the stale duration threshold is reached. |
| **MPIW / MIWD** | Metro Pacific Iloilo Water / Metro Iloilo Water District; the private concessionaire and public water utility for Iloilo City. |
| **PSGC** | Philippine Standard Geographic Code; standardized administrative code assigned to local government units. |
| **RA 10173** | Republic Act No. 10173, the Philippine Data Privacy Act of 2012, governing lawful processing and retention of personal data. |
| **RLS** | Row-Level Security; PostgreSQL mechanism restricting rows accessible to database users based on session role and claims. |
| **Superseded** | A schedule row whose time window has been modified by a replacement row (`superseded_by_id`). Preserved for index calculation. |
