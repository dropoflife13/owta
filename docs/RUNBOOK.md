# OWTA: Operations & Incident Runbook
## Standard Operating Procedures & Pre-Defense Readiness Guide

**Document Code:** OWTA-OPS-V1  
**Target Environment:** Local Development & Production Staging  
**Primary Users:** System Administrators, DevOps Engineers, Demonstration Leads

---

## 1. Pre-Defense Operational Readiness Checklist

Execute this checklist sequentially **45 minutes prior** to any academic defense, accreditation review, or public deployment.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRE-DEFENSE READINESS CHECKLIST                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ ] Step 1: Supabase Instance Wake-Up & Latency Verification                │
│ [ ] Step 2: Environment Variable Security Audit                             │
│ [ ] Step 3: Sequential Migration Verification (0001 -> 0009)                 │
│ [ ] Step 4: Execute RLS & Security Test Suite (tests/rls_and_views.sql)     │
│ [ ] Step 5: Execute Idempotent Seed Script (seed.sql)                       │
│ [ ] Step 6: Verify Production Build & Static Shell Generation               │
│ [ ] Step 7: Perform End-to-End Health Probe & Stale Banner Check            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Preparation Procedures

### Step 1: Supabase Instance Wake-Up & Verification
Free-tier and inactive cloud-hosted Supabase projects enter a paused or sleep state after periods of inactivity. A sleep condition during a live defense presentation will result in 30-second API cold-starts or connection refused errors.

1. **Ping Database Endpoint:**
   Execute a simple query from the terminal to verify active database state:
   ```bash
   curl -I "https://jmgetfndgrthwxivimjn.supabase.co/rest/v1/" \
     -H "apikey: sb_publishable_ngZW3g1eOLCvHJ0GyM7vuQ_rvHhDCHM"
   ```
2. **Verify Response:**
   Confirm an immediate HTTP `200 OK` or `401 Unauthorized` (indicating the PostgREST server is awake and accepting connections).
3. If paused, log in to the Supabase Cloud Management Console and manually trigger **"Restore Project"**.

---

### Step 2: Environment Variable Security Audit
Strict separation between public publishable keys and confidential service keys must be verified to prevent client-side security exfiltration.

1. Inspect `.env.local`:
   * `NEXT_PUBLIC_SUPABASE_URL` must point to the verified project URL.
   * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `ANON_KEY`) must contain the public client key (`sb_publishable_...`).
   * **STRICT CHECK:** The file must **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.
2. Confirm that `SUPABASE_SERVICE_ROLE_KEY` is only accessible inside Server Actions or Route Handlers (`src/app/api/*`).
3. Confirm that `DEVICE_KEY_PEPPER` is populated with a high-entropy secret string for anti-sybil hashing.

---

### Step 3: Migration Execution Sequence (`0001` through `0009`)

All database schemas must be applied cleanly and in strict dependency order:

```bash
# Verify migrations in order
cat supabase/migrations/0001_extensions.sql       | psql $DATABASE_URL
cat supabase/migrations/0002_geography.sql        | psql $DATABASE_URL
cat supabase/migrations/0003_identity.sql         | psql $DATABASE_URL
cat supabase/migrations/0004_monitoring_supply.sql | psql $DATABASE_URL
cat supabase/migrations/0005_methodology_index.sql | psql $DATABASE_URL
cat supabase/migrations/0006_reports.sql          | psql $DATABASE_URL
cat supabase/migrations/0007_relief_alerts.sql    | psql $DATABASE_URL
cat supabase/migrations/0008_governance_audit.sql | psql $DATABASE_URL
cat supabase/migrations/0009_views_and_rls.sql    | psql $DATABASE_URL
```

*Rollback Strategy:* If a migration fails mid-sequence, execute transactional rollback (`ROLLBACK;`), inspect `schema_migrations`, resolve the constraint violation, and re-run from the failing script.

---

### Step 4: Verification of RLS & Security Test Suite

Execute the formal verification test matrix located in `supabase/tests/rls_and_views.sql`:

```bash
psql $DATABASE_URL -f supabase/tests/rls_and_views.sql
```

