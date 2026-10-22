# OWTA: Data Privacy & RA 10173 Compliance Specification
## Philippine Data Privacy Act of 2012 (RA 10173) Governance Framework

**Document Code:** OWTA-PRIV-V1  
**Classification:** Legal & Technical Compliance  
**Data Protection Officer (DPO) Jurisdiction:** City Government of Iloilo / OWTA Project  
**Applicable Regulations:** RA 10173, NPC Circulars 16-01, 16-03, 2022-01  
**Reference Documents:** `docs/CONTEXT.md`, `docs/DATA_MODEL.md`

---

## 1. Statutory Mandate & Privacy by Design

The **Open Water Transparency Architecture (OWTA)** operates as an open municipal water monitoring and transparency system. Because civic trust is paramount, OWTA enforces a strict **Privacy by Design and Default** architecture compliant with Republic Act No. 10173 (The Philippine Data Privacy Act of 2012) and National Privacy Commission (NPC) statutory standards.

### 1.1 Core Principles Adherence
1. **Transparency:** Citizens are informed at data capture of the precise operational purpose of telemetry or contact details, how records are handled, and the automated retention schedule.
2. **Legitimate Purpose:** Contact information is processed exclusively for verifying outage incidents, dispatching emergency relief tankers, and transmitting transactional resolution alerts. Data is never monetized, profiled, or used for political or promotional activities.
3. **Proportionality & Data Minimization:** The system functions fully anonymously by default. Outage reports do not require a citizen name, national ID, email, or telephone number.

---

## 2. Technical Privacy Safeguards

### 2.1 Rule `WR07`: Zero Public Exposure of Precise Coordinates and PII
* **Risk Mitigated:** Doxxing of reporting residents, targeting of vulnerable households, or surveillance of neighborhood water habits.
* **Architecture:**
  * Public endpoints (`/api/public/*`), vector tile feeds, and web map layers consume exclusively security-barrier views (`v_barangay_status`, `v_public_report_groups`).
  * Raw latitude and longitude captured during mobile report creation are **never emitted to public clients**.
  * The public views aggregated report counts per category per barangay via `v_public_report_groups`.
  * Public status tracking relies on an unguessable 8-character reference code (`reference_code`), returning only lifecycle status (`new`, `verified`, `dispatched`, `resolved`, `rejected`) without revealing citizen phone numbers or raw coordinates.

### 2.2 Rule `WR09`: Explicit Opt-In Consent for Contact Retention
* **Statutory Requirement:** Under RA 10173 Section 12, processing personal contact details requires freely given, specific, and informed consent.
* **Architecture:**
  * The report submission form displays an unchecked, mandatory consent toggle before any phone number can be captured:
    > *"I explicitly consent to the temporary storage of my Philippine mobile number for the sole purpose of receiving status updates regarding this water outage incident pursuant to RA 10173."*
  * Checkbox activation sets `consent_at = NOW()` in `citizen_reports`.
  * If the citizen does not provide consent, `contact_phone` is forced to `NULL` (enforced at both database check constraint `CHECK (contact_phone is null or consent_at is not null)` and Zod validation layers).
  * Direct access to contact numbers is restricted to authorized staff via RLS.

### 2.3 Salted Anti-Sybil Protection (`DEVICE_KEY_PEPPER`)
* To prevent denial-of-service and sybil attacks without storing invasive device identifiers (e.g., IMEI, MAC address, or canvas fingerprint strings), the Next.js edge runtime computes a salted cryptographic hash:
  $$\text{device\_hash} = \text{HMAC-SHA256}(\text{Client IP} + \text{User-Agent}, \text{DEVICE\_KEY\_PEPPER})$$
* Because `DEVICE_KEY_PEPPER` is a high-entropy secret kept strictly in server environment variables and never persisted to the client or database tables, reverse-engineering citizen identity from hashes is cryptographically infeasible.

---

## 3. Ephemeral Retention & Automated Purge (`pg_cron`)

Under Section 21 of RA 10173, personal data must only be retained for as long as necessary for the fulfillment of its declared purpose.

### 3.1 Retention and Scrubbing Protocol
* Individual citizen reports contain localized landmarks and optional contact numbers.
* After a report reaches a terminal state (`resolved` or `rejected`) and exceeds the retention duration (default 30 days), personal identifiers are irreversibly purged, while non-personal analytical counts (category, barangay ID, submission timestamp) are preserved for historical delivery index auditing.

### 3.2 Scheduled Worker Implementation
The automated purge runs nightly via `pg_cron` or scheduled edge worker:

```sql
-- Scheduled Nightly Worker for RA 10173 Compliance
create or replace function purge_expired_pii()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purged_count integer;
begin
  update citizen_reports
  set
    contact_phone = null,
    consent_at = null,
    landmark = '[REDACTED PURSUANT TO RA 10173]'
  where status in ('resolved', 'rejected')
    and created_at < now() - interval '30 days'
    and (contact_phone is not null or landmark != '[REDACTED PURSUANT TO RA 10173]');

  get diagnostics v_purged_count = row_count;

  -- Record purge event in the append-only audit log
  insert into audit_logs (
    actor_id,
    actor_role,
    action,
    entity,
    entity_id,
    after_state
  ) values (
    null,
    'system_cron',
    'PII_PURGE_AUTOMATED',
    'citizen_reports',
    'batch',
    jsonb_build_object('records_scrubbed', v_purged_count, 'retention_days', 30)
  );
end $$;
```

---

## 4. NPC Incident Response & Data Subject Rights

Pursuant to NPC Circular 16-03, citizens may exercise their statutory data subject rights:
- **Right to Object / Opt-Out:** Any SMS recipient texting `STOP` is immediately unsubscribed and flagged in `subscriptions.unsubscribed_at`.
- **Right to Access & Rectification:** Residents may inspect their own submitted reports via authenticated session (`reporter_id = auth.uid()`).
- **Data Protection Officer (DPO):** The OWTA project designates an official privacy contact in the application footer for data subject inquiries and complaints.
