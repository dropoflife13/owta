# 02 — Connected to Supabase & Live Barangay Status

Status: done  
Blocked by: 01 (Done)

## What we are building
The live homepage reads real data from Supabase. A resident visits the landing page, selects their district/barangay, and sees the live water status badge (`flowing`, `low`, `dry`, or `unknown`), average PSI, and exact as-of timestamp. If telemetry is older than the stale threshold (360 min), a prominent amber stale-data warning banner appears (`WR02`, `WR03`).

## Why this slice
Proves the Next.js App Router server client is securely reading from Supabase views (`v_public_barangay_status`) through Row-Level Security, and that environment variables are correctly injected both locally and in Vercel.

## Steps
1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel Project Settings > Environment Variables (Verified).
2. Build the public status card and district selector in `app/page.tsx` querying `v_public_barangay_status`.
3. Render the status badge with distinct icons and colors (never color alone per WCAG AA):
   - 💧 Flowing (Green)
   - ⚠️ Low Pressure (Amber)
   - 🚫 Dry Tap (Red)
   - ℹ️ Normal Standby (Blue)
   - ❓ Unknown / Stale (Zinc/Gray)
4. Add the Stale Data Banner whenever `as_of` exceeds `stale_after_minutes` or is null (`WR03`).

## How to test on localhost
1. Ensure `.env.local` has your Supabase project keys.
2. Run `npm run dev`.
3. Open `http://localhost:3000`.
4. Verify seeded barangays (e.g., San Rafael, Bolilao) render with their status badge and as-of time.

## How to test on the live site
1. Commit and push to `main`.
2. Open the live Vercel URL on your phone (`https://owta.vercel.app/`).
3. Verify the seeded barangays load from the hosted Supabase database (`jmgetfndgrthwxivimjn.supabase.co`).

## Done looks like
- [x] Vercel environment variables are live and verified.
- [x] Homepage renders live barangays fetched from `v_public_barangay_status`.
- [x] Stale banner renders when telemetry is outdated or missing (`WR02`, `WR03`).
- [x] Zero database secret keys exposed in client bundles.