The test script runs automated SQL test assertions verifying:
1. **Unauthenticated Public Isolation:** Anonymous role can read `v_public_barangay_status` but receives permission denied when attempting `SELECT * FROM water_reports` or `SELECT * FROM user_profiles`.
2. **Barangay Official Boundaries (`WR06`):** Official from Barangay San Rafael receives zero rows when querying reports for Barangay Jaro.
3. **Audit Log Immutability (`WR08`):** Running `DELETE FROM audit_logs;` or `UPDATE audit_logs SET action = 'tampered';` raises an immediate PostgreSQL exception: `ERROR: audit_logs is append-only`.
4. **Physical Pressure Limits (`WR03`):** Inserting a record with `pressure_psi = 35.0` is blocked by check constraint.

All assertions must output `[PASS]` before the system is declared defense-ready.

---

### Step 5: Seeding Idempotent Demo Data

Execute `supabase/seed.sql` to populate representative operational data:
```bash
psql $DATABASE_URL -f supabase/seed.sql
```

#### Pre-Configured Demonstration Accounts

| Role Identifier | Test Email Address | Default Password | Scoped Assignment |
| :--- | :--- | :--- | :--- |
| **`barangay_official`** | `official.sanrafael@owta.iloilo.gov.ph` | `IloiloWater2026!` | Barangay San Rafael, Mandurriao |
| **`barangay_official`** | `official.jaro@owta.iloilo.gov.ph` | `IloiloWater2026!` | Barangay Cuartero, Jaro |
| **`lgu_dispatcher`** | `dispatcher.cdrrmo@owta.iloilo.gov.ph` | `IloiloWater2026!` | CDRRMO Emergency Water Desk |
| **`utility_operator`** | `operator.mpiw@owta.iloilo.gov.ph` | `IloiloWater2026!` | MPIW Operations Center |
| **`auditor`** | `auditor.cso@owta.iloilo.gov.ph` | `IloiloWater2026!` | Citizens Water Watch Alliance |
| **`admin`** | `admin.sys@owta.iloilo.gov.ph` | `IloiloWater2026!` | City Information Technology Office |

---

### Step 6: Production Build & Clean Compilation

Always verify that the Next.js production build completes without TypeScript or hydration errors:

```bash
npm run build
```

Verify output confirmation:
* Routes compiled with Turbopack.
* Dynamic routes identified with `ƒ (Dynamic)`.
* Zero unresolved imports or dead type declarations.

---

## 3. Incident Management & Troubleshooting Procedures

### Incident 1: Stale Data Banner Displayed on Public Portal
* **Symptom:** Red/Orange banner appears on the client header: *"⚠️ Offline / Stale Data: Telemetry has not updated in > 15 minutes."*
* **Root Causes:**
  1. Client browser has lost internet connectivity.
  2. Edge CDN cache is serving expired static assets.
  3. Supabase database service is unreachable or rate-limited.
* **Resolution Steps:**
  1. Open browser DevTools Network tab; inspect calls to `/api/public/barangays` or `/api/health`.
  2. If the client is offline, test reconnecting cellular or Wi-Fi.
  3. If `/api/health` returns `503 Service Unavailable`, verify Supabase database CPU and connection pool metrics.
  4. Force client revalidation by refreshing with `Ctrl + F5` (clearing client Service Worker cache).

---

### Incident 2: Cloudflare Turnstile CAPTCHA Failure
* **Symptom:** Citizen submit button displays an infinite spinner or returns error: *"Verification challenge failed. Please refresh."*
* **Root Causes:**
  1. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` or `TURNSTILE_SECRET_KEY` is missing or mismatched.
  2. Local testing domain (`localhost` or `127.0.0.1`) is not whitelisted in the Cloudflare Turnstile dashboard.
* **Resolution Steps:**
  1. Ensure Cloudflare Turnstile widget is in "Always Pass" test mode for local testing (`1x00000000000000000000AA`).
  2. Verify environment keys match between server and client.

---

### Incident 3: SMS Gateway Dispatch Timeout
* **Symptom:** Urgent advisory published, but citizen subscribers report non-receipt of SMS text messages.
* **Root Causes:**
  1. PhilSMS / Semaphore gateway API balance depleted.
  2. Cellular carrier network congestion across Smart/Globe towers in Western Visayas.
  3. Webhook delivery failure or invalid API key.
* **Resolution Steps:**
  1. Check the SMS provider dashboard for credit balance.
  2. Query `sms_subscriptions` table for delivery error codes:
     ```sql
     SELECT status, error_message, count(*)
     FROM sms_delivery_logs
     WHERE sent_at > NOW() - INTERVAL '1 hour'
     GROUP BY 1, 2;
     ```
  3. Fallback: The public web advisory ticker (`v_active_advisories`) remains the authoritative primary channel. Advise citizens via social media announcements to check the live portal.

