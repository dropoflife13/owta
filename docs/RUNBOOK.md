# OWTA: Operations & Incident Runbook
## Standard Operating Procedures & Pre-Defense Readiness Guide

**Document Code:** OWTA-OPS-V1  
**Target Environment:** Local Development & Production Staging  
**Primary Users:** System Administrators, DevOps Engineers, Demonstration Leads  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`, `docs/METHODOLOGY.md`, `docs/SPEC.md`

---

## 1. Operational Readiness Checklist

Execute this checklist sequentially prior to any public deployment, pilot launch, or technical review:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OPERATIONAL READINESS CHECKLIST                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ ] Step 1: Supabase Instance Connectivity & Latency Check                  │
│ [ ] Step 2: Environment Variable Security Audit                             │
│ [ ] Step 3: Migration Sequence Verification (0001 -> 0009)                  │
│ [ ] Step 4: Verify Methodology v1 Seed Row in index_methodologies           │
│ [ ] Step 5: Execute RLS & Security Test Suite (supabase/tests/)             │
│ [ ] Step 6: Verify Sample Seed Script (supabase/seed.sql)                   │
│ [ ] Step 7: Verify Production Build & Static Compilation (npm run build)    │
│ [ ] Step 8: Perform End-to-End Health Probe (/api/health)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Operating Procedures

### Step 1: Supabase Instance Connectivity
1. **Ping Database Endpoint:**
   Verify the remote PostgREST API is active:
   ```bash
   curl -I "https://jmgetfndgrthwxivimjn.supabase.co/rest/v1/" \
     -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>"
   ```
2. Confirm an immediate HTTP `200 OK` or `401 Unauthorized` (indicating the PostgREST server is awake and accepting requests).
3. If paused, log in to the Supabase Cloud Management Console and manually trigger **"Restore Project"**.

---

### Step 2: Environment Variable Security Audit
Strict separation between public publishable keys and confidential service keys must be maintained:
1. Inspect `.env.local`:
   * `NEXT_PUBLIC_SUPABASE_URL` must point to the verified project URL.
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `PUBLISHABLE_KEY`) contains the public client key.
   * **STRICT CHECK:** Never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is restricted to server actions and cron endpoints.
3. Confirm `CAPTCHA_SECRET` and `CRON_SECRET` are securely loaded.

---

### Step 3: Migration Execution & Verification
Migrations are applied sequentially via Supabase CLI:
```bash
npx supabase migration list --linked
npx supabase db push --linked
```

Ensure `index_methodologies` version 1 is seeded with an `effective_from` in the past so that `v_dma_status` resolves properly:
```sql
select * from current_methodology;
```

---

### Step 4: Verification of RLS & Security Policies
Execute the RLS test matrix verifying that:
1. `anon` cannot read `citizen_reports`, `subscriptions`, or `audit_logs`.
2. `anon` cannot insert directly into `citizen_reports` (must call `submit_report()`).
3. A `barangay_official` cannot read or triage another barangay's reports.
4. A `resident` cannot change their own role or verification status in `profiles`.
5. An unverified staff account behaves strictly as a `resident`.
6. Public view `v_public_report_groups` exposes no personal data or exact coordinates.
7. `audit_logs` is append-only; `UPDATE` and `DELETE` throw exceptions.

---

### Step 5: Seeding Demonstration Data
Execute `supabase/seed.sql` to populate pilot geographic reference points and sample telemetry:
```bash
npx supabase db query --file supabase/seed.sql --linked
```

#### Pre-Configured Demonstration Accounts

| Role Identifier | Test Email Address | Default Password | Scoped Assignment |
| :--- | :--- | :--- | :--- |
| **`barangay_official`** | `official.sanrafael@owta.iloilo.gov.ph` | `IloiloWater2026!` | Barangay San Rafael, Mandurriao |
| **`barangay_official`** | `official.bolilao@owta.iloilo.gov.ph` | `IloiloWater2026!` | Barangay Bolilao, Mandurriao |
| **`lgu_dispatcher`** | `dispatcher.cdrrmo@owta.iloilo.gov.ph` | `IloiloWater2026!` | CDRRMO Emergency Water Desk |
| **`utility_operator`** | `operator.mpiw@owta.iloilo.gov.ph` | `IloiloWater2026!` | MPIW Operations Center |
| **`auditor`** | `auditor.cso@owta.iloilo.gov.ph` | `IloiloWater2026!` | Citizens Water Watch Alliance |
| **`admin`** | `admin.sys@owta.iloilo.gov.ph` | `IloiloWater2026!` | Project System Admin |

---

### Step 6: Production Build & Clean Compilation
Verify that the Next.js production build completes without errors:
```bash
npm run build
```

Verify output confirmation:
* Routes compiled with Turbopack.
* Dynamic routes identified with `ƒ (Dynamic)`.
* Zero unresolved imports or dead type declarations.

---

## 3. Incident Management & Troubleshooting

### Incident 1: Stale Data Banner Displayed on Public Portal
* **Symptom:** Warning banner appears: *"⚠️ Stale Data: Telemetry has not updated in > 360 minutes."*
* **Root Causes:**
  1. No new pressure readings entered for the active monitoring points in the DMA.
  2. Telemetry timestamp `recorded_at` is older than `stale_after_minutes` in `current_methodology`.
* **Resolution Steps:**
  1. Inspect `v_point_latest` and `v_dma_status` to identify which DMAs have stale readings.
  2. Operators log a new calibrated reading via `/staff/readings`.
  3. Ensure the stale banner renders correctly and informs residents rather than displaying false `flowing` status.

### Incident 2: CAPTCHA Challenge Failure
* **Symptom:** Citizen submit button displays error: *"Verification challenge failed. Please refresh."*
* **Root Causes:**
  1. `CAPTCHA_SECRET` or `NEXT_PUBLIC_CAPTCHA_SITE_KEY` is missing or mismatched.
  2. Domain is not whitelisted in Turnstile settings.
* **Resolution Steps:**
  1. For local development, configure Cloudflare Turnstile dummy test keys (`1x00000000000000000000AA`).
  2. Verify environment keys match between server and client.

### Incident 3: SMS Outbox Failure (Phase 2)
* **Symptom:** Urgent advisory published, but citizen subscribers report non-receipt of SMS text messages.
* **Root Causes:**
  1. SMS gateway API balance depleted or provider rate-limit reached.
  2. Webhook delivery failure or invalid API key.
* **Resolution Steps:**
  1. Check `notifications` table for `status = 'failed'` and inspect `last_error`.
  2. The public web advisory ticker (`v_active_advisories`) remains the authoritative primary channel.
