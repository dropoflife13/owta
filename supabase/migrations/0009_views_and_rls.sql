-- =============================================================================
-- Migration: 0009_views_and_rls.sql
-- Description: Derived views, public report ingestion RPC, and final RLS enforcements
-- Views: v_public_barangay_status, v_public_water_index, v_active_advisories, v_relief_priority_queue
-- Functions: submit_report(), get_ticket_status()
-- Rules Enforced:
--   WR04: Report rate-limiting (3 per device_hash / 60 minutes)
--   WR05: Spatiotemporal duplicate clustering (200m / 3 hours)
--   WR07: Zero public exposure of coordinates or PII in views
--   WR09: Explicit opt-in consent for contact retention
--   WR10: 48-Hour continuous dry zone relief priority
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DERIVED PUBLIC VIEWS (WITH security_invoker = true per Postgres 15+ best practice)
-- -----------------------------------------------------------------------------

-- View 1: Public Barangay Status Board (Zero PII, Zero Exact Coordinates)
CREATE OR REPLACE VIEW public.v_public_barangay_status
WITH (security_invoker = true)
AS
SELECT
    b.id AS barangay_id,
    b.code AS barangay_code,
    b.name AS barangay_name,
    d.name AS district_name,
    COALESCE(
        (
            SELECT s.window_end
            FROM public.water_schedules s
            JOIN public.barangay_dma bd ON bd.dma_zone_id = s.dma_zone_id
            WHERE bd.barangay_id = b.id
              AND s.superseded_at IS NULL
              AND s.window_start <= NOW()
              AND s.window_end > NOW()
            ORDER BY s.window_end DESC
            LIMIT 1
        ),
        NULL
    ) AS current_window_end,
    COALESCE(
        (
            SELECT s.window_start
            FROM public.water_schedules s
            JOIN public.barangay_dma bd ON bd.dma_zone_id = s.dma_zone_id
            WHERE bd.barangay_id = b.id
              AND s.superseded_at IS NULL
              AND s.window_start > NOW()
            ORDER BY s.window_start ASC
            LIMIT 1
        ),
        NULL
    ) AS next_window_start,
    (
        SELECT COUNT(*)
        FROM public.report_clusters rc
        WHERE rc.barangay_id = b.id
          AND rc.status IN ('submitted', 'verified', 'triaged', 'dispatched')
    ) AS active_incident_clusters,
    (
        SELECT COUNT(*)
        FROM public.supply_advisories sa
        WHERE sa.is_active IS TRUE
          AND (b.id = ANY(sa.affected_barangays) OR sa.affected_barangays = '{}')
          AND sa.valid_from <= NOW()
          AND (sa.valid_to IS NULL OR sa.valid_to >= NOW())
    ) AS active_advisory_count,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.report_clusters rc
            WHERE rc.barangay_id = b.id
              AND rc.category = 'dry_tap'
              AND rc.status IN ('verified', 'dispatched')
              AND rc.first_reported_at <= NOW() - INTERVAL '48 hours'
        ) THEN 'CRITICAL_DRY'
        WHEN EXISTS (
            SELECT 1 FROM public.water_schedules s
            JOIN public.barangay_dma bd ON bd.dma_zone_id = s.dma_zone_id
            WHERE bd.barangay_id = b.id
              AND s.superseded_at IS NULL
              AND s.window_start <= NOW()
              AND s.window_end > NOW()
        ) THEN 'SCHEDULED_SUPPLY'
        WHEN EXISTS (
            SELECT 1 FROM public.report_clusters rc
            WHERE rc.barangay_id = b.id
              AND rc.status IN ('submitted', 'verified')
        ) THEN 'DEGRADED_PRESSURE'
        ELSE 'NORMAL_STANDBY'
    END AS current_status
FROM public.barangays b
JOIN public.districts d ON d.id = b.district_id;


