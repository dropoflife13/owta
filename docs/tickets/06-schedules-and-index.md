# 06 — Operator Schedules & Delivery Index Scoreboard

Blocked by: 02

## What we are building
A Utility Operator signs in and visits `/staff/schedules` to publish a rotational water schedule for a DMA. The database enforces non-overlapping windows via exclusion constraint (`WR01`). When an adjustment is required, the operator publishes a superseding schedule. On the public side, citizens visit `/index` and `/methodology` to view the Weekly Water Delivery Index comparing promised supply hours vs. delivered hours ($\ge 5\text{ PSI}$) with coverage percentage, transparently excluding simulated data (`WR04`, `WR12`).

## Why this slice
Completes the public accountability loop: establishes an auditable record of promised versus delivered water supply under a published, versioned mathematical methodology.

## Steps
1. Build operator schedule editor at `src/app/staff/schedules/page.tsx` for publishing rotational windows (`supply_schedules`).
2. Implement superseding flow: updating an active window creates a replacement record referencing `supersedes_id` (`WR01`).
3. Build the public methodology and scoreboard page at `src/app/(public)/methodology/page.tsx` and `src/app/(public)/index/page.tsx`.
4. Query `delivery_snapshots` and display promised hours, delivered hours, coverage ratio, and index percentage.
5. If coverage is below 70% (`min_coverage`), display `insufficient_data = true` without calculating a misleading percentage (`WR04`).
6. Display a visible indicator if simulated test data is active (`WR12`).

## How to test on localhost
1. Log in as `operator.mpiw@owta.iloilo.gov.ph`.
2. Attempt to publish two overlapping schedules for DMA 04; confirm database raises GiST exclusion constraint error (`WR01`).
3. Publish a valid non-overlapping schedule.
4. Visit `http://localhost:3000/methodology` and `/index` to view the published formulas and weekly index cards.

## How to test on the live site
1. Log in as operator on the live URL.
2. Publish a live test schedule window.
3. Open the public schedule viewer and index page in an incognito window to verify the updated hours appear publicly with the active methodology link.

## Done looks like
- [ ] Database blocks overlapping published schedule windows via GiST constraint (`WR01`).
- [ ] Operator can supersede a schedule with replacement windows.
- [ ] Public `/methodology` and `/index` render promised vs. delivered hours and coverage ratio.
- [ ] Insufficient coverage ($< 70\%$) cleanly displays "Insufficient Data" rather than a false score.
- [ ] Simulated data is visibly labeled (`WR12`).

