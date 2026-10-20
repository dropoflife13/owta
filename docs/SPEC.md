# OWTA: Functional & Business Rules Specification
## Document Code: OWTA-SPEC-V1

**Version:** 1.0.0  
**Classification:** Core Functional Specification  
**Status:** Approved / Enforced  
**Target Audience:** Engineering, Quality Assurance, System Auditors, Technical Panel

---

## 1. System Boundary Definition

The **Iloilo Water Transparency Tracker (OWTA)** is strictly bounded to the monitoring, verification, and relief coordination of municipal water supply across the 180 barangays of Iloilo City served by Metro Pacific Iloilo Water (MPIW) and the Metro Iloilo Water District (MIWD).

### 1.1 In-Scope System Capabilities
* Ingestion, versioning, and public publication of rotational water supply schedules per District Metered Area (DMA).
* Crowdsourced reporting of tap pressure, outages, and quality anomalies with automated anti-sybil and spatiotemporal clustering.
* Role-based triage and verification of incident reports by authorized barangay officials.
* Prioritization and dispatch tracking of LGU emergency relief water tankers (CDRRMO).
* Ingestion of verified field pressure readings from manual testing and utility loggers.
* Mathematical computation and public display of the weekly Water Delivery Index.
* Automated SMS alerts for schedule updates and emergency advisories.
* Immutable, append-only security auditing of all operational decisions and state changes.

### 1.2 Out-of-Scope System Boundaries
* Real-time automated SCADA control of utility pumps, pressure reducing valves (PRVs), or motorized valves.
* Direct processing of individual water utility billings, payments, or tariff disputes.
* Ingestion of unvalidated, private household smart-meter telemetry.
* Live continuous GPS tracking of relief tankers (handled via milestone status transitions).
* Hydraulic physics modeling (e.g., EPANET network flow simulation).

---

## 2. Business Integrity Rules (`WR01` – `WR12`)

Every transaction, API call, and database mutation within OWTA must satisfy these 12 immutable rules. Violations result in transaction rollbacks and security audit logging.

### `WR01`: Non-Overlapping Published DMA Schedules
* **Rule Statement:** For any given DMA, no two active published schedule windows may have overlapping operational time slots within the same calendar day.
* **Enforcement:** Enforced at the database level via PostgreSQL exclusion constraint (`btree` and `gist` over `tsrange`) and API pre-validation.
* **Remediation:** If an operational adjustment is required during an active window, the existing schedule must be formally superseded using `WR02`.

### `WR02`: Schedule Superseding Immutability
* **Rule Statement:** Once a rotational schedule is published to the public portal, it cannot be edited in-place (`UPDATE`) or deleted (`DELETE`).
* **Enforcement:** Modifying a published schedule requires generating a new schedule record with `superseded_by_id` referencing the replacement record, setting `superseded_at = NOW()`, and recording the authenticated operator's justification.
* **Audit Impact:** Full preservation of the historical promised supply timeline for index calculations.

### `WR03`: Pressure Reading Boundary Validation
* **Rule Statement:** Gauge pressure readings must fall within the physically plausible distribution limits of the Iloilo City water network ($0.0 \text{ PSI} \le P \le 25.0 \text{ PSI}$).
* **Enforcement:** Enforced via database `CHECK (pressure_psi >= 0.0 AND pressure_psi <= 25.0)` and Zod schema validation. Readings outside this range are rejected with HTTP 422 (Unprocessable Entity).

### `WR04`: Report Rate Limiting & Anti-Sybil Protection
* **Rule Statement:** A single client device fingerprint or IP address is restricted to a maximum of three (3) report submissions per rolling 60-minute window.
* **Enforcement:** Next.js Edge Middleware and Route Handlers compute a salted hash using the server-side secret `DEVICE_KEY_PEPPER` combined with client characteristics. Every submission must pass Cloudflare Turnstile CAPTCHA verification before writing to the database.

### `WR05`: Spatiotemporal Duplicate Report Grouping
* **Rule Statement:** When a valid report is submitted, the system checks for existing open reports of the same category (`dry_tap`, `low_pressure`, etc.) within a 200-meter radius (PostGIS `ST_DWithin`) and a 3-hour sliding time window.
* **Enforcement:** If a matching cluster is found, the new report is assigned to that `report_cluster`, incrementing `report_count` and updating `last_reported_at` without cluttering the public status map with duplicate pins.

