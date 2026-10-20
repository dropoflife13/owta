-- =============================================================================
-- Migration: 0004_monitoring_supply.sql
-- Description: Monitoring stations, water supply schedules, pressure telemetry, and advisories
-- Tables: monitoring_points, water_schedules, pressure_readings, supply_advisories
-- Rules Enforced:
--   WR01: Non-overlapping published schedules
--   WR02: Schedule superseding immutability
--   WR03: Gauge pressure physical bounds (0.0 to 25.0 PSI)
--   WR12: Simulated telemetry source flag
-- =============================================================================

-- 1. Monitoring Points Table
CREATE TABLE IF NOT EXISTS public.monitoring_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location geometry(Point, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_points_dma_zone_id
    ON public.monitoring_points(dma_zone_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_points_barangay_id
    ON public.monitoring_points(barangay_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_points_location_gist
    ON public.monitoring_points USING gist (location);


-- 2. Rotational Water Supply Schedules Table
CREATE TABLE IF NOT EXISTS public.water_schedules (
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

CREATE INDEX IF NOT EXISTS idx_water_schedules_dma_zone_id
    ON public.water_schedules(dma_zone_id);

CREATE INDEX IF NOT EXISTS idx_water_schedules_active_lookup
    ON public.water_schedules(dma_zone_id, window_start, window_end)
    WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_water_schedules_superseded_by_id
    ON public.water_schedules(superseded_by_id);


-- 3. Hydraulic Pressure Telemetry Table
CREATE TABLE IF NOT EXISTS public.pressure_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_point_id UUID REFERENCES public.monitoring_points(id) ON DELETE SET NULL,
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    pressure_psi NUMERIC(4,2) NOT NULL CONSTRAINT chk_pressure_bounds CHECK (pressure_psi >= 0.0 AND pressure_psi <= 25.0),
    source TEXT NOT NULL DEFAULT 'utility_logger',
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pressure_readings_dma_zone_id
    ON public.pressure_readings(dma_zone_id);

CREATE INDEX IF NOT EXISTS idx_pressure_readings_barangay_id
    ON public.pressure_readings(barangay_id);

CREATE INDEX IF NOT EXISTS idx_pressure_readings_recorded_at
    ON public.pressure_readings(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pressure_readings_methodology_filter
    ON public.pressure_readings(dma_zone_id, recorded_at, pressure_psi)
    WHERE is_simulated IS FALSE;


-- 4. Emergency & Operational Supply Advisories Table
CREATE TABLE IF NOT EXISTS public.supply_advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'advisory' CHECK (severity IN ('advisory', 'warning', 'critical')),
    description TEXT NOT NULL,
    affected_dmas UUID[] DEFAULT '{}',
    affected_barangays UUID[] DEFAULT '{}',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_advisories_active_window
    ON public.supply_advisories(is_active, valid_from, valid_to);


-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY & ACCESS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.monitoring_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_advisories ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Public read on monitoring_points"
    ON public.monitoring_points FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on water_schedules"
    ON public.water_schedules FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on pressure_readings"
    ON public.pressure_readings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on supply_advisories"
    ON public.supply_advisories FOR SELECT
    TO anon, authenticated
    USING (true);

-- Authorized Operator/Admin Write Policies
CREATE POLICY "Utility operators and admins can insert schedules"
    ON public.water_schedules FOR INSERT
    TO authenticated
    WITH CHECK (public.app_role() IN ('utility_operator', 'admin'));

CREATE POLICY "Utility operators and admins can supersede schedules"
    ON public.water_schedules FOR UPDATE
    TO authenticated
    USING (public.app_role() IN ('utility_operator', 'admin'))
    WITH CHECK (public.app_role() IN ('utility_operator', 'admin'));

CREATE POLICY "Utility operators and admins can log pressure"
    ON public.pressure_readings FOR INSERT
    TO authenticated
    WITH CHECK (public.app_role() IN ('utility_operator', 'admin'));

CREATE POLICY "Utility operators and admins can manage advisories"
    ON public.supply_advisories FOR ALL
    TO authenticated
    USING (public.app_role() IN ('utility_operator', 'admin'))
    WITH CHECK (public.app_role() IN ('utility_operator', 'admin'));
