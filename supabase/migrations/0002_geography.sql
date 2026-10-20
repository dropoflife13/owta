-- =============================================================================
-- Migration: 0002_geography.sql
-- Description: Create administrative and hydraulic spatial structures for Iloilo City
-- Tables: districts, barangays, dma_zones, barangay_dma
-- Indexes: GiST spatial indexes, trigram fuzzy-search indexes, FK indexes
-- Security: Row-Level Security (RLS) enabled with public read access
-- =============================================================================

-- 1. Districts (Administrative subdivisions: Jaro, Mandurriao, City Proper, Molo, La Paz, Lapuz, Arevalo)
CREATE TABLE IF NOT EXISTS public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram index for fuzzy text lookup on district name
CREATE INDEX IF NOT EXISTS idx_districts_name_trgm
    ON public.districts USING gin (name gin_trgm_ops);


-- 2. Barangays (180 political subdivisions of Iloilo City)
CREATE TABLE IF NOT EXISTS public.barangays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    boundary geometry(MultiPolygon, 4326),
    centroid geometry(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_barangays_district_id
    ON public.barangays(district_id);

-- GiST index on polygon boundary for fast spatial intersection & containment
CREATE INDEX IF NOT EXISTS idx_barangays_boundary_gist
    ON public.barangays USING gist (boundary);

-- GiST index on centroid for proximity calculations
CREATE INDEX IF NOT EXISTS idx_barangays_centroid_gist
    ON public.barangays USING gist (centroid);

-- Trigram index for autocomplete and search on barangay name
CREATE INDEX IF NOT EXISTS idx_barangays_name_trgm
    ON public.barangays USING gin (name gin_trgm_ops);


-- 3. District Metered Areas (DMA Zones: Hydraulic distribution zones managed by MPIW)
CREATE TABLE IF NOT EXISTS public.dma_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    boundary geometry(MultiPolygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GiST spatial index on DMA boundary
CREATE INDEX IF NOT EXISTS idx_dma_zones_boundary_gist
    ON public.dma_zones USING gist (boundary);

-- Trigram index on DMA zone name
CREATE INDEX IF NOT EXISTS idx_dma_zones_name_trgm
    ON public.dma_zones USING gin (name gin_trgm_ops);


-- 4. Barangay - DMA Mapping (Many-to-many relationship with coverage proportion)
CREATE TABLE IF NOT EXISTS public.barangay_dma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barangay_id UUID NOT NULL REFERENCES public.barangays(id) ON DELETE CASCADE,
    dma_zone_id UUID NOT NULL REFERENCES public.dma_zones(id) ON DELETE CASCADE,
    coverage_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (coverage_pct > 0 AND coverage_pct <= 100.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_barangay_dma UNIQUE (barangay_id, dma_zone_id)
);

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_barangay_dma_barangay_id
    ON public.barangay_dma(barangay_id);

CREATE INDEX IF NOT EXISTS idx_barangay_dma_dma_zone_id
    ON public.barangay_dma(dma_zone_id);


-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS) & ACCESS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dma_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barangay_dma ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted public read access for geographic reference data
CREATE POLICY "Public read on districts"
    ON public.districts FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on barangays"
    ON public.barangays FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on dma_zones"
    ON public.dma_zones FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read on barangay_dma"
    ON public.barangay_dma FOR SELECT
    TO anon, authenticated
    USING (true);

