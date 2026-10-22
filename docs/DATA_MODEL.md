# OWTA: Data Model Specification
## PostgreSQL 15+ Schema, PostGIS Spatial Extensions, and RLS Governance

**Document Code:** OWTA-DATA-V1  
**Classification:** Core Database Specification  
**Status:** Approved & Applied (Migrations 0001 through 0009)  
**Database Engine:** PostgreSQL 15+ with `postgis`, `btree_gist`, and `pg_trgm` extensions on Supabase.  
**Reference Documents:** `docs/CONTEXT.md`, `docs/METHODOLOGY.md`, `docs/ENGINEERING.md`, `AGENTS.md`

---

## 1. Architectural Conventions

1. **Derive, Do Not Store:** Status (`flowing`, `low_pressure`, `dry`, `unknown`), dry hours elapsed, and Delivery Index scores are computed dynamically from timestamped telemetry and schedules. They are never added as static table columns.
2. **Timestamptz Canonical Standard:** All temporal columns use `timestamptz` stored in UTC. The UI exclusively renders timestamps in `Asia/Manila` (PHT, UTC+8).
3. **Row-Level Security (RLS) on Every Table:** RLS is enabled on every table. Roles originate from server-verified `profiles.role` via `public.app_role()`. UI visibility is never authorization.
4. **Public Exposure Through Security-Invoker Views:** Public clients consume security-barrier views (`v_public_barangay_status`, `v_public_water_index`, `v_active_advisories`) with zero direct exposure of citizen coordinates or contact numbers (**Rule WR07**).
5. **Numbered SQL Migrations:** All schema alterations are versioned in `supabase/migrations/` (`0001` through `0009`). Applied migrations are never edited in-place.

---

## 2. Entity Relationship Overview

| Domain | Tables | Primary Purpose |
|---|---|---|
| **Geography** | `districts`, `barangays`, `dma_zones`, `barangay_dma` | Spatial boundaries, multi-DMA coverage mapping |
| **Identity & Access** | `profiles` (extends `auth.users`) | Server-verified roles, assigned barangay scoping |
| **Telemetry & Supply** | `monitoring_points`, `water_schedules`, `pressure_readings`, `supply_advisories` | Hydraulic pressure logs, non-overlapping rotational schedules (**WR01**) |
| **Methodology & Index** | `methodology_parameters`, `weekly_delivery_indices` | Versioned parameters, 15-min epoch Delivery Index snapshots (**WR04, WR12**) |
| **Citizen Reports** | `report_clusters`, `water_reports` | Spatiotemporal clustering within 200m/3h (**WR05**), anonymous ticket tracking (**WR07**) |
| **Relief & Fleet** | `relief_requests`, `relief_dispatches` | Evidence-based triage ($\ge 48\text{h}$) (**WR06, WR10**), closed-loop verification (**WR11**) |
| **Alerts (Phase 2)** | `sms_subscriptions`, `sms_delivery_logs` | Ephemeral contact storage with RA 10173 consent (**WR09**) |
| **Governance & Audit** | `audit_logs` | Immutable, append-only staff state modification logs (**WR08**) |

---

## 3. Schema Definitions by Migration

