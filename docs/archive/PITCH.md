# OWTA: 3-Minute Technical Defense Script
## Standard Operational Demonstration Runbook

**Target Audience:** Thesis Defense Panel, ISO Certification Auditors, LGU Executives  
**Target Duration:** Exactly 180 Seconds (3 Minutes)  
**System State:** Seeded with Iloilo City DMAs (Jaro, Mandurriao, City Proper, Molo, La Paz)

---

## Demonstration Overview Timeline

```
  0:00                 0:25               0:50                1:15                 1:40               2:05                2:30          3:00
┌───┴───────────────────┴───────────────────┴───────────────────┴────────────────────┴──────────────────┴───────────────────┴─────────────┐
│ Step 1: Discovery     │ Step 2: Citizen   │ Step 3: Anti-Sybil│ Step 4: Barangay   │ Step 5: LGU      │ Step 6: Utility   │ Step 7:     │
│ Public Status &       │ Report Submission │ Clustering (WR05) │ Triage & RLS (WR06)│ Dispatch (WR10)  │ Superseding (WR02)│ Index (WR12)│
└───────────────────────┴───────────────────┴───────────────────┴────────────────────┴──────────────────┴───────────────────┴─────────────┘
```

---

## Step 1: Public Discovery & Real-Time Status
* **Time:** `0:00 - 0:25` (25 Seconds)
* **Actor:** Unauthenticated Citizen (`anon`)
* **URL:** `http://localhost:3000/`

### Verbal Script
> "Good morning, members of the panel. This is OWTA — the Iloilo Water Transparency Tracker.
> As an unauthenticated resident of Iloilo City, I open the public portal on my smartphone. Immediately, I see the real-time operational status across all 180 barangays.
> Notice the top banner: it displays the live 'As-of' timestamp and active emergency advisories. If my network disconnects, a stale indicator alerts me instantly.
> I look up my home in Barangay San Rafael: the badge indicates 'Scheduled Window: 06:00 to 12:00', but telemetry shows zero tap pressure. I am out of water."

### Panel Action Checklist
- [ ] Point to the live advisory ticker.
- [ ] Highlight the responsive MapLibre GL map showing color-coded barangay polygons.
- [ ] Click on "Barangay San Rafael, Mandurriao" to inspect the active schedule countdown.

---

## Step 2: Low-Friction Citizen Reporting
* **Time:** `0:25 - 0:50` (25 Seconds)
* **Actor:** Unauthenticated Citizen (`anon`)
* **URL:** `http://localhost:3000/report`

### Verbal Script
> "Instead of dialing a busy hotline or venting on social media, I tap 'Report Outage'.
> In under 30 seconds, I select 'Dry Tap', choose 'San Rafael', and add the landmark 'Corner Delgado St, near Plaza'.
> Notice what happens behind the scenes: Cloudflare Turnstile validates that I am human. The server computes a salted device hash using `DEVICE_KEY_PEPPER` to prevent rate-limit evasion.
> I hit submit. Instantaneously, I receive ticket token `OWTA-SR-941`. I didn't need to create a password or surrender my identity."

### Panel Action Checklist
- [ ] Select category: `dry_tap`.
- [ ] Enter landmark: `Corner Delgado St, near Plaza`.
- [ ] Check voluntary SMS consent box and submit.
- [ ] Show the generated ticket token modal.

---

## Step 3: Anti-Sybil Spatiotemporal Deduplication
* **Time:** `0:50 - 1:15` (25 Seconds)
* **Actor:** Second Citizen / Simulating Neighbor
* **URL:** `http://localhost:3000/report` (In Incognito Window)

### Verbal Script
> "Now, what happens if ten neighbors submit reports at the same time? Or what if a bot attempts to spam the system?
> I open an incognito session to simulate a neighbor 50 meters away submitting another 'Dry Tap' report.
> Under Rule `WR05`, our PostGIS database intercepts the coordinates: since it falls within 200 meters and within a 3-hour sliding window, it does not spawn a new chaotic pin.
> It automatically aggregates into Cluster `#SR-C1`, incrementing the verified count to 2. This maintains a clean, actionable operational picture for the authorities."

### Panel Action Checklist
- [ ] Submit second report for San Rafael within close proximity.
- [ ] Return to public map: demonstrate that the cluster count incremented without duplicating map clutter.

---

