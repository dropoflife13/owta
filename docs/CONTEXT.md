# OWTA: Iloilo Water Transparency Tracker
## Master System Blueprint & Architectural Specification

**Document Version:** 1.0.0  
**Classification:** Technical / Audit-Ready  
**Jurisdiction:** Iloilo City, Republic of the Philippines  
**Target Compliance:** ISO/IEC 25010, ISO/IEC 27001, RA 10173 (Data Privacy Act of 2012)

---

## 1. Executive Summary

The **Iloilo Water Transparency Tracker (OWTA)** is a mission-critical civic infrastructure and operational transparency platform engineered for Iloilo City. Within the service coverage of Metro Pacific Iloilo Water (MPIW) and the Metro Iloilo Water District (MIWD), municipal potable water is distributed via rotational hydraulic schedules across District Metered Areas (DMAs). Due to seasonal supply deficits, infrastructure bottlenecks, and pipeline leaks, water distribution frequently diverges from scheduled windows.

Historically, this divergence has led to severe civic friction:
* Rotational schedules are published as static, unsearchable social media images with little to no real-time adjustment.
* Citizen complaints are fragmented across social media comments, barangay halls, and customer service hotlines without systematic aggregation.
* Local Government Unit (LGU) emergency water rationing tankers (dispatched via the City Disaster Risk Reduction and Management Office - CDRRMO) are deployed reactively to the "loudest voices" rather than verified dry zones.
* There is no independent, immutable, and auditable record of promised supply versus delivered water.

OWTA resolves this systemic asymmetry by providing:
1. **Real-Time Operational Visibility:** Machine-readable, geospatial mapping of DMA rotational schedules with full superseding history.
2. **Crowdsourced & Verified Pressure Telemetry:** Public incident reporting with anti-sybil protection, spatiotemporal clustering, and barangay-level triage.
3. **Data-Driven LGU Relief Prioritization:** Automated algorithmic queuing of emergency tanker dispatches based on verified consecutive dry hours.
4. **The Iloilo Water Delivery Index:** A standardized, weekly mathematical benchmark measuring percentage delivery of scheduled water above distribution pressure thresholds, published under an open, verifiable methodology.

---

## 2. High-Level Architecture Diagram

The OWTA platform implements a zero-trust, multi-tiered architecture separating public read-heavy caching from secure, role-gated administrative workflows.

```mermaid
flowchart TD
    subgraph Client Tier
        PWA["Public Web Client / PWA\n(Citizen Discovery, Reporting, Maps)"]
        PORTAL["Authorized Staff Portals\n(Barangay, LGU Dispatcher, Utility Desk, Admin)"]
    end

    subgraph Edge Tier
        CF["Cloudflare CDN & Edge\n(DDoS Mitigation, SSL/TLS, Caching)"]
        TURN["Cloudflare Turnstile\n(Bot / Sybil Challenge)"]
        EDGE_MW["Next.js Edge Middleware\n(Session Refresh, Route Guards, Rate Limit)"]
    end

    subgraph Application Tier
        RSC["Next.js Server Components (RSC)\n(Optimized Read Cache, Public Hydration)"]
        ACT["Next.js Server Actions\n(Validated Mutations, RBAC Checks)"]
        API["Next.js Route Handlers (/api/*)\n(SMS Webhooks, Cron Workers, Health)"]
        ZOD["Zod Validation Layer\n(Boundary & Schema Verification)"]
    end

    subgraph Security & Integration Tier
        PEPPER["Device Pepper Hash Engine\n(SHA-256 Client Fingerprinting)"]
        SMS_GW["PhilSMS / Semaphore Gateway\n(Transactional SMS & Alerts)"]
        CRON["Automated Cron / Maintenance\n(Index Calculation, PII Purge)"]
    end

    subgraph Data Tier (Supabase / PostgreSQL 15+)
        RLS["Row-Level Security (RLS) Engine\n(app_role() Security Definer Gating)"]
        POSTGIS["PostGIS Spatial Engine\n(DMA Polygons, Barangay Geometries, Clustering)"]
        VIEWS["Materialized & Public Views\n(v_public_barangay_status, v_public_water_index)"]
        AUDIT["Append-Only Audit Log\n(Immutable Triggers, Non-Destructive State)"]
    end

    PWA --> CF
    PORTAL --> CF
    CF --> TURN
    TURN --> EDGE_MW
    EDGE_MW --> RSC
    EDGE_MW --> ACT
    EDGE_MW --> API

    ACT --> ZOD
    API --> ZOD
    ZOD --> PEPPER
    API --> SMS_GW
    CRON --> API

    ZOD --> RLS
    RSC --> VIEWS
    RLS --> POSTGIS
    RLS --> AUDIT
    VIEWS --> POSTGIS
```

