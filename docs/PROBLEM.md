# OWTA: Problem Statement & MVP Boundary Specification
## Operational Analysis & Scoping Framework

**Document Code:** OWTA-PROB-V1  
**Status:** Approved for Core Build  
**Focus Area:** Iloilo City Urban Water Distribution (MPIW / MIWD Concession)

---

## 1. The Core Problem: Systemic Information Asymmetry

Iloilo City is experiencing rapid economic and urban development, yet municipal potable water distribution remains severely supply-constrained. Metro Pacific Iloilo Water (MPIW) operates a rotational water supply scheme across more than 30 District Metered Areas (DMAs). Due to seasonal raw water deficits from surface water intakes (e.g., Jalaur and Tigum rivers), pipeline friction losses, high Non-Revenue Water (NRW) rates, and frequent pipe bursts, actual water availability diverges drastically from published rotational expectations.

This structural deficit generates four compounding civic breakdowns:

```
+---------------------------------------------------------------------------------------------+
|                                1. OPAQUE ROTATIONAL SCHEDULES                               |
| Schedules published as static images on social media; unsearchable, frequently changed      |
| without real-time notices, leaving households stranded without storage preparation.         |
+---------------------------------------------------------------------------------------------+
                                              │
                                              ▼
+---------------------------------------------------------------------------------------------+
|                               2. FRAGMENTED CITIZEN REPORTING                               |
| Citizen outages reported via fragmented hotlines, radio talk shows, and Facebook comments.  |
| No centralized deduplication, geospatial clustering, or transparent ticket lifecycle.       |
+---------------------------------------------------------------------------------------------+
                                              │
                                              ▼
+---------------------------------------------------------------------------------------------+
|                            3. MISALLOCATED EMERGENCY LGU RELIEF                             |
| City CDRRMO & BFP water relief tankers dispatched based on political noise and loudest      |
| complaints rather than verified, continuous dry-zone severity duration.                     |
+---------------------------------------------------------------------------------------------+
                                              │
                                              ▼
+---------------------------------------------------------------------------------------------+
|                          4. ZERO AUDITABLE PERFORMANCE RECORD                               |
| No empirical, immutable record of promised vs. delivered supply. Endless finger-pointing    |
| between consumers, LGU officials, and private utility operators.                            |
+---------------------------------------------------------------------------------------------+
```

---

## 2. Stress-Tested Operational Scenarios

To ensure technical resilience, the OWTA architecture has been stress-tested against the harshest realities of Iloilo City municipal operations:

### 2.1 The "Ghost Water" Air Pressure Phenomenon
* **Condition:** Following an empty pipe period, when the utility re-pressurizes the main, trapped air rushes through consumer pipes before water arrives. Mechanical water meters spin rapidly on air flow, registering consumption charges while taps blow dry air.
* **OWTA Defense:** Citizen reporting distinguishes between `dry_tap` (total absence of flow/air) and `air_only` / `low_pressure`. Field pressure readings require continuous positive gauge pressure $\ge 7.0 \text{ PSI}$ held across 15-minute epochs to credit delivered supply, preventing air bursts from registering as delivered water.

### 2.2 Upland Turbidity Shutdowns (Maasin Dam / River Intakes)
* **Condition:** Heavy monsoonal rains in the upland mountains trigger extreme turbidity spikes at raw water treatment facilities, forcing immediate emergency plant shutdowns. Rotational schedules collapse citywide within 30 minutes.
* **OWTA Defense:** Schedule Superseding Protocol (`WR01`, `WR02`). Utility operators can issue emergency superseding schedules with a single transaction. Active advisories are broadcast immediately via the banner ticker and SMS webhooks, while the Delivery Index algorithm automatically captures the event as an operational outage rather than a silent failure.

### 2.3 Malicious Sybil Attacks & Political Disinformation
* **Condition:** During local election seasons or tariff rate hike hearings, interest groups may orchestrate bot farms or organized calling circles to flood the portal with fake outage reports to artificially depress a barangay's metrics or divert water tankers.
* **OWTA Defense:** Multi-layer anti-sybil architecture:
  1. Cloudflare Turnstile cryptographic bot challenge on submission.
  2. Device fingerprinting salted with server secret `DEVICE_KEY_PEPPER` enforcing a 3-report per 60-minute rate limit (`WR04`).
  3. PostGIS spatiotemporal deduplication (`WR05`) collapsing reports within 200m and 3 hours into a single cluster.
  4. Mandatory human-in-the-loop verification by assigned Barangay Officials (`WR06`) before relief queue escalation.
  5. Complete exclusion of simulated or unverified reports from public indices (`WR12`).