-- View 2: Public Water Delivery Index History
CREATE OR REPLACE VIEW public.v_public_water_index
WITH (security_invoker = true)
AS
SELECT
    w.id AS index_id,
    w.dma_zone_id,
    dz.code AS dma_code,
    dz.name AS dma_name,
    w.evaluation_start,
    w.evaluation_end,
    w.promised_hours,
    w.delivered_hours,
    w.coverage_ratio,
    w.delivery_index_score,
    w.status_tier,
    w.calculated_at
FROM public.weekly_delivery_indices w
JOIN public.dma_zones dz ON dz.id = w.dma_zone_id
ORDER BY w.evaluation_start DESC;


-- View 3: Active Supply Advisories
CREATE OR REPLACE VIEW public.v_active_advisories
WITH (security_invoker = true)
AS
SELECT
    id,
    title,
    severity,
    description,
    affected_dmas,
    affected_barangays,
    valid_from,
    valid_to,
    created_at
FROM public.supply_advisories
WHERE is_active IS TRUE
  AND valid_from <= NOW()
  AND (valid_to IS NULL OR valid_to >= NOW())
ORDER BY
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'warning' THEN 2
        ELSE 3
    END,
    valid_from DESC;


-- View 4: LGU Relief Priority Queue (Rule WR10: 48-Hour Dry Zone Elevation)
CREATE OR REPLACE VIEW public.v_relief_priority_queue
WITH (security_invoker = true)
AS
SELECT
    rc.id AS cluster_id,
    rc.barangay_id,
    b.name AS barangay_name,
    d.name AS district_name,
    rc.category,
    rc.status,
    rc.report_count,
    rc.first_reported_at,
    rc.last_reported_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - rc.first_reported_at)) / 3600.0, 1) AS dry_hours_elapsed,
    CASE
        WHEN rc.category = 'dry_tap' AND rc.first_reported_at <= NOW() - INTERVAL '48 hours'
            THEN 'CRITICAL_48H_PRIORITY'
        WHEN rc.category = 'dry_tap' AND rc.first_reported_at <= NOW() - INTERVAL '24 hours'
            THEN 'ELEVATED_RELIEF'
        ELSE 'STANDARD_QUEUE'
    END AS relief_priority_tier
FROM public.report_clusters rc
JOIN public.barangays b ON b.id = rc.barangay_id
JOIN public.districts d ON d.id = b.district_id
WHERE rc.status IN ('submitted', 'verified', 'triaged')
ORDER BY
    CASE
        WHEN rc.category = 'dry_tap' AND rc.first_reported_at <= NOW() - INTERVAL '48 hours' THEN 1
        WHEN rc.category = 'dry_tap' AND rc.first_reported_at <= NOW() - INTERVAL '24 hours' THEN 2
        ELSE 3
    END,
    rc.first_reported_at ASC;


