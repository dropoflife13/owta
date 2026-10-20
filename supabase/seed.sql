-- =============================================================================
-- Seed Script: supabase/seed.sql
-- Description: Idempotent local testing seed data for OWTA (T01 & T02)
-- Scope: 1 District, 2 Barangays, 1 DMA Zone, 2 Monitoring Points, 5 Readings
-- CRITICAL RULE WR12: Pressure readings must strictly set source = 'simulated'
--                     and is_simulated = TRUE to prevent public index contamination.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DISTRICT (Mandurriao)
-- -----------------------------------------------------------------------------
INSERT INTO public.districts (id, code, name)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'MANDURRIAO',
    'Mandurriao District'
)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code, name = EXCLUDED.name;


-- -----------------------------------------------------------------------------
-- 2. BARANGAYS (San Rafael and Bolilao)
-- -----------------------------------------------------------------------------
INSERT INTO public.barangays (id, district_id, code, name, boundary, centroid)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'BRGY-SAN-RAFAEL',
    'San Rafael',
    ST_Multi(ST_GeomFromText(
        'POLYGON((122.5450 10.7140, 122.5510 10.7140, 122.5510 10.7190, 122.5450 10.7190, 122.5450 10.7140))',
        4326
    )),
    ST_SetSRID(ST_MakePoint(122.5476, 10.7161), 4326)
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'BRGY-BOLILAO',
    'Bolilao',
    ST_Multi(ST_GeomFromText(
        'POLYGON((122.5510 10.7110, 122.5570 10.7110, 122.5570 10.7160, 122.5510 10.7160, 122.5510 10.7110))',
        4326
    )),
    ST_SetSRID(ST_MakePoint(122.5530, 10.7135), 4326)
)
ON CONFLICT (id) DO UPDATE
SET
    district_id = EXCLUDED.district_id,
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    boundary = EXCLUDED.boundary,
    centroid = EXCLUDED.centroid;


-- -----------------------------------------------------------------------------
-- 3. DMA ZONE (DMA 04 - Mandurriao West)
-- -----------------------------------------------------------------------------
INSERT INTO public.dma_zones (id, code, name, description, boundary)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'DMA-04',
    'DMA 04 - Mandurriao West',
    'Covers San Rafael, Bolilao, and adjacent Mandurriao residential-commercial zones',
    ST_Multi(ST_GeomFromText(
        'POLYGON((122.5430 10.7090, 122.5590 10.7090, 122.5590 10.7210, 122.5430 10.7210, 122.5430 10.7090))',
        4326
    ))
)
ON CONFLICT (id) DO UPDATE
SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    boundary = EXCLUDED.boundary;


-- -----------------------------------------------------------------------------
-- 4. BARANGAY - DMA MAPPING
-- -----------------------------------------------------------------------------
INSERT INTO public.barangay_dma (barangay_id, dma_zone_id, coverage_pct)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 100.00),
    ('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 100.00)
ON CONFLICT (barangay_id, dma_zone_id) DO UPDATE
SET coverage_pct = EXCLUDED.coverage_pct;


-- -----------------------------------------------------------------------------
-- 5. MONITORING POINTS & PRESSURE READINGS (Rule WR12 Compliance)
-- -----------------------------------------------------------------------------
-- Ensure monitoring_points and pressure_readings tables exist for testing context
CREATE TABLE IF NOT EXISTS public.monitoring_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dma_zone_id UUID REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location geometry(Point, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pressure_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_point_id UUID REFERENCES public.monitoring_points(id) ON DELETE SET NULL,
    dma_zone_id UUID REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    barangay_id UUID REFERENCES public.barangays(id) ON DELETE SET NULL,
    pressure_psi NUMERIC(4,2) NOT NULL CHECK (pressure_psi >= 0.0 AND pressure_psi <= 25.0),
    source TEXT NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed 2 Monitoring Points
INSERT INTO public.monitoring_points (id, dma_zone_id, barangay_id, code, name, location, is_active)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'MP-SR-01',
    'San Rafael Plaza Tap Logger',
    ST_SetSRID(ST_MakePoint(122.5478, 10.7163), 4326),
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'MP-BL-01',
    'Bolilao Barangay Hall Hydraulic Logger',
    ST_SetSRID(ST_MakePoint(122.5532, 10.7137), 4326),
    TRUE
)
ON CONFLICT (id) DO UPDATE
SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    location = EXCLUDED.location;


-- Seed 5 Pressure Readings (WR12: Strictly set source = 'simulated' and is_simulated = TRUE)
INSERT INTO public.pressure_readings (
    id,
    monitoring_point_id,
    dma_zone_id,
    barangay_id,
    pressure_psi,
    source,
    is_simulated,
    recorded_at
)
VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    8.50,
    'simulated',
    TRUE,
    NOW() - INTERVAL '4 hours'
),
(
    'f0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    7.20,
    'simulated',
    TRUE,
    NOW() - INTERVAL '3 hours'
),
(
    'f0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    4.10,
    'simulated',
    TRUE,
    NOW() - INTERVAL '2 hours'
),
(
    'f0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    9.80,
    'simulated',
    TRUE,
    NOW() - INTERVAL '2 hours'
),
(
    'f0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    0.00,
    'simulated',
    TRUE,
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
SET
    pressure_psi = EXCLUDED.pressure_psi,
    source = EXCLUDED.source,
    is_simulated = EXCLUDED.is_simulated,
    recorded_at = EXCLUDED.recorded_at;