## Step 4: Barangay Official Scoped Triage
* **Time:** `1:15 - 1:40` (25 Seconds)
* **Actor:** `barangay_official` (San Rafael)
* **URL:** `http://localhost:3000/staff/reports`

### Verbal Script
> "Now we transition to governance. I log in as the Barangay Official for San Rafael.
> Look at the database security: under Rule `WR06`, PostgreSQL Row-Level Security executes `auth.app_role()`. I cannot see or tamper with reports from Jaro or City Proper. My view is mathematically bounded to San Rafael.
> I inspect Cluster `#SR-C1`. Having verified with our roving tanod that the street main is indeed dry, I click 'Verify & Escalate'. The cluster status transitions to `VERIFIED`."

### Panel Action Checklist
- [ ] Log in with credential: `official.sanrafael@owta.iloilo.gov.ph`.
- [ ] Point out that reports from other barangays are completely absent (RLS enforcement).
- [ ] Click "Verify & Escalate" on the San Rafael cluster. Show updated status badge.

---

## Step 5: LGU Relief Priority Queue & Dispatch
* **Time:** `1:40 - 2:05` (25 Seconds)
* **Actor:** `lgu_dispatcher` (CDRRMO / City Hall)
* **URL:** `http://localhost:3000/staff/relief`

### Verbal Script
> "Next, I switch to the City Disaster Risk Reduction and Management Office (CDRRMO) dispatch desk.
> In the past, water tankers were sent to whoever called the Mayor's office first. In OWTA, Rule `WR10` governs the dispatch queue.
> Because San Rafael's verified dry tap status has persisted past our critical threshold, the algorithm automatically elevates San Rafael to Priority #1: CRITICAL_RELIEF.
> I assign City Tanker #4 (10,000 Liters) and click 'Dispatch'. The dispatch order is logged, and the lifecycle transitions to `IN_TRANSIT`."

### Panel Action Checklist
- [ ] Log in with credential: `dispatcher.cdrrmo@owta.iloilo.gov.ph`.
- [ ] Show the automated priority ranking sorted by verified dry hours.
- [ ] Select Tanker #4 and click "Generate Dispatch Order".

---

## Step 6: Utility Schedule Superseding
* **Time:** `2:05 - 2:30` (25 Seconds)
* **Actor:** `utility_operator` (MPIW Desk)
* **URL:** `http://localhost:3000/staff/schedules`

### Verbal Script
> "Now, what about the water utility? I log in as a Metro Pacific Iloilo Water operator.
> An emergency transmission main burst occurs along Diversion Road. Under Rules `WR01` and `WR02`, I am forbidden from deleting or editing the active schedule in-place.
> I click 'Supersede Schedule', enter the emergency repair window, and record the mandatory justification code.
> The previous schedule is archived with `superseded_at = NOW()`. Public citizens receive an updated schedule, and the audit trail preserves both commitments."

### Panel Action Checklist
- [ ] Log in with credential: `operator.mpiw@owta.iloilo.gov.ph`.
- [ ] Open the active schedule for DMA 03. Click "Supersede Schedule".
- [ ] Enter reason: "Emergency 300mm Main Repair - Diversion Rd".
- [ ] Confirm submission and show the superseded badge.

---

## Step 7: The Weekly Delivery Index
* **Time:** `2:30 - 3:00` (30 Seconds)
* **Actor:** Public Auditor (`auditor` / `anon`)
* **URL:** `http://localhost:3000/methodology`

### Verbal Script
> "Finally, we close the loop with the cornerstone of accountability: the Iloilo Water Delivery Index.
> Every Sunday midnight, our mathematical engine evaluates performance across 672 fifteen-minute epochs.
> Under Rule `WR12`, all simulated test data is strictly excluded. Under Step 9 of our methodology, if a DMA has less than 70% verified data coverage, the score is withheld to prevent gaming.
> Here on the public scoreboard, we see DMA 04 achieved a 66.7% Delivery Index — Tier 3: Degraded.
> OWTA transforms water distribution from subjective arguments into an immutable, transparent, and auditable civic record.
> Thank you, and we are ready for the panel's questions."

### Panel Action Checklist
- [ ] Navigate to `/methodology`.
- [ ] Scroll through the 10-step mathematical framework.
- [ ] Display the Recharts comparison graph of Promised vs. Delivered hours.
- [ ] Conclude presentation on the 3:00 minute mark.