---

## 3. Technology Stack & Runtime Specifications

| Layer | Technology | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.4.2` | React Server Components (RSC), Turbopack compilation, edge middleware, streaming SSR. |
| **UI Library** | React | `19.3.0` | Concurrent rendering, Server Actions, deterministic component tree. |
| **Type System** | TypeScript (Strict) | `^5.0` | 100% strict type safety across database schemas, APIs, and client views. |
| **Styling** | Tailwind CSS | `^4.0` | High-performance styling, design token consistency, mobile-first responsive utilities. |
| **Component Kit** | shadcn/ui & Radix UI | Latest | Accessible, headless UI primitives compliant with WCAG 2.1 AA. |
| **Database & Auth** | Supabase / PostgreSQL | `15+` | Managed relational data store, PostGIS 3.3+, Row-Level Security, Auth JWT, `pg_cron`. |
| **Spatial Engine** | PostGIS | `3.3+` | Geometry storage (EPSG:4326), spatial indexing (`GIST`), `ST_DWithin` spatiotemporal grouping. |
| **Mapping Engine** | MapLibre GL JS | `^6.15.0` | Vector tile rendering, interactive GeoJSON polygon and marker overlays without proprietary lock-in. |
| **Data Viz** | Recharts | `^3.10.1` | Declarative SVG charting for pressure timelines and Promised vs. Delivered historical ratios. |
| **Schema Validation**| Zod | `^4.6.7` | Runtime type validation at all API routes and Server Action ingress points. |
| **Anti-Bot / Captcha**| Cloudflare Turnstile | v1 | Privacy-preserving bot challenge preventing report flooding. |

---

## 4. Complete Database Blueprint

The database layer is partitioned across 9 sequential, declarative migration modules. Each module enforces strict referential integrity, foreign key constraints, and spatial indexes.

```
supabase/
├── config.toml
├── seed.sql
├── migrations/
│   ├── 0001_extensions.sql
│   ├── 0002_geography.sql
│   ├── 0003_identity.sql
│   ├── 0004_monitoring_supply.sql
│   ├── 0005_methodology_index.sql
│   ├── 0006_reports.sql
│   ├── 0007_relief_alerts.sql
│   ├── 0008_governance_audit.sql
│   └── 0009_views_and_rls.sql
└── tests/
    └── rls_and_views.sql