### `WR06`: Barangay Official RLS Boundary Enforcement
* **Rule Statement:** A user authenticated with the `barangay_official` role is strictly restricted to viewing, triaging, verifying, and escalating reports belonging to their explicitly assigned barangay (`assigned_barangay_id`).
* **Enforcement:** Postgres Row-Level Security policy: `USING (barangay_id = (SELECT assigned_barangay_id FROM user_profiles WHERE id = auth.uid()))`. Cross-barangay reads of sensitive data or status mutations return zero rows or throw permission errors.

### `WR07`: Zero Public Exposure of Precise Coordinates and PII
* **Rule Statement:** Public-facing endpoints, GeoJSON vector layers, and map views must never expose raw GPS coordinates, citizen names, or contact numbers.
* **Enforcement:** Public APIs consume only the materialized view `v_public_barangay_status` or cluster centroids snapped to a randomized 100-meter grid or barangay centroid. Citizen phone numbers are strictly scrubbed from public serialization.

### `WR08`: Append-Only Audit Trail
* **Rule Statement:** The system audit log (`audit_logs`) is strictly append-only. No role, including `admin` or database superuser, may execute `UPDATE` or `DELETE` statements on this table.
* **Enforcement:** A PostgreSQL trigger (`BEFORE UPDATE OR DELETE ON audit_logs`) immediately raises an exception. All state transitions in schedules, reports, dispatches, and index calculations produce an immutable audit row.

### `WR09`: Explicit Opt-In Consent for Contact Retention
* **Rule Statement:** Citizen phone numbers provided during report submission or SMS subscription can only be persisted if explicit affirmative consent is provided (`consent_at IS NOT NULL`).
* **Enforcement:** Without checked consent, the phone number field is either discarded or one-way hashed with `DEVICE_KEY_PEPPER` strictly for deduplication, compliant with RA 10173.

### `WR10`: 48-Hour Continuous Dry Zone Relief Priority
* **Rule Statement:** Any barangay or cluster with zero delivered water moments or verified dry tap status persisting for forty-eight (48) consecutive hours or longer is automatically elevated to "CRITICAL_RELIEF" priority in the LGU dispatch queue.
* **Enforcement:** Calculated dynamically via view `v_relief_priority_queue` based on the difference between `NOW()` and `first_reported_at` of verified dry tap clusters.

### `WR11`: Closed-Loop Dispatch Verification
* **Rule Statement:** An LGU water relief tanker dispatch cannot transition to `COMPLETED` status without verified recipient acknowledgment.
* **Enforcement:** Completion requires either a digital signature or verification OTP from the receiving Barangay Official, or photographic proof of delivery logged by the driver/dispatcher.

### `WR12`: Exclusion of Simulated Test Data from Official Methodology
* **Rule Statement:** Any telemetry or pressure reading marked with `is_simulated = TRUE` is strictly excluded from all calculations for the weekly Water Delivery Index and public status aggregates.
* **Enforcement:** Enforced in SQL calculation functions: `WHERE is_simulated IS FALSE`. Simulated test runs (for QA and load testing) cannot contaminate the historical public audit trail.

---

## 3. Complete Functional Requirements Catalog

### 3.1 Public Discovery & Tracking (`FR-PUB`)

* **`FR-PUB-01`: Real-Time Barangay Status Board**
  * The system shall display the current water supply state for all 180 barangays (Status: `Normal Supply`, `Scheduled Window`, `Low Pressure`, `Critical Dry`, `Under Maintenance`).
  * Response time shall be $<300\text{ms}$ at the edge.
* **`FR-PUB-02`: DMA Schedule Lookup**
  * The system shall allow citizens to search their barangay or DMA code to view active rotational supply hours, countdown to next scheduled window, and superseded schedule history.
* **`FR-PUB-03`: Interactive Supply & Incident Map**
  * The system shall render an interactive MapLibre GL map displaying color-coded barangay polygons and aggregated incident cluster markers.
* **`FR-PUB-04`: Emergency Supply Advisory Feed**
  * The system shall display an active advisory ticker highlighting emergency pipeline repairs, turbidity shutdowns, and scheduled maintenance windows.
* **`FR-PUB-05`: Public Delivery Index Portal**
  * The system shall publish weekly Delivery Index scores per DMA with interactive historical charts comparing promised vs. delivered hours.
* **`FR-PUB-06`: Stale Data Indicator**
  * If the client device is offline or data has not synced for $>15$ minutes, the UI shall render a prominent warning banner indicating the exact "As-of" timestamp.

### 3.2 Citizen Engagement (`FR-CIT`)

* **`FR-CIT-01`: Low-Friction Incident Reporting**
  * The system shall allow citizens to submit outage and pressure reports (`dry_tap`, `low_pressure`, `dirty_water`, `pipe_burst`) with optional landmark descriptions in $<45$ seconds.
