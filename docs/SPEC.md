# OWTA: System Functional Specification
## Document Code: OWTA-SPEC-V1

**Version:** 1.0.0  
**Classification:** Core Functional Specification  
**Status:** Approved & Enforced  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`, `docs/METHODOLOGY.md`, `docs/ENGINEERING.md`

---

## 1. Scope & Boundaries

The **Open Water Transparency Architecture (OWTA)** is a mobile-first public water transparency and emergency relief triage system for Iloilo City. It closes information gaps between the water utility (MPIW/MIWD), the City Government (CDRRMO, City Hall), 180 Barangay Councils, and residents.

### 1.1 In-Scope (Phase 1 MVP)
- Public status board: real-time barangay supply status, published DMA rotational schedules, and emergency advisories.
- Citizen outage and incident reporting with landmark description, Turnstile CAPTCHA, and client rate limiting.
- Automated spatial-temporal report grouping (within 200m radius, 3-hour sliding window per `submit_report()`).
- Barangay official portal: localized incident triage and verification strictly scoped to assigned barangay (`WR06`).
- LGU CDRRMO dispatch matrix: automated relief ranking for barangays dry for $\ge 48$ consecutive hours (`WR06, WR10`).
- Utility operator desk: rotational schedule publishing (with GiST non-overlap constraints) and superseding workflow (`WR01`).
- Mathematical computation of the weekly Water Delivery Index under a published, versioned methodology (`WR04, WR12`).
- Immutable, append-only security auditing (`audit_logs`) and row-level security (RLS) across all tables (`WR08`).

### 1.2 Deferred Features (Phase 2 & Phase 3)
- Phase 2: SMS notification subscriptions and outbox drain, multi-language localization (Hiligaynon, Filipino), photo uploads, and right-of-reply notes.
- Phase 3: Hardware IoT telemetry streaming, automated SCADA valve control, live tanker GPS tracking, pipe GIS network hydraulics (EPANET), and in-app billing disputes. All Phase 3 items are documented in `docs/LATER.md`.

---

## 2. Business Rules Cross-Reference

Every transaction and database mutation satisfies the 12 immutable business rules detailed in `docs/CONTEXT.md` and `docs/METHODOLOGY.md`:

- **`WR01`**: Non-overlapping rotational schedules; revisions supersede prior rows (`water_schedules`).
- **`WR02`**: Status derived dynamically from latest readings; stale data ($\ge 360\text{ min}$) yields `unknown`, never `flowing`.
- **`WR03`**: Mandatory source and as-of provenance; stale warning banner displayed prominently.
- **`WR04`**: Versioned Delivery Index using published schedules and readings; suppression when coverage $< 70\%$.
- **`WR05`**: Spatiotemporal report clustering within 200m/3h (`report_clusters`, `water_reports`).
- **`WR06`**: Relief queue strictly requires continuous dry duration $\ge 48\text{h}$; `unknown` never triggers relief.
- **`WR07`**: Zero public exposure of coordinates, phone numbers, or PII; public reads view layers only.
- **`WR08`**: Immutable append-only audit trail on all staff state changes (`audit_logs`).
- **`WR09`**: Lawful affirmative consent for phone numbers (RA 10173); ephemeral retention and automated purge.
- **`WR10`**: Right-of-reply contextual notes attached to index periods without altering metrics.
- **`WR11`**: Strict dispatch state machine (`queued` $\rightarrow$ `in_transit` $\rightarrow$ `on_site` $\rightarrow$ `completed`) with recipient sign-off.
- **`WR12`**: Simulated test telemetry visibly flagged and excluded from the public Delivery Index.

---

## 3. Functional Requirements Catalog

### 3.1 Public Portal (`FR-PUB`)
- **`FR-PUB-01`: Barangay Status Board (`/`):** Renders real-time status (`flowing`, `low_pressure`, `dry`, `unknown`) across barangays from `v_public_barangay_status`.
- **`FR-PUB-02`: Rotational Supply Schedule Viewer (`/index`):** Displays active and upcoming published supply windows and hours.
- **`FR-PUB-03`: Delivery Index Scoreboard (`/index`):** Displays weekly promised hours, delivered hours ($\ge 7\text{ PSI}$), coverage ratio, and index percentage from `v_public_water_index`.
- **`FR-PUB-04`: Methodology Specification (`/methodology`):** Publishes mathematical formulas, performance tiers, and active parameter sets (`methodology_parameters`).
- **`FR-PUB-05`: Stale Data Warning Banner:** Displays amber banner with as-of time whenever telemetry staleness exceeds threshold (360 min).

### 3.2 Citizen Reporting (`FR-CIT`)
- **`FR-CIT-01`: Rapid Outage Reporting (`/report`):** Allows citizens to submit incidents (`dry_tap`, `low_pressure`, `pipe_burst`, `dirty_water`) with landmark in under 45 seconds.
- **`FR-CIT-02`: Anonymous Ticket Tracking (`/report/[code]`):** Returns unguessable 8-character token (e.g. `A9F3E1B2`) for status lookups via `get_ticket_status()` RPC without exposing raw coordinates.
- **`FR-CIT-03`: Turnstile CAPTCHA & Rate Limiting:** Enforces client rate limiting (5 reports per 30 minutes) and Turnstile token validation prior to RPC execution.
- **`FR-CIT-04`: Explicit RA 10173 Consent:** Requires affirmative checkbox consent before storing mobile contact details.

### 3.3 Barangay Portal (`FR-BRG`)
- **`FR-BRG-01`: Localized Incident Queue (`/staff/reports`):** Authenticated barangay officials view and triage reports strictly scoped to their assigned barangay (`WR06`).
- **`FR-BRG-02`: Incident Verification:** Officials update report status (`verified`, `rejected`, `resolved`) with field verification notes, writing to `audit_logs` (`WR08`).

### 3.4 LGU Relief Dispatch (`FR-LGU`)
- **`FR-LGU-01`: City-Wide Relief Priority Matrix (`/staff/relief`):** CDRRMO dispatchers view barangays with $\ge 48$ consecutive dry hours ordered by dry hours descending (`v_relief_priority_queue`).
- **`FR-LGU-02`: Fleet Inventory Management:** Pre-configured and auxiliary tanker fleet entries (`relief_dispatches`).
- **`FR-LGU-03`: Dispatch Order Lifecycle:** Dispatchers assign tankers and transition status through `in_transit` $\rightarrow$ `on_site` $\rightarrow$ `completed`.
- **`FR-LGU-04`: Closed-Loop Recipient Sign-off (`WR11`):** Requires affirmative on-site recipient sign-off before closing dispatch orders.

### 3.5 Utility Operational Desk (`FR-UTL`)
- **`FR-UTL-01`: Rotational Schedule Publishing (`/staff/schedules`):** Operators publish rotational windows in `water_schedules`. Overlapping windows for the same DMA are rejected (`WR01`).
- **`FR-UTL-02`: Schedule Superseding:** Operators adjust active schedules by publishing replacement records referencing `superseded_by_id`.

### 3.6 System Administration & Auditing (`FR-ADM`)
- **`FR-ADM-01`: User Role Management:** Admins verify staff accounts (`profiles.is_verified`). Unverified accounts default to resident privileges.
- **`FR-ADM-02`: Immutable Audit Trail:** Admins and auditors inspect append-only `audit_logs`.

---

## 4. API & Endpoint Specifications

### 4.1 Public Endpoints
| Method | Route | Auth | Purpose | Input / Parameters | Response |
|---|---|---|---|---|---|
| `GET` | `/` | `anon` | Live Barangay Status Board | — | HTML / Server Component |
| `GET` | `/index` | `anon` | Weekly Delivery Index Scoreboard | — | HTML / Server Component |
| `GET` | `/methodology` | `anon` | Formula & Methodology Specs | — | HTML / Server Component |
| `POST`| `/api/reports` | `anon` | Submit citizen incident report | `{ category, barangayId, landmark, latitude?, longitude?, description?, contactNumber?, consent }` | `{ success: true, ticketToken: "..." }` |
| `GET` | `/report/[code]` | `anon` | Check anonymous report status | Dynamic route: `[code]` | HTML / Server Component (`get_ticket_status()`) |

### 4.2 Staff Server Actions (`app/staff/actions.ts`)
| Server Action | Required Role | Purpose | Database Target |
|---|---|---|---|
| `updateReportTriageAction` | `barangay_official` (own), `lgu_dispatcher`, `admin` | Update incident status (`verified`, `rejected`, `resolved`) | `water_reports`, `report_clusters`, `audit_logs` |
| `dispatchTankerAction` | `lgu_dispatcher`, `admin` | Authorize tanker dispatch | `relief_dispatches`, `report_clusters`, `audit_logs` |
| `updateDispatchStatusAction` | `lgu_dispatcher`, `admin` | Update dispatch lifecycle (`on_site`, `completed` with sign-off) | `relief_dispatches`, `audit_logs` |
| `publishScheduleAction` | `utility_operator`, `admin` | Publish non-overlapping schedule window | `water_schedules`, `audit_logs` |
| `supersedeScheduleAction` | `utility_operator`, `admin` | Replace active schedule window | `water_schedules`, `audit_logs` |

---

## 5. Architectural Invariants

Refer to `docs/ENGINEERING.md` for detailed technical guidelines across Software Architecture, Database Engineering, DevOps & Deployment, Backend Engineering, Security, Performance & Scalability, and Testing & Code Quality.