### 3.1 Migration `0001_extensions.sql` & `0002_geography.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.barangays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    boundary geometry(MultiPolygon, 4326),
    centroid geometry(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_barangays_boundary_gist ON public.barangays USING gist (boundary);
CREATE INDEX idx_barangays_centroid_gist ON public.barangays USING gist (centroid);

CREATE TABLE public.dma_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    boundary geometry(MultiPolygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dma_zones_boundary_gist ON public.dma_zones USING gist (boundary);

CREATE TABLE public.barangay_dma (
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    coverage_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (coverage_pct > 0.00 AND coverage_pct <= 100.00),
    PRIMARY KEY (barangay_id, dma_zone_id)
);
```

### 3.2 Migration `0003_identity.sql`: Role-Based Access Control

```sql
CREATE TYPE public.app_role AS ENUM (
    'resident',
    'barangay_official',
    'lgu_dispatcher',
    'utility_operator',
    'admin',
    'auditor'
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'resident',
    first_name TEXT,
    last_name TEXT,
    mobile_number TEXT,
    assigned_barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security helper functions
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE AND is_verified = TRUE),
        'resident'::public.app_role
    );
$$;

CREATE OR REPLACE FUNCTION public.app_barangay()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT assigned_barangay_id FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE AND is_verified = TRUE;
$$;
```

### 3.3 Migration `0004_monitoring_supply.sql`: Schedules & Telemetry

```sql
CREATE TABLE public.monitoring_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location geometry(Point, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_monitoring_points_location_gist ON public.monitoring_points USING gist (location);

-- Rotational Water Supply Schedules Table (Rule WR01: Non-Overlapping Windows)
CREATE TABLE public.water_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    superseded_at TIMESTAMPTZ,
    superseded_by_id UUID REFERENCES public.water_schedules(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_schedule_window_chronology CHECK (window_end > window_start)
);
CREATE INDEX idx_water_schedules_active_lookup ON public.water_schedules(dma_zone_id, window_start, window_end)
    WHERE superseded_at IS NULL;

-- Hydraulic Pressure Telemetry Table (Rule WR03, WR12)
CREATE TABLE public.pressure_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_point_id UUID REFERENCES public.monitoring_points(id) ON DELETE SET NULL,
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    pressure_psi NUMERIC(4,2) NOT NULL CHECK (pressure_psi >= 0.0 AND pressure_psi <= 25.0),
    source TEXT NOT NULL CHECK (source IN ('manual', 'sensor', 'simulated')),
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.supply_advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('advisory', 'warning', 'critical')),
    dma_zone_id UUID REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Migration `0005_methodology_index.sql`: Mathematical Calculation Engine

```sql
CREATE TABLE public.methodology_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    min_pressure_threshold NUMERIC(4,2) NOT NULL DEFAULT 7.00,
    min_coverage_floor NUMERIC(4,2) NOT NULL DEFAULT 0.70,
    epoch_minutes INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.weekly_delivery_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    evaluation_start TIMESTAMPTZ NOT NULL,
    evaluation_end TIMESTAMPTZ NOT NULL,
    promised_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    delivered_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    coverage_ratio NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    delivery_index_score NUMERIC(5,2),
    status_tier TEXT NOT NULL CHECK (status_tier IN (
        'EXEMPLARY',
        'SATISFACTORY',
        'DEGRADED',
        'CRITICAL_DEFICIT',
        'DATA_DEFICIENT',
        'NO_SCHEDULED_HOURS'
    )),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dma_weekly_evaluation UNIQUE (dma_zone_id, evaluation_start, evaluation_end)
);
```

### 3.5 Migration `0006_reports.sql`: Citizen Reports & Clustering (WR05, WR07)

```sql
CREATE TYPE public.report_category AS ENUM (
    'dry_tap',
    'low_pressure',
    'dirty_water',
    'pipe_burst'
);

CREATE TYPE public.report_status AS ENUM (
    'submitted',
    'verified',
    'triaged',
    'dispatched',
    'resolved',
    'rejected'
);

CREATE TABLE public.report_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE RESTRICT,
    category public.report_category NOT NULL,
    status public.report_status NOT NULL DEFAULT 'submitted',
    cluster_center geometry(Point, 4326) NOT NULL,
    report_count INT NOT NULL DEFAULT 1,
    first_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ
);
CREATE INDEX idx_report_clusters_center_gist ON public.report_clusters USING gist (cluster_center);

CREATE TABLE public.water_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_token TEXT NOT NULL UNIQUE,
    cluster_id UUID REFERENCES public.report_clusters(id) ON DELETE SET NULL,
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE RESTRICT,
    category public.report_category NOT NULL,
    description TEXT,
    landmark TEXT,
    coordinates geometry(Point, 4326),
    device_hash TEXT NOT NULL,
    contact_number_encrypted TEXT,
    consent_at TIMESTAMPTZ,
    status public.report_status NOT NULL DEFAULT 'submitted',
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_water_reports_ticket_token ON public.water_reports(ticket_token);
```

### 3.6 Migration `0007_relief_alerts.sql`: Relief Matrix & Tanker Fleet

```sql
CREATE TABLE public.relief_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES public.report_clusters(id) ON DELETE SET NULL,
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE RESTRICT,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    urgency TEXT NOT NULL DEFAULT 'standard' CHECK (urgency IN ('standard', 'elevated', 'critical')),
    consecutive_dry_hours NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dispatched', 'fulfilled', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Water Relief Dispatches Table (Rule WR11: Closed-Loop Verification)
CREATE TABLE public.relief_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.relief_requests(id) ON DELETE SET NULL,
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE RESTRICT,
    tanker_plate_number TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    capacity_liters INT NOT NULL DEFAULT 10000,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_transit', 'on_site', 'completed', 'cancelled')),
    recipient_acknowledgment TEXT,
    dispatched_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sms_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_encrypted TEXT NOT NULL,
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
);

CREATE TABLE public.sms_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.sms_subscriptions(id) ON DELETE SET NULL,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.7 Migration `0008_governance_audit.sql`: Append-Only Audit Trail (WR08)

```sql
CREATE TABLE public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_state JSONB,
    new_state JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Block all UPDATE or DELETE operations on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are immutable and append-only (Rule WR08).';
END;
$$;

CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();
```

---

## 4. Public Views & Security-Invoker Endpoints (`0009_views_and_rls.sql`)

### 4.1 View 1: `v_public_barangay_status`
Aggregates live pressure, active incident clusters, published schedule windows, and active advisories per barangay.
Exposes zero PII and zero coordinates.

### 4.2 View 2: `v_public_water_index`
Displays weekly promised supply hours, delivered hours ($\ge 7\text{ PSI}$), coverage ratio, and Delivery Index score per DMA.
Suppresses index score when coverage $< 70\%$ (**Rule WR04**).

### 4.3 View 3: `v_active_advisories`
Filters currently active advisories across city, district, DMA, and barangay scopes.

### 4.4 View 4: `v_relief_priority_queue`
Ranks barangays suffering from verified continuous dry taps ordered strictly by dry hours descending (**Rule WR06 & WR10**).
Categorizes into `CRITICAL_48H_PRIORITY` ($\ge 48\text{h}$) and `ELEVATED_RELIEF` ($\ge 24\text{h}$).

---

## 5. Stored Procedures (RPCs)

### 5.1 `submit_report()`
Handles citizen report submissions:
- Checks rate limits via client `device_hash` (max 5 reports per 30 minutes).
- Calculates geographic proximity to active clusters within 200 meters and 3 hours using PostGIS `ST_DWithin`.
- Automatically joins existing cluster or creates a new cluster.
- Generates unguessable 8-character `ticket_token` (e.g. `A9F3E1B2`).
- Returns `{ ok: true, ticket_token, cluster_id, is_new_cluster }`.

### 5.2 `get_ticket_status()`
Allows anonymous citizen tracking using `p_ticket_token`:
- Returns `{ ok: true, ticket_token, category, landmark, status, created_at, verified_at }`.
- Redacts raw coordinates, citizen phone number, and device hash (**Rule WR07**).
