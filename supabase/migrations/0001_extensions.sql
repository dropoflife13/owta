-- =============================================================================
-- Migration: 0001_extensions.sql
-- Description: Enable required PostgreSQL extensions for OWTA
-- Scope: Spatial (PostGIS), GiST indexing, text search, and cryptography
-- =============================================================================

-- Enable PostGIS for geospatial geometries, spatial calculations, and ST_DWithin
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable btree_gist for multi-column scalar and GiST exclusion constraints (e.g., schedule non-overlapping)
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Enable pg_trgm for fuzzy search and trigram indexing on geographic and landmark names
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable pgcrypto for cryptographic hashing (anti-sybil token hashing, device salting)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable uuid-ossp for RFC 4122 UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