-- -----------------------------------------------------------------------------
-- 2. REPORT SUBMISSION RPC: submit_report()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_report(
    p_barangay_id UUID,
    p_category public.report_category,
    p_description TEXT DEFAULT NULL,
    p_landmark TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_device_hash TEXT DEFAULT 'ANON_CLIENT',
    p_contact_number TEXT DEFAULT NULL,
    p_consent BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_reports_count INT := 0;
    v_report_point geometry(Point, 4326) := NULL;
    v_cluster_id UUID := NULL;
    v_ticket_token TEXT;
    v_consent_time TIMESTAMPTZ := NULL;
    v_contact_encrypted TEXT := NULL;
BEGIN
    -- 1. Anti-Sybil Rate Limit Check (Rule WR04: Max 3 reports per device_hash / 60 mins)
    SELECT COUNT(*)
    INTO v_recent_reports_count
    FROM public.water_reports
    WHERE device_hash = p_device_hash
      AND created_at >= NOW() - INTERVAL '60 minutes';

    IF v_recent_reports_count >= 3 THEN
        RAISE EXCEPTION 'Rate Limit Exceeded (Rule WR04): Maximum 3 reports per hour per device.';
    END IF;

    -- 2. Resolve Geolocation Point
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        v_report_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
    ELSE
        -- Fallback to barangay centroid if client coordinates are omitted
        SELECT centroid INTO v_report_point
        FROM public.barangays
        WHERE id = p_barangay_id;
    END IF;

    -- 3. Spatiotemporal Duplicate Clustering (Rule WR05: 200m radius and 3-hour window)
    SELECT id INTO v_cluster_id
    FROM public.report_clusters
    WHERE barangay_id = p_barangay_id
      AND category = p_category
      AND status IN ('submitted', 'verified', 'triaged')
      AND last_reported_at >= NOW() - INTERVAL '3 hours'
      AND (
          v_report_point IS NULL
          OR ST_DWithin(cluster_center::geography, v_report_point::geography, 200.0)
      )
    ORDER BY last_reported_at DESC
    LIMIT 1;

    IF v_cluster_id IS NOT NULL THEN
        -- Increment existing cluster
        UPDATE public.report_clusters
        SET
            report_count = report_count + 1,
            last_reported_at = NOW()
        WHERE id = v_cluster_id;
    ELSE
        -- Create new cluster
        INSERT INTO public.report_clusters (
            barangay_id,
            category,
            status,
            cluster_center,
            report_count,
            first_reported_at,
            last_reported_at
        )
        VALUES (
            p_barangay_id,
            p_category,
            'submitted',
            COALESCE(v_report_point, ST_SetSRID(ST_MakePoint(122.5476, 10.7161), 4326)),
            1,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_cluster_id;
    END IF;

    -- 4. Process Contact Information & Privacy Consent (Rule WR09)
    IF p_consent IS TRUE AND p_contact_number IS NOT NULL AND TRIM(p_contact_number) != '' THEN
        v_consent_time := NOW();
        v_contact_encrypted := encode(pgp_sym_encrypt(TRIM(p_contact_number), p_device_hash), 'hex');
    END IF;

    -- 5. Generate Secure Alphanumeric Ticket Token (e.g. OWTA-X7B29M)
    v_ticket_token := 'OWTA-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

    -- 6. Insert Water Report Record
    INSERT INTO public.water_reports (
        ticket_token,
        cluster_id,
        barangay_id,
        category,
        description,
        landmark,
        coordinates,
        device_hash,
        contact_number_encrypted,
        consent_at,
        status,
        created_at,
        updated_at
    )
    VALUES (
        v_ticket_token,
        v_cluster_id,
        p_barangay_id,
        p_category,
        p_description,
        p_landmark,
        v_report_point,
        p_device_hash,
        v_contact_encrypted,
        v_consent_time,
        'submitted',
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'ticket_token', v_ticket_token,
        'cluster_id', v_cluster_id,
        'status', 'submitted',
        'message', 'Incident report registered and clustered successfully.'
    );
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. TICKET LOOKUP RPC: get_ticket_status() (Zero PII Exposure - Rule WR07)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ticket_status(p_ticket_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report RECORD;
BEGIN
    SELECT
        r.ticket_token,
        r.category,
        r.status,
        r.created_at,
        r.updated_at,
        b.name AS barangay_name,
        d.name AS district_name
    INTO v_report
    FROM public.water_reports r
    JOIN public.barangays b ON b.id = r.barangay_id
    JOIN public.districts d ON d.id = b.district_id
    WHERE r.ticket_token = TRIM(p_ticket_token);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false, 'message', 'Ticket not found.');
    END IF;

    -- Returns strictly operational status without coordinates, phone number, or landmark
    RETURN jsonb_build_object(
        'found', true,
        'ticket_token', v_report.ticket_token,
        'barangay', v_report.barangay_name,
        'district', v_report.district_name,
        'category', v_report.category,
        'status', v_report.status,
        'submitted_at', v_report.created_at,
        'last_updated', v_report.updated_at
    );
END;
$$;

-- Grant execute permissions for public RPCs
GRANT EXECUTE ON FUNCTION public.submit_report TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ticket_status TO anon, authenticated;

