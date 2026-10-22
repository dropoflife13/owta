# OWTA: Methodology & Mathematical Specification

Rules and formulas for status derivation, emergency relief priority, report clustering, and the Weekly Water Delivery Index.

The public methodology page (`/methodology`) publishes this specification openly to ensure transparency and accountability.

---

## 1. Parameter Specifications

Methodology parameters are managed in `methodology_parameters`. Any change creates a new version; previous versions and calculated snapshots are immutable.

| Parameter | Default | Definition & Table |
|---|---|---|
| `min_pressure_threshold` | 7.00 PSI (or 5.00 PSI) | Minimum hydraulic pressure for delivered water (`methodology_parameters`) |
| `stale_after_minutes` | 360 min (6 hours) | Time after which absent telemetry resolves to `unknown` |
| `relief_dry_hours` | 48 hours | Consecutive dry duration required to enter relief queue (`WR06, WR10`) |
| `min_coverage_floor` | 0.70 (70%) | Minimum valid telemetry coverage required to compute an index score (`WR04`) |
| `epoch_minutes` | 15 min | Time bucket for discrete pressure aggregation |
| Report clustering radius | 200 meters | Spatiotemporal proximity radius in `submit_report()` (`WR05`) |
| Report clustering window | 3 hours | Temporal window for incident grouping in `submit_report()` (`WR05`) |

---

## 2. Real-Time Status Derivation (WR02, WR03)

Current status derives per DMA from the latest readings across active pressure monitoring points (`monitoring_points`, `pressure_readings`):

| Telemetry Condition | Computed Status |
|---|---|
| No reading, or newest reading older than 360 min (`stale_after_minutes`) | `unknown` (triggers stale warning banner) |
| Gauge pressure reading equals 0.00 PSI | `dry` |
| Pressure above 0 but below `min_pressure_threshold` | `low_pressure` |
| Pressure at or above `min_pressure_threshold` | `flowing` |

**Barangay Roll-up:** A barangay reflects its worst status across serving DMAs (`dry` $\rightarrow$ `low_pressure` $\rightarrow$ `flowing` only if every serving DMA is flowing, otherwise `unknown`). Every public status badge shows its source and as-of time.

---

## 3. Emergency Relief Priority (WR06, WR10)

1. **Continuous Dry Duration:** Elapsed dry hours per DMA is computed from the time since the last reading above 0 PSI.
2. **Elevation Threshold:** A barangay enters the priority queue (`v_relief_priority_queue`) strictly when serving DMA status is `dry` and consecutive dry duration reaches or exceeds 48 hours (`WR06, WR10`).
3. **Fail-Safe Integrity:** Telemetry with `unknown` or stale status **never** triggers relief.
4. **Strict Ordering:** The relief matrix is ordered by dry hours descending (highest first) for evidence-based municipal resource allocation.

---

## 4. Spatiotemporal Report Clustering (WR05, WR07)

When a citizen submits an outage report via `submit_report()`:
1. The system checks active clusters (`report_clusters`) in the same barangay and category within 200 meters and 3 hours (`ST_DWithin`).
2. If a matching cluster exists, the report is joined, the cluster center is updated as a running centroid, and `report_count` is incremented.
3. If no matching cluster exists, a new cluster is created.
4. An unguessable 8-character `ticket_token` is generated for citizen tracking (`get_ticket_status()`) without leaking exact coordinates or personal phone numbers (`WR07`).

---

## 5. Delivery Index Calculation Engine (WR04, WR12)

Implemented in `compute_weekly_delivery_index()` and materialized in `weekly_delivery_indices` / `v_public_water_index`:

$$\text{Index} = \min\left(1.0, \frac{\text{Delivered Hours}}{\text{Promised Hours}}\right) \times 100\%$$

1. **Evaluation Cycle:** 7-day Monday 00:00 to Monday 00:00 (Asia/Manila).
2. **Promised Hours:** Cumulative duration of active published supply windows in `water_schedules` overlapping the cycle (`superseded_at IS NULL`).
3. **Telemetry Epochs:** Evaluated in 15-minute discrete bins (`date_bin`) during scheduled windows.
4. **Delivered Hours:** Count of 15-minute epochs where median observed pressure $\ge 7.00\text{ PSI}$ multiplied by $0.25\text{ h}$.
5. **Coverage Ratio:** Observed valid epochs divided by total promised epochs.
6. **Rule WR04 Suppression Floor:** If coverage ratio $< 0.70$ (70%), the delivery score is strictly suppressed (`delivery_index_score = NULL`) and assigned tier `DATA_DEFICIENT` ("Insufficient Data") to prevent misleading scores.
7. **Rule WR12 Isolation:** Any reading where `is_simulated = TRUE` is strictly excluded from index calculations.

### Performance Tier Banding:
- **`EXEMPLARY`**: $\ge 90.0\%$
- **`SATISFACTORY`**: $75.0\% - 89.9\%$
- **`DEGRADED`**: $50.0\% - 74.9\%$
- **`CRITICAL_DEFICIT`**: $< 50.0\%$
- **`DATA_DEFICIENT`**: Coverage $< 70.0\%$ (Rule WR04)
- **`NO_SCHEDULED_HOURS`**: Promised hours $= 0$