```

### 4.1 Migration Breakdown

#### `0001_extensions.sql`
Enables core database extensions:
* `uuid-ossp`: Generation of RFC 4122 compliant UUIDs.
* `postgis`: Geospatial objects, spherical distance calculation, spatial indexes.
* `pgcrypto`: Cryptographic hashing for device keys, tokens, and audit verification.
* `pg_stat_statements`: Query execution monitoring and performance auditing.

#### `0002_geography.sql`
Stores physical spatial boundaries and structural mapping:
* `dmas`: District Metered Areas across Iloilo City (code, name, description, boundary `geometry(MultiPolygon, 4326)`).
* `barangays`: Official 180 barangays of Iloilo City (code, name, district, centroid `geometry(Point, 4326)`, boundary `geometry(MultiPolygon, 4326)`).
* `dma_barangay_mapping`: Many-to-many association mapping barangays to hydraulic DMAs with overlap percentages.

#### `0003_identity.sql`
Defines role-based access control and user identity:
* `app_role` (ENUM): `'anon'`, `'resident'`, `'barangay_official'`, `'lgu_dispatcher'`, `'utility_operator'`, `'admin'`, `'auditor'`.
* `user_profiles`: Extends `auth.users` with `role`, `first_name`, `last_name`, `mobile_number`, `assigned_barangay_id`, `is_active`, and audit timestamps.
* `app_role()`: `SECURITY DEFINER` function extracting the authenticated user's active role from `user_profiles` bypassing client-side JWT tampering.

#### `0004_monitoring_supply.sql`
Records planned and verified water supply parameters:
* `water_schedules`: Published rotational schedules (dma_id, window_start, window_end, published_by, published_at, superseded_at, superseded_by_id, notes).
* `pressure_readings`: Hydraulic telemetry and field gauge measurements (dma_id, barangay_id, pressure_psi, reading_source, is_simulated, recorded_at, logged_by).
* `supply_advisories`: Emergency and planned interruption notices (title, severity, affected_dmas, affected_barangays, valid_from, valid_to, is_active).

#### `0005_methodology_index.sql`
Persists the quantitative weekly benchmarking outputs:
* `methodology_parameters`: Versioned operational parameters (e.g., minimum pressure threshold = 7.0 PSI, minimum data coverage floor = 0.70, active version flag).
* `weekly_delivery_indices`: Stores calculated indices per DMA and Barangay for each evaluation window (evaluation_start, evaluation_end, promised_hours, delivered_hours, coverage_ratio, delivery_index_score, status_tier, calculated_at).

#### `0006_reports.sql`
Crowdsourced citizen grievance and telemetry ingestion:
* `report_clusters`: Spatiotemporally aggregated report groups (cluster_center `geometry(Point, 4326)`, barangay_id, category, first_reported_at, last_reported_at, report_count, status).
* `water_reports`: Individual incident records (ticket_token, cluster_id, barangay_id, category `['dry_tap', 'low_pressure', 'dirty_water', 'pipe_burst']`, description, landmark, device_hash, contact_number_encrypted, consent_at, status `['submitted', 'verified', 'triaged', 'dispatched', 'resolved', 'rejected']`, verified_by, verified_at).

#### `0007_relief_alerts.sql`
Emergency water distribution and citizen notification tracking:
* `relief_requests`: Barangay-level or cluster-level emergency water assistance requests.
* `relief_dispatches`: Tanker rationing lifecycle records (dispatch_id, request_id, tanker_plate_number, driver_name, capacity_liters, dispatched_at, arrived_at, completed_at, status `['queued', 'in_transit', 'on_site', 'completed', 'cancelled']`, recipient_acknowledgment).
* `sms_subscriptions`: Citizen opt-in notification subscriptions (mobile_encrypted, barangay_id, is_verified, subscribed_at, unsubscribed_at).

#### `0008_governance_audit.sql`
Immutable compliance and security record:
* `audit_logs`: Append-only system audit log (log_id, actor_id, actor_role, action, target_table, record_id, previous_state, new_state, ip_hash, user_agent, created_at).
* Enforces row-level database triggers blocking any `UPDATE` or `DELETE` commands on `audit_logs`.

#### `0009_views_and_rls.sql`
Public data projections and security policies:
* Materialized / Security-Barrier Views:
  * `v_public_barangay_status`: Real-time aggregated supply state, active advisories, open cluster counts (zero PII, zero exact coordinates).
  * `v_public_water_index`: Publicly accessible historical weekly delivery index ratings.
  * `v_active_advisories`: Unrestricted live list of currently active emergency announcements.
* Comprehensive RLS policy matrix enforcing multi-tenant isolation.

---

## 5. Multi-Tier RBAC Architecture

OWTA enforces a 7-tier Role-Based Access Control (RBAC) hierarchy. All access control decisions are enforced at the database kernel via PostgreSQL Row-Level Security (RLS) driven by the trusted function `auth.app_role()`.

| Role Identifier | Description & Persona | Permissions & Scope Boundaries |
| :--- | :--- | :--- |
| **`anon`** | Unauthenticated public citizen or visitor. | **Read-Only:** Public views (`v_public_*`), GeoJSON polygons, active advisories, published schedules.<br>**Write:** Can submit water reports via `/report` guarded by Turnstile CAPTCHA and rate limits. Zero access to raw tables or PII. |
| **`resident`** | Authenticated citizen (via OTP/Magic Link). | Inherits all `anon` privileges.<br>**Read:** View history and progress of own submitted tickets.<br>**Write:** Manage own SMS notification subscriptions and contact preferences. |
| **`barangay_official`** | Barangay Chairman, Kagawad, or designated Water Focal Person. | **RLS Boundary:** Strictly restricted to records where `barangay_id = user_profiles.assigned_barangay_id`.<br>**Read:** View full details of reports and clusters within their barangay.<br>**Write:** Triage, verify, reject, or escalate reports; endorse emergency relief requests to LGU. |
| **`lgu_dispatcher`** | CDRRMO, City Mayor's Office, or City Engineering Logistics. | **Cross-Barangay Operational Scope:**<br>**Read:** Citywide relief queues, active clusters, verified dry tap reports, fleet availability.<br>**Write:** Prioritize relief queues (48h dry zones), create tanker dispatches, update dispatch lifecycle, record delivery fulfillment. |
| **`utility_operator`** | Authorized Metro Pacific Iloilo Water (MPIW) operational staff. | **Hydraulic Operational Scope:**<br>**Read:** Historical and current telemetry, DMA schedule adherence.<br>**Write:** Publish and supersede rotational schedules (`water_schedules`), log pressure readings (`pressure_readings`), broadcast emergency advisories. |
| **`admin`** | Designated City Information Technology / System Administrator. | **System Administration:**<br>**Read/Write:** User provisioning, role assignment, system parameter tuning, maintenance tasks. Explicitly blocked from modifying immutable audit rows. |
| **`auditor`** | Independent third-party oversight (CSOs, Academe, COA, City Council). | **Independent Oversight Scope:**<br>**Read-Only:** Full unredacted access to `audit_logs`, methodology calculations, raw pressure readings, and dispatch timelines. Zero write permissions. |

---

## 6. Regulatory & Industry Compliance Matrices

### 6.1 ISO/IEC 25010 Software Quality Compliance

| Quality Characteristic | OWTA Architectural Implementation | Verification Metric |
| :--- | :--- | :--- |
| **Functional Suitability** | 100% test coverage over 12 Business Integrity Rules (`WR01`–`WR12`) and functional catalogs. | Continuous integration test suite (`tests/rls_and_views.sql`). |
| **Performance Efficiency** | Server Components with edge caching; GeoJSON payloads compressed; response times <300ms. | Lighthouse Performance Score $\ge 90$; Edge TTFB <150ms. |
| **Compatibility** | Standard Web APIs; responsive layout functional across desktop, tablet, and low-end mobile. | Mobile viewport testing down to 320px width; MapLibre WebGL fallback. |
| **Usability** | Plain language status indicators ("Normal", "Degraded", "Critical Dry"); offline stale banners. | Heuristic usability evaluation and ISO 9241-11 compliance. |
| **Reliability** | Redundant edge routing; graceful degradation to cached status views during DB maintenance. | Zero uncaught runtime exceptions; automated health probe (`/api/health`). |
| **Security** | RLS on every table; parameterized queries; Turnstile anti-bot; immutable audit triggers. | 0 critical/high findings on automated security audits and SAST scans. |
| **Maintainability** | Strict modular migrations (`0001`–`0009`); explicit TypeScript types; documented interfaces. | Strict TypeScript compilation (`noEmit`) without errors. |

### 6.2 ISO/IEC 27001 & RA 10173 Security & Privacy Control Matrix

| Standard Reference | Security Control Domain | OWTA Technical Safeguard |
| :--- | :--- | :--- |
| **RA 10173 Sec. 11** | General Data Privacy Principles | Privacy by Design: Anonymous reporting by default; no citizen accounts required for reporting. |
| **RA 10173 Sec. 12** | Lawful Processing of Personal Data | Explicit consent timestamp (`consent_at`) required for mobile phone storage; opt-out honored instantly. |
| **RA 10173 Sec. 20** | Security of Personal Data | Contact numbers encrypted with pgcrypto / AES-256; device fingerprints salted with secret pepper. |
| **RA 10173 Sec. 21** | Principle of Retention & Disposal | Automated nightly `pg_cron` worker executes `purge_expired_pii()` on resolved reports > 30 days. |
| **ISO 27001 A.9.4** | System and Application Access Control | Multi-tier RBAC enforced via PostgreSQL RLS with `auth.app_role()` security definer function. |
| **ISO 27001 A.12.4**| Logging and Monitoring | Immutable `audit_logs` table with DB triggers preventing deletion or modification by any role. |
| **ISO 27001 A.13.1**| Network Security Management | Strict Content Security Policy (CSP), TLS 1.3 enforced, HSTS headers, secure cookie attributes. |

