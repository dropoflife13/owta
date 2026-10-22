# 04 — Barangay Official Triage Portal

Blocked by: 03

## What we are building
A Barangay Official signs in at `/login`. They are routed to `/staff/reports`, where they see incoming citizen report clusters strictly filtered to their assigned barangay. The official inspects the cluster, conducts a field verification, and clicks "Verify" or "Reject", entering field notes. Updating the report triggers an audit log record (`WR08`) and updates the citizen-facing ticket tracking page in real time.

## Why this slice
Proves role-based access control (RLS) and barangay data isolation on the server (`app_barangay()`), enabling grassroots verification before relief resources are mobilized.

## Steps
1. Build authentication login screen at `src/app/(auth)/login/page.tsx` using Supabase Auth.
2. Build the staff layout and navigation bar at `src/app/staff/layout.tsx` enforcing `verified_at` role guards.
3. Build the triage table and detail card at `src/app/staff/reports/page.tsx` querying `citizen_reports` and `report_groups`.
4. Create Server Action `updateReportTriageAction` allowing verified officials to update report status to `verified` or `rejected` with operational notes.
5. Confirm RLS prevents officials from seeing reports belonging to other barangays.

## How to test on localhost
1. Log in as `official.sanrafael@owta.iloilo.gov.ph` (assigned to San Rafael).
2. Visit `/staff/reports`. Verify you see reports submitted in Ticket 03 for San Rafael.
3. Change report status to `verified`. Confirm update succeeds.
4. Attempt to query reports for Barangay Bolilao; confirm RLS returns 0 records.

## How to test on the live site
1. Log in to the live site as the San Rafael official.
2. Mark a live test report as `verified`.
3. Open the public ticket tracking URL (`/report/[code]`) in an incognito window and verify the public badge now displays `Verified`.

## Done looks like
- [x] Login screen authenticates staff accounts and sets secure session cookies.
- [x] Barangay official is strictly scoped to their assigned barangay via RLS.
- [x] Triage status updates (`verified`, `rejected`) persist and write to `audit_logs` (`WR08`).
- [x] Public reference code status updates accordingly.