### 2.4 Severe Weather & Cellular Congestion
* **Condition:** Typhoon landfall knocks out localized power and slows cellular connectivity to sub-3G speeds with high packet loss.
* **OWTA Defense:** Next.js Server Components with static shell pre-rendering; aggressive client caching via Service Workers; lightweight GeoJSON vector tiles; prominent Stale Data Banner indicating "As-of" timestamp if disconnected $>15$ minutes (`FR-APP-01`, `FR-PUB-06`).

---

## 3. Strict MVP Boundary (Phase 1 vs. Future Phases)

To guarantee delivery of a battle-tested, audit-ready system for academic defense and production rollout, OWTA establishes a strict, non-negotiable scope boundary.

```mermaid
flowchart LR
    subgraph MVP: Phase 1 Scope (Shipped)
        A1["DMA Rotational Schedules & Superseding"]
        A2["Citizen Outage Reporting (Turnstile + Anti-Sybil)"]
        A3["Spatiotemporal Clustering (200m / 3hr)"]
        A4["Barangay Official Triage Portal (RLS Scoped)"]
        A5["LGU Relief Priority Matrix (48h Dry Floor)"]
        A6["Closed-Loop Dispatch Tracking"]
        A7["Weekly Delivery Index Math & Dashboard"]
        A8["Append-Only Audit Trail"]
    end

    subgraph Phase 2 & 3: Deferred Parking Lot
        B1["Hardware IoT Pressure Sensors"]
        B2["Live Tanker GPS Fleet Telematics"]
        B3["Telegram / Viber Bot Channels"]
        B4["EPANET Hydraulic Network Sim"]
        B5["Utility Billing Dispute Interface"]
    end
```

### 3.1 Phase 1 (MVP) Inclusions
1. **Public Discovery Portal:**
   * Barangay-level current status board with real-time indicators.
   * Searchable DMA rotational schedule viewer with countdown timers.
   * Interactive MapLibre GL map showing barangays and public incident clusters.
   * Public Weekly Delivery Index scoreboard.
2. **Citizen Incident Ingestion:**
   * Rapid, low-friction reporting form ($<45$ seconds).
   * Anonymous alphanumeric ticket tracking tokens.
   * Turnstile CAPTCHA and salted device rate limiting.
   * PostGIS automated spatial clustering.
3. **Barangay Triage Desk:**
   * Dedicated authenticated portal scoped by PostgreSQL RLS.
   * Incident verification, rejection, and escalation controls.
   * Emergency relief tanker endorsement.
4. **LGU CDRRMO Dispatch Desk:**
   * Prioritized relief matrix based on 48-hour continuous dry criteria (`WR10`).
   * Tanker dispatch order creation and milestone state management.
   * Closed-loop verification with delivery sign-off (`WR11`).
5. **Utility Desk & Governance:**
   * Schedule publishing and immutable superseding (`WR01`, `WR02`).
   * Manual and field gauge pressure logging (`WR03`).
   * Automated weekly Delivery Index computation engine (`C \ge 70\%` floor).
   * Append-only system audit log (`WR08`).

### 3.2 Explicitly Deferred Capabilities (Phase 2 / Phase 3)
* **Automated IoT Sensor Telemetry (`FR-SCH-07`):** Deferred due to high procurement, cellular SIM maintenance, and sensor calibration overhead. Phase 1 relies on calibrated manual gauge inputs from certified utility technicians and barangay officials.
* **Live Tanker GPS OBD-II Telematics (`FR-REL-03`):** Real-time GPS pings require custom vehicle hardware. Phase 1 manages dispatches via clean, auditable milestone state transitions (`Queued` $\rightarrow$ `In Transit` $\rightarrow$ `On Site` $\rightarrow$ `Completed`).
* **Viber & Telegram Bot Webhooks (`FR-ALR-05`):** PWA web push and standard transactional SMS satisfy 100% of the citizen notification requirements without multi-platform SDK maintenance.
* **Hydraulic Pipe Geometry & Flow Modeling:** Proprietary GIS pipe layers are held confidentially by the utility. The platform operates on public administrative barangay boundaries and DMA polygons.
* **Billing Dispute Adjudication:** Outside civic transparency boundaries; strictly governed by the National Water Resources Board (NWRB) regulatory framework.

