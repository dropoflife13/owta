# OWTA: Deferred Capabilities & Future Roadmap
## Phase 3 Architecture Parking Lot & Scope Restrictions

**Document Code:** OWTA-LATER-V1  
**Classification:** Scope Boundary Control  
**Status:** Frozen for Phase 1 (MVP)  
**Governance:** Academic Defense & MVP Delivery Committee

---

## 1. Scope Boundary Philosophy

To achieve an audit-ready, secure, and production-tested system within the designated engineering timeline, strict boundaries have been drawn around the **Iloilo Water Transparency Tracker (OWTA)**. 

Every feature listed in this document has been deliberately evaluated, architecturally scoped, and **explicitly deferred** to Phase 2 or Phase 3. Attempting to implement these items during Phase 1 introduces unacceptable hardware dependencies, operational friction, regulatory hurdles, or scope creep that would compromise the core mission of transparent municipal water accounting.

---

## 2. Explicitly Deferred Capabilities Catalog

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3 PARKING LOT CATALOG                              │
├────────────────────────────┬─────────────────────────┬───────────────────────────┤
│ Catalog Code               │ Feature Title           │ Primary Deferral Reason   │
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-SCH-07                  │ Hardware IoT Telemetry  │ Hardware procurement,     │
│                            │                         │ battery & SIM maintenance │
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-REL-03                  │ Live Tanker GPS Track   │ Fleet OBD-II hardware,    │
│                            │                         │ driver device compliance  │
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-ALR-05                  │ Viber / Telegram Bots   │ Multi-platform webhook &  │
│                            │                         │ bot state machine overhead│
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-GEO-02                  │ Pipe Network Hydraulics │ Proprietary utility GIS,  │
│                            │ (EPANET Digital Twin)   │ complex hydraulic math    │
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-REG-01                  │ In-App Billing Disputes │ NWRB statutory regulatory │
│                            │                         │ legal jurisdiction        │
├────────────────────────────┼─────────────────────────┼───────────────────────────┤
│ FR-LAB-01                  │ Water Quality Lab Certs │ DOH laboratory chain of   │
│                            │                         │ custody certification     │
└────────────────────────────┴─────────────────────────┴───────────────────────────┘
```

---

### 2.1 Hardware Sensor Telemetry (`FR-SCH-07`)
* **Feature Concept:** Deploying automated cellular/LoRaWAN physical pressure transducers into fire hydrants, district meters, and distribution mains across Iloilo City for second-by-second telemetry streaming.
* **Architectural Rationale for Deferral:**
  1. *Hardware Procurement & Capital Expense:* Deploying certified, vandal-resistant, IP68-rated pressure sensors across 30+ DMAs requires municipal capital outlays and utility physical permits that exceed software development timelines.
  2. *Maintenance & Sensor Drift:* Field sensors in tropical, corrosive environments require periodic recalibration and battery replacements; sensor drift can introduce false pressure data.
* **Phase 1 Solution:** Calibrated manual gauge tests performed by certified utility operators and roving barangay focal persons satisfy the weekly Delivery Index requirements under strict boundary verification (`WR03`).
* **Phase 3 Path:** Expose a secure, authenticated REST endpoint (`POST /api/telemetry/iot`) accepting signed JSON payloads from approved LoRaWAN gateways.

---

### 2.2 Live Water Tanker GPS Tracking (`FR-REL-03`)
* **Feature Concept:** Embedding real-time OBD-II or dedicated GPS vehicle tracking units on all CDRRMO and BFP water relief tankers to render live moving vehicle icons on the public citizen map.
* **Architectural Rationale for Deferral:**
  1. *Driver Compliance & Hardware Dependency:* Municipal water relief operations often utilize contracted third-party private water lorries that do not possess standardized GPS telematics hardware.
  2. *Operational Friction & Battery Drain:* Demanding that drivers keep dedicated mobile tracking apps running in the foreground leads to device battery exhaustion and communication dropouts.
  3. *Security Concerns:* Broadcasting exact real-time coordinates of water tankers in water-starved areas can lead to vehicle mobbing or unscheduled route diversions before reaching the designated priority barangay.
* **Phase 1 Solution:** Milestone state management (`QUEUED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `ON_SITE` $\rightarrow$ `COMPLETED`) with closed-loop verification (`WR11`).
* **Phase 3 Path:** Integrate with the City's centralized CDRRMO fleet management GPS API using periodic (60-second) batched coordinate updates.

---

### 2.3 Viber & Telegram Bot Integrations (`FR-ALR-05`)
* **Feature Concept:** Developing interactive conversational chatbots on Viber and Telegram allowing citizens to query schedules and submit reports via chat dialogs.
* **Architectural Rationale for Deferral:**
  1. *Maintenance Overhead:* Maintaining separate bot SDKs, conversation trees, and webhook handlers across multiple closed proprietary platforms multiplies attack surfaces and ongoing maintenance costs.
  2. *Digital Divide:* In rural and lower-income barangays, standard SMS and zero-rated web browsers are universally accessible, whereas Viber and Telegram require high-bandwidth data packages and specific app installations.
* **Phase 1 Solution:** Next.js Progressive Web App (PWA) with installable home-screen shortcuts and carrier-neutral transactional SMS alerts via PhilSMS / Semaphore.
* **Phase 3 Path:** Implement a unified omnichannel webhook layer leveraging a headless bot framework.

---

### 2.4 PostGIS Pipe Network Hydraulics & EPANET Digital Twin (`FR-GEO-02`)
* **Feature Concept:** Ingesting the utility's complete, detailed subterranean pipe geometry layers (pipe diameter, material, valve positions) and running online hydraulic network flow equations (Hazen-Williams / EPANET).
* **Architectural Rationale for Deferral:**
  1. *Proprietary Classification:* Water distribution piping layouts, valve node schematics, and critical infrastructure blueprints are proprietary security assets of MPIW / MIWD and protected from public disclosure.
  2. *Computational Overhead:* Solving nonlinear hydraulic equations for thousands of pipe nodes exceeds web server edge compute capabilities.
* **Phase 1 Solution:** Geospatial modeling bounded cleanly to District Metered Area (DMA) polygons and administrative Barangay boundaries (`0002_geography.sql`).
* **Phase 3 Path:** Periodic offline batch ingestion of anonymized hydraulic capacity models rendered as read-only heatmaps.

---

### 2.5 In-App Billing Disputes & Tariff Adjudication (`FR-REG-01`)
* **Feature Concept:** Allowing consumers to upload monthly water bills, dispute water meter charges, and initiate legal mediation over billing during low-pressure periods.
* **Architectural Rationale for Deferral:**
  * Tariff regulation, billing audits, and consumer rebate adjudications are statutory powers legally reserved for the **National Water Resources Board (NWRB)** and the **Local Water Utilities Administration (LWUA)**. Incorporating billing disputes compromises OWTA's neutral role as an objective operational telemetry platform.
* **Phase 1 Boundary:** Strictly out of scope. Consumers are directed to standard official utility customer care desks.

---

### 2.6 Laboratory Water Quality Certifications (`FR-LAB-01`)
* **Feature Concept:** Direct integration with Department of Health (DOH) accredited microbiological testing laboratories for chain-of-custody tracking of chemical and coliform test samples.
* **Architectural Rationale for Deferral:**
  * Chemical and biological potability testing requires physical chain-of-custody documentation, cold-chain preservation, and statutory laboratory signatures. 
* **Phase 1 Boundary:** The system accepts qualitative citizen observational alerts (`dirty_water`, `turbid`, `foul_odor`), which immediately notify barangay health workers, but does not certify potability.

