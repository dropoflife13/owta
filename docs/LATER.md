# OWTA: Deferred Capabilities & Future Roadmap
## Phase 2 (Next) and Phase 3 (Later) Scope Control

**Document Code:** OWTA-LATER-V1  
**Classification:** Scope Boundary Control  
**Status:** Frozen for Phase 1 (MVP)  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`

---

## 1. Scope Boundary Philosophy

To achieve an audit-ready, secure, and production-tested system within the designated engineering timeline, strict boundaries have been drawn around the **Open Water Transparency Architecture (OWTA)**.

- **Phase 1 (MVP - Active Scope):** Public portal, manual operator schedules, manual readings, citizen reports with spatiotemporal deduplication, relief priority queue, published methodology and weekly index, admin user verification, and immutable audit trail.
- **Phase 2 (Next):** Features planned for the immediate post-pilot iteration that require additional third-party contracts (e.g., SMS carrier gateway, object storage).
- **Phase 3 (Later - Not Authorized):** Complex hardware, proprietary GIS, or regulatory features that are strictly out of scope for the software platform.

---

## 2. Phase 2 Capabilities (Next Phase)

These capabilities have data schema definitions ready in `docs/DATA_MODEL.md` (e.g., `subscriptions`, `notifications`, `period_notes`) but are deferred until the core MVP is proven:

| Capability | Scope & Description | Reason for Deferral to Phase 2 |
|---|---|---|
| **SMS Subscriptions & Outbox** | Automated transactional SMS alerts for schedule updates, emergency advisories, and ticket resolution via `subscriptions` and `notifications`. | Requires telecom aggregator account (Semaphore/PhilSMS), delivery budget, and outbox drain worker. |
| **Right-of-Reply Notes** | Utility and LGU attached notes (`period_notes`) on specific DMA weekly delivery index periods (`WR10`). | Operational agreement with utility data stewards to be established during pilot. |
| **Multilingual Localization** | Full UI string externalization in `i18n/` for **Hiligaynon** and **Filipino (Tagalog)**. | Translation validation and copy review with pilot barangay leaders. |
| **Realtime Staff Dashboard** | Supabase Realtime channel subscriptions for live updating of the barangay triage portal and CDRRMO dispatch queue. | MVP uses fast on-demand server revalidation and polling to conserve connection pools. |
| **Incident Photo Upload** | Uploading photographic evidence of pipe bursts or water discoloration to private Supabase Storage buckets with EXIF stripping. | Requires storage bucket provisioning, virus scanning, and signed URL generation. |
| **CSV Schedule Ingestion** | Bulk schedule import via spreadsheet upload for utility operators. | Operators will initially use the direct form entry desk for pilot DMAs. |
| **PWA Offline Caching** | Service worker caching of last-known schedules and offline fallback banner. | Basic responsive web app tested first. |

---

## 3. Phase 3 Capabilities (Explicitly Not Authorized)

These features are out of scope and must **not** be built:

### 3.1 Hardware Sensor Telemetry (`FR-SCH-07`)
- **Concept:** Automated cellular/LoRaWAN physical pressure transducers in fire hydrants and distribution mains.
- **Rationale:** Hardware procurement, IP68 casing, battery replacement, and physical utility valve access permits exceed the software project scope.
- **Phase 1 Approach:** Calibrated manual gauge tests entered by operators or verified volunteers satisfy the weekly Delivery Index requirements (`WR12`).

### 3.2 Live Water Tanker GPS Tracking (`FR-REL-03`)
- **Concept:** Continuous OBD-II vehicle tracking units on all CDRRMO and contracted water lorries.
- **Rationale:** Contracted third-party lorries lack standardized telematics; broadcasting live coordinates in water-starved areas creates vehicle mobbing risks.
- **Phase 1 Approach:** Milestone state transitions (`requested` $\rightarrow$ `dispatched` $\rightarrow$ `delivered` or `cancelled`) with volume logging (`WR11`).

### 3.3 Viber & Telegram Bot Integrations (`FR-ALR-05`)
- **Concept:** Conversational chatbots for querying schedules and submitting reports.
- **Rationale:** Multiplies webhook attack surfaces and maintenance overhead. Standard web browsers and SMS reach 100% of the demographic.
- **Phase 1 Approach:** Mobile-first responsive web app with zero-friction anonymous reporting.

### 3.4 Pipe Network Hydraulics & EPANET Digital Twin (`FR-GEO-02`)
- **Concept:** Ingesting utility pipe geometry (diameter, material, roughness) and running hydraulic flow simulations.
- **Rationale:** Pipe blueprints are classified proprietary utility assets; solving nonlinear hydraulic equations exceeds web edge compute capabilities.
- **Phase 1 Approach:** Geographic modeling strictly bounded to District Metered Area (DMA) polygons and administrative Barangay boundaries.

### 3.5 In-App Billing Disputes & Tariff Adjudication (`FR-REG-01`)
- **Concept:** Meter billing complaints, dispute resolution, and rebate calculations.
- **Rationale:** Tariff regulation and billing adjudications are statutory powers legally reserved for the **National Water Resources Board (NWRB)** and the **Local Water Utilities Administration (LWUA)**.
- **Phase 1 Approach:** OWTA remains an objective, neutral operational transparency system. Billing disputes are directed to utility customer desks.

### 3.6 Laboratory Water Quality Certifications (`FR-LAB-01`)
- **Concept:** Direct integration with DOH accredited laboratories for chemical and biological potability certificates.
- **Rationale:** Requires physical chain-of-custody documentation, cold-chain preservation, and statutory laboratory signatures.
- **Phase 1 Approach:** The system accepts qualitative citizen reports (`discolored_water`, `dry_tap`, `pipe_burst`) for operational alerting.
