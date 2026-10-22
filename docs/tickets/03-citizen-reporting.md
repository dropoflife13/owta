# 03 — Citizen Outage Reporting & Automated Grouping

Blocked by: 02

## What we are building
A resident whose tap is dry taps "Report Outage", selects their barangay, chooses the issue (`dry_tap`, `low_pressure`, `pipe_burst`, `discolored_water`), types a recognizable landmark, and hits submit. Upon passing Turnstile CAPTCHA, the server calls `submit_report()`, which automatically groups nearby reports within 300m and 6h (`WR05`). The resident receives an unguessable 8-character reference code (e.g., `A9F3E1B2`) and is redirected to an anonymous tracking screen (`/report/[code]`).

## Why this slice
Closes the primary citizen loop: low-friction reporting without requiring an account or exposing personal coordinates (`WR07`), while protecting the system with anti-sybil rate limiting and automated spatiotemporal clustering (`WR05`).

## Steps
1. Build the mobile-first reporting form at `src/app/(public)/report/page.tsx` with Zod validation.
2. Integrate Cloudflare Turnstile CAPTCHA widget and client rate-limiting header checks.
3. Wire the submission Route Handler `POST /api/reports` to invoke the `submit_report()` RPC in Supabase.
4. Build the tracking page `src/app/(public)/report/[code]/page.tsx` displaying current ticket status (`new`, `verified`, `dispatched`, `resolved`).
5. Include the optional RA 10173 phone consent checkbox (`WR09`).

## How to test on localhost
1. Open `http://localhost:3000/report`.
2. Submit a report for Barangay San Rafael with landmark "Near Plaza Fountain".
3. Verify you receive an 8-character reference code and can view the tracking page.
4. Submit a second report within the same barangay and vicinity; check the database to confirm `report_count` incremented to 2 in `report_groups`.

## How to test on the live site
1. Open the live URL on your smartphone.
2. Submit a test report; confirm the reference code is generated and persists on page reload.

## Done looks like
- [ ] `/report` form validates input using Zod and enforces CAPTCHA.
- [ ] Database stores report via `submit_report()` RPC.
- [ ] Multiple reports within 300m/6h merge into one `report_groups` row (`WR05`).
- [ ] Public tracking screen displays lifecycle status with zero PII or coordinates exposed (`WR07`).

