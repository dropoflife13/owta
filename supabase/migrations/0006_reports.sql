-- =============================================================================
-- Migration: 0006_reports.sql
-- Description: Citizen incident reporting, anti-sybil clustering, and triage workflows
-- Tables: report_clusters, water_reports
-- Rules Enforced:
--   WR04: Anti-sybil & rate-limiting protection
--   WR05: Spatiotemporal duplicate grouping (200m / 3 hours)
--   WR06: Barangay official RLS boundary enforcement
--   WR07: Zero public exposure of precise coordinates and PII
--   WR09: Explicit opt-in consent for contact number retention
-- =============================================================================

-- 1. Custom Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_category') THEN
        CREATE TYPE public.report_category AS ENUM (
            'dry_tap',
            'low_pressure',
            'dirty_water',
            'pipe_burst'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE public.report_status AS ENUM (
            'submitted',
            'verified',
            'triaged',
            'dispatched',
            'resolved',
            'rejected'
        );
    END IF;
END $$;


-- 2. Report Clusters Table (Aggregates nearby incident reports within 200m / 3 hours)
CREATE TABLE IF NOT EXISTS public.report_clusters (
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

CREATE INDEX IF NOT EXISTS idx_report_clusters_barangay_id
    ON public.report_clusters(barangay_id);

CREATE INDEX IF NOT EXISTS idx_report_clusters_status
    ON public.report_clusters(status);

CREATE INDEX IF NOT EXISTS idx_report_clusters_center_gist
    ON public.report_clusters USING gist (cluster_center);


-- 3. Water Reports Table (Individual crowdsourced citizen submissions)
CREATE TABLE IF NOT EXISTS public.water_reports (
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

CREATE INDEX IF NOT EXISTS idx_water_reports_ticket_token
    ON public.water_reports(ticket_token);

CREATE INDEX IF NOT EXISTS idx_water_reports_cluster_id
    ON public.water_reports(cluster_id);

CREATE INDEX IF NOT EXISTS idx_water_reports_barangay_id
    ON public.water_reports(barangay_id);

CREATE INDEX IF NOT EXISTS idx_water_reports_status
    ON public.water_reports(status);

CREATE INDEX IF NOT EXISTS idx_water_reports_device_hash_time
    ON public.water_reports(device_hash, created_at DESC);


-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY & ACCESS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.report_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_reports ENABLE ROW LEVEL SECURITY;

-- Report Clusters: Public read of aggregated cluster statistics
CREATE POLICY "Public read on report_clusters"
    ON public.report_clusters FOR SELECT
    TO anon, authenticated
    USING (true);

-- Barangay officials can update clusters in their assigned barangay (Rule WR06)
CREATE POLICY "Barangay officials can update assigned clusters"
    ON public.report_clusters FOR UPDATE
    TO authenticated
    USING (
        public.app_role() = 'barangay_official'
        AND barangay_id = public.app_barangay()
    )
    WITH CHECK (
        public.app_role() = 'barangay_official'
        AND barangay_id = public.app_barangay()
    );

-- LGU dispatchers and Admins can update all clusters
CREATE POLICY "Dispatchers and admins can update clusters"
    ON public.report_clusters FOR UPDATE
    TO authenticated
    USING (public.app_role() IN ('lgu_dispatcher', 'admin'))
    WITH CHECK (public.app_role() IN ('lgu_dispatcher', 'admin'));

-- Water Reports (PII Protection - Rule WR07):
-- Anonymous users cannot SELECT directly from water_reports (must use ticket lookup RPC)
CREATE POLICY "Staff can view reports"
    ON public.water_reports FOR SELECT
    TO authenticated
    USING (
        public.app_role() = 'admin'
        OR public.app_role() = 'lgu_dispatcher'
        OR public.app_role() = 'auditor'
        OR (
            public.app_role() = 'barangay_official'
            AND barangay_id = public.app_barangay()
        )
    );

CREATE POLICY "Allow public insert of water_reports"
    ON public.water_reports FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Authorized staff can update water_reports"
    ON public.water_reports FOR UPDATE
    TO authenticated
    USING (
        public.app_role() IN ('admin', 'lgu_dispatcher')
        OR (
            public.app_role() = 'barangay_official'
            AND barangay_id = public.app_barangay()
        )
    )
    WITH CHECK (
        public.app_role() IN ('admin', 'lgu_dispatcher')
        OR (
            public.app_role() = 'barangay_official'
            AND barangay_id = public.app_barangay()
        )
    );