* **`FR-CIT-02`: Anonymous Ticket Tracking**
  * Upon submission, the system shall generate a secure alphanumeric ticket token (e.g., `OWTA-7X9K2`) allowing citizens to check report triage status without creating an account.
* **`FR-CIT-03`: SMS Notification Opt-In**
  * Citizens may optionally provide their Philippine mobile number (`+639XXXXXXXXX`) and explicit consent to receive SMS notifications for schedule updates and resolution alerts.
* **`FR-CIT-04`: Ticket Resolution Feedback**
  * When a ticket is marked resolved, subscribed citizens shall receive an automated SMS notification inviting them to confirm if water service has been restored.

### 3.3 Barangay Portal (`FR-BRG`)

* **`FR-BRG-01`: Localized Incident Dashboard**
  * Authenticated barangay officials shall access a dashboard filtered strictly to incidents, clusters, and supply status within their assigned barangay (`WR06`).
* **`FR-BRG-02`: Incident Triage & Verification**
  * Officials shall have the capability to inspect citizen report clusters, conduct physical field checks, and update cluster status to `VERIFIED`, `REJECTED`, or `TRIAGED`.
* **`FR-BRG-03`: Emergency Relief Endorsement**
  * Barangay officials shall be able to submit formal emergency water tanker assistance requests directly to the LGU CDRRMO dispatch queue with one click.
* **`FR-BRG-04`: Delivery Acknowledgment**
  * Officials shall be authorized to sign or confirm the arrival and distribution of emergency water tankers to fulfill the closed-loop verification requirement (`WR11`).

### 3.4 LGU Relief Dispatch (`FR-LGU`)

* **`FR-LGU-01`: Citywide Relief Priority Queue**
  * LGU dispatchers shall view a prioritized list of barangays in need of water rationing, automatically ordered by consecutive dry hours (`WR10`) and vulnerability score.
* **`FR-LGU-02`: Tanker Fleet Management**
  * Dispatchers shall manage the availability, capacity (in liters), and deployment status of City-owned and contracted water relief tankers.
* **`FR-LGU-03`: Dispatch Order Creation**
  * Dispatchers shall generate digital dispatch orders assigning specific tankers to verified barangay clusters.
* **`FR-LGU-04`: Dispatch Lifecycle Management**
  * The system shall track tanker state transitions: `QUEUED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `ON_SITE` $\rightarrow$ `COMPLETED` / `CANCELLED`.
* **`FR-LGU-05`: Historical Relief Reporting**
  * The system shall export auditable reports of total volume distributed, response times, and geographic coverage for City Council and COA compliance.

### 3.5 Utility Operational Desk (`FR-UTL`)

* **`FR-UTL-01`: DMA Rotational Schedule Publishing**
  * Utility operators shall define and publish weekly rotational supply schedules per DMA, specifying start and end timestamps.
* **`FR-UTL-02`: Emergency Schedule Superseding**
  * When unscheduled operational changes occur, operators shall publish superseding schedules with required justification, maintaining the audit trail (`WR01`, `WR02`).
* **`FR-UTL-03`: Field Pressure Telemetry Logging**
  * Operators shall record calibrated field gauge readings and logger telemetry (`pressure_psi`, location, timestamp) with strict boundary validation (`WR03`).
* **`FR-UTL-04`: Advisory Broadcasting**
  * Operators shall draft and publish public advisories detailing affected DMAs, expected duration, and restoration timelines.

### 3.6 System Governance & Administration (`FR-ADM`)

* **`FR-ADM-01`: User Provisioning & RBAC Management**
  * System administrators shall manage user accounts, assign roles (`barangay_official`, `lgu_dispatcher`, `utility_operator`, `auditor`), and link officials to barangays.
* **`FR-ADM-02`: Immutable Audit Log Viewer**
  * Administrators and independent auditors shall inspect the complete, filterable, append-only system audit log (`WR08`).
* **`FR-ADM-03`: Methodology Parameter Configuration**
  * Administrators shall configure versioned thresholds (e.g., minimum pressure cut-off $P_{threshold}$, minimum coverage floor $C_{min}$), triggering automated recalculations where required.

### 3.7 Mobile-First & Offline Readiness (`FR-APP`)

* **`FR-APP-01`: Progressive Web App (PWA) Capabilities**
  * The application shall install cleanly on Android and iOS devices, operate reliably over intermittent 3G/LTE connections, and cache public schedule views for offline reading.

