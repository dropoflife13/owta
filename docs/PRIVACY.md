# OWTA: Data Privacy & RA 10173 Compliance Specification
## Philippine Data Privacy Act of 2012 (RA 10173) Governance Framework

**Document Code:** OWTA-PRIV-V1  
**Classification:** Legal & Technical Compliance  
**Data Protection Officer (DPO) Jurisdiction:** City Government of Iloilo / OWTA Project  
**Applicable Regulations:** RA 10173, NPC Circulars 16-01, 16-03, 2022-01

---

## 1. Statutory Mandate & Privacy by Design

The **Iloilo Water Transparency Tracker (OWTA)** is an open government data and municipal monitoring system. Because public trust is essential for crowdsourced civic monitoring, OWTA enforces a strict **Privacy by Design and Default** architecture compliant with Republic Act No. 10173 (The Data Privacy Act of 2012) and National Privacy Commission (NPC) statutory standards.

### 1.1 Core Principles Adherence
1. **Transparency:** Citizens are informed at the exact point of data collection regarding why telemetry or contact information is gathered, how it is processed, and when it is purged.
2. **Legitimate Purpose:** Personal data is processed exclusively for verifying water outage incidents, dispatching emergency relief tankers, and transmitting transactional service alerts. It is strictly never monetized, cross-profiled, or used for political campaigning.
3. **Proportionality & Data Minimization:** The system functions fully anonymously by default. Citizens can submit outage reports without providing a name, national ID, email, or telephone number.

---

## 2. Technical Privacy Safeguards

### 2.1 Rule `WR07`: Zero Public Exposure of Precise Coordinates and PII
* **Vulnerability Mitigated:** Doxxing of complaining citizens, targeting of vulnerable households, or surveillance of water consumption habits.
* **Mechanism:**
  * Public endpoints (`/api/public/*`), GeoJSON vector feeds, and public map layers consume the security-barrier view `v_public_barangay_status`.
  * Exact latitude and longitude submitted during mobile report creation are **never emitted to public clients**.
  * Incident markers on the public map are mathematically snapped to the centroid of the parent Barangay or blurred to a 100-meter randomized grid.
  * Public ticket lookups require the exact unguessable alphanumeric ticket token (`ticket_token`), returning only ticket lifecycle status (`VERIFIED`, `DISPATCHED`, `RESOLVED`) without revealing landmark text or citizen identity.

### 2.2 Rule `WR09`: Explicit Opt-In Consent for Contact Retention
* **Statutory Requirement:** Under RA 10173 Section 12 (Criteria for Lawful Processing of Personal Information), processing of contact details requires freely given, specific, and informed consent.
* **Mechanism:**
  * The report submission interface renders an unchecked, mandatory consent toggle before any phone number field can be activated:
    > *"I explicitly consent to the temporary storage of my Philippine mobile number for the sole purpose of receiving status updates regarding this water outage incident pursuant to RA 10173."*
  * The exact timestamp of consent is captured in `water_reports.consent_at`.
  * If the citizen leaves the box unchecked or omits the phone number, the field is stored as `NULL`.
  * Phone numbers are encrypted at rest using AES-256 (`pgcrypto` symmetric key) and accessible only to authorized dispatchers and barangay officials with an active operational need.

### 2.3 Salted Anti-Sybil Fingerprinting (`DEVICE_KEY_PEPPER`)
* To prevent rate-limit evasion and sybil attacks without storing invasive device identifiers (e.g., IMEI, MAC address, or canvas fingerprint strings), the Next.js server derives a cryptographic one-way hash:
  $$\text{device\_hash} = \text{HMAC-SHA256}(\text{Client IP} + \text{User-Agent}, \text{DEVICE\_KEY\_PEPPER})$$
* Because `DEVICE_KEY_PEPPER` is a high-entropy secret stored exclusively in server environment variables and never written to the client or database, reverse-engineering client identity from `device_hash` is cryptographically infeasible.

---

## 3. Ephemeral Retention & Automated Purge (`pg_cron`)

