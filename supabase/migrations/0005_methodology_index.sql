-- =============================================================================
-- Migration: 0005_methodology_index.sql
-- Description: Mathematical parameter configuration and weekly Delivery Index scores
-- Tables: methodology_parameters, weekly_delivery_indices
-- Functions: compute_weekly_delivery_index()
-- Rules Enforced:
--   WR03: Physical pressure bounds
--   WR12: Strict exclusion of simulated readings from index calculations
-- =============================================================================

-- 1. Versioned Methodology Parameters Table
CREATE TABLE IF NOT EXISTS public.methodology_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    min_pressure_threshold NUMERIC(4,2) NOT NULL DEFAULT 7.00,
    min_coverage_floor NUMERIC(4,2) NOT NULL DEFAULT 0.70,
    epoch_minutes INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial standard methodology parameters (v1.0)
INSERT INTO public.methodology_parameters (version, min_pressure_threshold, min_coverage_floor, epoch_minutes, is_active)
VALUES ('v1.0', 7.00, 0.70, 15, TRUE)
ON CONFLICT (version) DO NOTHING;


-- 2. Weekly Delivery Indices Table
CREATE TABLE IF NOT EXISTS public.weekly_delivery_indices (
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

CREATE INDEX IF NOT EXISTS idx_weekly_delivery_indices_dma_date
    ON public.weekly_delivery_indices(dma_zone_id, evaluation_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_delivery_indices_barangay
    ON public.weekly_delivery_indices(barangay_id);


-- -----------------------------------------------------------------------------
-- 3. CALCULATION ENGINE: compute_weekly_delivery_index()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_weekly_delivery_index(
    p_dma_zone_id UUID,
    p_window_start TIMESTAMPTZ,
    p_window_end TIMESTAMPTZ
)
RETURNS TABLE (
    promised_hours NUMERIC,
    delivered_hours NUMERIC,
    coverage_ratio NUMERIC,
    delivery_index_score NUMERIC,
    status_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_promised_hours NUMERIC := 0;
    v_delivered_hours NUMERIC := 0;
    v_total_promised_epochs INT := 0;
    v_observed_epochs INT := 0;
    v_coverage NUMERIC := 0;
    v_score NUMERIC := NULL;
    v_tier TEXT := 'DATA_DEFICIENT';
    v_min_coverage NUMERIC := 0.70;
    v_pressure_floor NUMERIC := 7.00;
    v_epoch_mins INT := 15;
    v_epoch_fraction NUMERIC := 0.25;
BEGIN
    -- Ingest active parameters
    SELECT min_pressure_threshold, min_coverage_floor, epoch_minutes
    INTO v_pressure_floor, v_min_coverage, v_epoch_mins
    FROM public.methodology_parameters
    WHERE is_active IS TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    v_epoch_fraction := v_epoch_mins / 60.0;

    -- 1. Promised Hours from active, non-superseded schedules
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
            LEAST(window_end, p_window_end) - GREATEST(window_start, p_window_start)
        )) / 3600.0
    ), 0)
    INTO v_promised_hours
    FROM public.water_schedules
    WHERE dma_zone_id = p_dma_zone_id
      AND superseded_at IS NULL
      AND window_start < p_window_end
      AND window_end > p_window_start;

    IF v_promised_hours = 0 THEN
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 1.0::NUMERIC, NULL::NUMERIC, 'NO_SCHEDULED_HOURS'::TEXT;
        RETURN;
    END IF;

    v_total_promised_epochs := GREATEST(1, ROUND(v_promised_hours / v_epoch_fraction));

    -- 2. Aggregate 15-minute epochs during promised supply windows
    WITH valid_epochs AS (
        SELECT
            date_bin((v_epoch_mins || ' minutes')::interval, r.recorded_at, p_window_start) AS epoch_bucket,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.pressure_psi) AS median_pressure
        FROM public.pressure_readings r
        JOIN public.water_schedules s
          ON s.dma_zone_id = r.dma_zone_id
         AND s.superseded_at IS NULL
         AND r.recorded_at >= s.window_start
         AND r.recorded_at < s.window_end
        WHERE r.dma_zone_id = p_dma_zone_id
          AND r.is_simulated IS FALSE -- Rule WR12
          AND r.pressure_psi BETWEEN 0.0 AND 25.0 -- Rule WR03
          AND r.recorded_at >= p_window_start
          AND r.recorded_at < p_window_end
        GROUP BY 1
    )
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE median_pressure >= v_pressure_floor)
    INTO v_observed_epochs, v_delivered_hours
    FROM valid_epochs;

    v_delivered_hours := v_delivered_hours * v_epoch_fraction;
    v_coverage := ROUND((v_observed_epochs::NUMERIC / v_total_promised_epochs::NUMERIC), 4);

    -- 3. Check Minimum Coverage Floor
    IF v_coverage < v_min_coverage THEN
        RETURN QUERY SELECT v_promised_hours, v_delivered_hours, v_coverage, NULL::NUMERIC, 'DATA_DEFICIENT'::TEXT;
        RETURN;
    END IF;

    -- 4. Calculate Final Delivery Index Score
    v_score := ROUND(LEAST(1.0, (v_delivered_hours / NULLIF(v_promised_hours, 0))) * 100.0, 2);

    -- 5. Qualitative Tier Banding
    IF v_score >= 90.0 THEN v_tier := 'EXEMPLARY';
    ELSIF v_score >= 75.0 THEN v_tier := 'SATISFACTORY';
    ELSIF v_score >= 50.0 THEN v_tier := 'DEGRADED';
    ELSE v_tier := 'CRITICAL_DEFICIT';
    END IF;

    RETURN QUERY SELECT v_promised_hours, v_delivered_hours, v_coverage, v_score, v_tier;
END;
$$;


-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY & ACCESS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.methodology_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_delivery_indices ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public read on methodology_parameters"
    ON public.methodology_parameters FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on weekly_delivery_indices"
    ON public.weekly_delivery_indices FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin Mutation Policies
CREATE POLICY "Admins can manage methodology parameters"
    ON public.methodology_parameters FOR ALL
    TO authenticated
    USING (public.app_role() = 'admin')
    WITH CHECK (public.app_role() = 'admin');

CREATE POLICY "Admins can write delivery indices"
    ON public.weekly_delivery_indices FOR ALL
    TO authenticated
    USING (public.app_role() = 'admin')
    WITH CHECK (public.app_role() = 'admin');
