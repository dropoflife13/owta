# 03 — Citizen Outage Reporting & Automated Grouping

Status: in-progress (Built, awaiting live testing)  
Blocked by: 02 (Done)

## What we are building
A resident whose tap is dry taps "Report Outage", selects their barangay, chooses the issue (`dry_tap`, `low_pressure`, `pipe_burst`, `dirty_water`), types a recognizable landmark, and hits submit. The server validates the input via Zod and calls `submit_report()`, which automatically groups nearby reports within 200m and 3h (`WR05`). The resident receives an unguessable 8-character reference token (e.g., `OWTA-X7B29M`) and is redirected to an anonymous tracking screen (`/report/[code]`).

## Why this slice
Closes the primary citizen loop: low-friction reporting without requiring an account or exposing personal coordinates (`WR07`), while protecting the system with anti-sybil rate limiting (`WR04`) and automated spatiotemporal clustering (`WR05`).

## Steps
1. Build the mobile-first reporting form at `app/report/page.tsx` and `components/forms/CitizenReportForm.tsx` with Zod validation.
2. Wire the submission Route Handler `POST /api/reports` to invoke the `submit_report()` RPC in Supabase.
3. Build the tracking page `app/report/[code]/page.tsx` displaying current ticket status (`submitted`, `verified`, `dispatched`, `resolved`, `rejected`).
4. Include the optional RA 10173 phone consent checkbox (`WR09`).

## How to test on localhost
1. Open `http://localhost:3000/report`.
2. Submit a report for Barangay San Rafael with landmark "Near Plaza Fountain".
3. Verify you receive an 8-character reference code and are redirected to `/report/OWTA-XXXXXX`.
4. Submit a second report within the same barangay and vicinity; check the database to confirm `report_count` incremented to 2 in `report_clusters`.

## How to test on the live site
1. Open the live URL on your smartphone (`https://owta.vercel.app/report`).
2. Submit a test report; confirm the reference token is generated and persists on page reload.
3. Try tracking with the code from `/report` "Track Existing Ticket" tab.

## Done looks like
- [x] `/report` form validates input using Zod.
- [x] Database stores report via `submit_report()` RPC.
- [x] Spatiotemporal clustering merges nearby reports into one `report_clusters` row (`WR05`).
- [x] Public tracking screen displays lifecycle status with zero PII or coordinates exposed (`WR07`).