Under Section 21 of RA 10173, personal data must only be retained for as long as necessary for the fulfillment of its declared purpose.

### 3.1 The 30-Day Automated Scrubbing Protocol
* Individual water reports contain potentially identifiable information (contact numbers, specific localized landmarks).
* Once an incident report reaches a terminal state (`RESOLVED` or `REJECTED`), an automated countdown begins.
* After **30 days** in a terminal state, personal identifiers are permanently and irreversibly purged from the database, while anonymized analytical data (category, barangay ID, submission timestamp, duration) is preserved for historical delivery index calculations.

### 3.2 Scheduled Worker Implementation

The automated purge runs nightly at 03:00 AM PHT via PostgreSQL `pg_cron`:

```sql
-- Scheduled Nightly Worker for RA 10173 Compliance
CREATE OR REPLACE FUNCTION purge_expired_pii()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_purged_count INT;
BEGIN
    UPDATE water_reports
    SET
        contact_number_encrypted = NULL,
        landmark = '[REDACTED PURSUANT TO RA 10173]',
        device_hash = 'PURGED',
        updated_at = NOW()
    WHERE status IN ('resolved', 'rejected')
      AND updated_at < NOW() - INTERVAL '30 days'
      AND (contact_number_encrypted IS NOT NULL OR landmark != '[REDACTED PURSUANT TO RA 10173]');

    GET DIAGNOSTICS v_purged_count = ROW_COUNT;

    -- Record event in the append-only audit log
    INSERT INTO audit_logs (
        actor_role,
        action,
        target_table,
        record_id,
        new_state,
        ip_hash,
        created_at
    ) VALUES (
        'admin',
        'PII_PURGE_AUTOMATED',
        'water_reports',
        gen_random_uuid(),
        jsonb_build_object('records_scrubbed', v_purged_count, 'retention_days', 30),
        '127.0.0.1',
        NOW()
    );
END;
$$;

-- Register job with pg_cron: Runs every day at 03:00 AM PHT (19:00 UTC)
SELECT cron.schedule('ra10173_nightly_pii_purge', '0 19 * * *', 'SELECT purge_expired_pii()');
```

---

## 4. Data Subject Rights Management

Pursuant to Chapter IV of RA 10173, citizens who provide contact data possess non-derogable rights:

| Data Subject Right | Statutory Clause | OWTA Implementation Mechanism |
| :--- | :--- | :--- |
| **Right to be Informed** | Section 16(a) | Transparent Privacy Notice rendered directly on the `/report` and `/subscriptions` views prior to data capture. |
| **Right to Access** | Section 16(b) | Citizens can inspect the status and details of their active report using their unique `ticket_token` at `/report/track`. |
| **Right to Rectification** | Section 16(c) | Subscribed citizens can update their alert barangay or contact number via SMS OTP re-verification. |
| **Right to Erasure / Blocking** | Section 16(e) | Self-service deletion: Submitting `DELETE /api/subscriptions` or texting `STOP` immediately purges the SMS record from the database. |
| **Right to Damages** | Section 16(f) | System audit trails (`audit_logs`) provide forensic verification for administrative or judicial inquiries. |

---

## 5. Security & Breach Management Protocol

### 5.1 Technical Safeguards
1. **Encryption in Transit:** All traffic enforces TLS 1.3 with strict HTTP Strict Transport Security (`HSTS`, `max-age=63072000; includeSubDomains; preload`).
2. **Encryption at Rest:** Supabase storage volumes and database tables are encrypted with AES-256. Sensitive columns use application-layer `pgcrypto`.
3. **Strict Column-Level Security:** Database roles and service keys are isolated. Browser clients only access `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side Edge APIs.

### 5.2 Mandatory NPC Data Breach Notification
In the event of a security incident involving unauthorized acquisition of sensitive personal information:
* The Data Protection Officer shall notify the **National Privacy Commission (NPC)** and affected data subjects within **72 hours** of breach confirmation, as mandated by NPC Circular 16-03.
* The immutable `audit_logs` table shall serve as the primary cryptographic artifact for root-cause analysis and forensic determination.

