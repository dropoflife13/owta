# 05 — LGU Relief Priority Queue

Blocked by: 02

## What we are building
An LGU CDRRMO Dispatcher logs in and navigates to `/staff/relief`. They view the City-wide Relief Priority Matrix, which automatically ranks barangays suffering from verified dry taps where dry duration is $\ge 48$ consecutive hours (`WR06`), sorted with the longest dry duration at the top. The dispatcher assigns an active tanker from the fleet inventory (`tankers`) and clicks "Dispatch Tanker", moving status to `dispatched` (`WR11`).

## Why this slice
Proves evidence-based municipal resource allocation: relief tankers are dispatched according to verified mathematical duration of waterlessness rather than political noise or arbitrary requests.

## Steps
1. Build the CDRRMO relief matrix at `src/app/staff/relief/page.tsx` querying view `v_relief_priority`.
2. Render columns: Barangay Name, District, Consecutive Dry Hours, As-Of Time, and Dispatch Action.
3. Build the tanker assignment modal querying active tankers from `tankers`.
4. Create Server Action `dispatchTankerAction` to insert into `tanker_dispatches` and update status following the state machine: `requested` -> `dispatched` -> `delivered` (`WR11`).
5. Verify that DMAs with `unknown` status never appear in the relief priority list (`WR06`).

## How to test on localhost
1. Log in as `dispatcher.cdrrmo@owta.iloilo.gov.ph`.
2. Open `/staff/relief`.
3. Verify barangays with dry hours $\ge 48\text{h}$ appear in descending order.
4. Assign a test tanker (e.g., CDRRMO Tanker 01) and click dispatch. Verify status moves to `dispatched`.

## How to test on the live site
1. Log in as dispatcher on the live Vercel URL.
2. Confirm the relief priority queue loads from `v_relief_priority`.
3. Complete a test dispatch and verify the record is logged in `tanker_dispatches`.

## Done looks like
- [x] `/staff/relief` renders barangays filtered to dry duration $\ge 48$ hours.
- [x] List is strictly sorted by dry hours descending (`WR06`).
- [x] Dispatching transitions status cleanly through `requested` -> `dispatched` -> `delivered` (`WR11`).
- [x] Access is restricted to `lgu_dispatcher` and `admin` roles.

