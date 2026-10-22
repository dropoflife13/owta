# OWTA: Methodology

Rules and formulas for status, relief priority, report grouping, and the weekly delivery index. Open this file when a task touches any of them. The schema and views are in `DATA_MODEL.md`.

The methodology page must publish the index method before any index is shown.

## Parameters

Values marked [A] are assumptions to confirm with the team and pilot barangays. Read them from `index_methodologies` (or app configuration where noted). Never hard-code them.

| Parameter | Default | Where it lives |
|---|---|---|
| `min_psi` | 5 [A] | `index_methodologies` |
| `stale_after_minutes` | 360 [A] | `index_methodologies` |
| `relief_dry_hours` | 48 [A] | `index_methodologies` |
| `min_coverage` | 0.70 [A] | `index_methodologies` |
| Report grouping radius | 300 m [A] | app configuration |
| Report grouping window | 6 h [A] | app configuration |

A change to any methodology parameter is a new `index_methodologies` version. Old versions and their snapshots are never edited.

## Status (WR02, WR03)

Status is derived per DMA from the latest reading at each active pressure monitoring point (`v_point_latest`).

| Condition | DMA status |
|---|---|
| No reading, or newest reading older than `stale_after_minutes` | `unknown` |
| Average of latest readings equals 0 | `dry` |
| Average below `min_psi` | `low` |
| Otherwise | `flowing` |

A barangay shows its worst status across the DMAs that serve it: `dry`, then `low`, then `flowing` only if every serving DMA is `flowing`, otherwise `unknown`.

Every public status shows its source and as-of time. When data is older than the stale threshold, show a stale-data banner and `unknown`, never `flowing`.

## Relief priority (WR06)

- Dry hours per DMA is the time since the last reading above 0 PSI at any active pressure point. If no reading above 0 exists, it is the time since the first reading.
- A barangay enters the relief list when a serving DMA has status `dry` and dry hours at or above `relief_dry_hours`.
- A DMA with `unknown` status never triggers relief.
- The list is ordered by dry hours, highest first. It is visible to staff only.

## Report grouping (WR05)

A new report joins an existing group when all hold:
- Same barangay and same report type.
- Group status is `open`, `verified`, or `dispatched`.
- Group's last report is within the grouping window.
- Within the grouping radius of the group's center, or either location is missing.

Otherwise it starts a new group. Members are kept and the group count is public. The public sees groups only through `v_public_report_groups`.

## Delivery index, version 1 (WR04, WR12)

1. **Week.** Monday 00:00 to the next Monday 00:00 in Asia/Manila.
2. **Promised windows.** Published, non-superseded schedule rows that overlap the week with flow type `full` or `low`. `shut` windows are not promised supply.
3. **Promised hours.** Total length of promised windows inside the week.
4. **Held readings.** Each reading holds until the next reading or the stale limit, whichever comes first.
5. **Delivered moment.** A moment inside a promised window counts as delivered when the DMA average of held readings is at least `min_psi`.
6. **Delivered hours.** Total length of delivered moments inside promised windows.
7. **Coverage.** Promised hours that have a held reading, divided by promised hours.
8. **Index.** Delivered hours divided by promised hours. If coverage is below `min_coverage`, store `insufficient_data = true` and show no percentage.
9. **Barangay roll-up.** Blend the DMA results weighted by `coverage_pct` in `barangay_dma` [A].
10. **Exclusions.** Simulated readings and schedules are excluded unless the demo flag is set.
11. **History.** Snapshots are stored with the methodology version. A new version creates new rows and never edits old ones.
12. **Display.** Always show promised hours, delivered hours, coverage, methodology version, and a link to this method.

Mark insufficient data instead of guessing. Right-of-reply notes (`period_notes`, WR10) attach to a DMA and week and never change the numbers.

## Jobs

- Weekly index: a SQL function computes snapshots weekly and on demand for the current week. It is a SQL function so it can be tested against fixtures.
- Nightly retention purge of contact data (WR09).
- Outbox drain (Phase 2): batches queued notifications through the SMS provider, retries up to a limit, then marks them failed. A daily send cap protects the SMS budget.

## Test fixtures

Cover at least: a stale DMA (`unknown`), a dry DMA past the relief threshold, a barangay served by multiple DMAs with mixed status, a week with insufficient coverage, a week with simulated readings (excluded), and a methodology version change that leaves old snapshots untouched.
