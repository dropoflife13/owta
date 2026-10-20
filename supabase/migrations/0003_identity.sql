-- =============================================================================
-- Migration: 0003_identity.sql
-- Description: User identity, multi-tier RBAC, auth trigger, and security functions
-- Tables: profiles
-- Functions: app_role(), app_barangay(), handle_new_user(), admin_set_user_role()
-- Security: Row-Level Security (RLS) with role-update locking trigger
-- =============================================================================

-- 1. Custom Enum for Multi-Tier RBAC
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
            'anon',
            'resident',
            'barangay_official',
            'lgu_dispatcher',
            'utility_operator',
            'admin',
            'auditor'
        );
    END IF;
END $$;


-- 2. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- Indexes for role lookups and barangay association
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_barangay_id
    ON public.profiles(assigned_barangay_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles(role);


-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS: app_role() & app_barangay()
-- -----------------------------------------------------------------------------

-- Helper function: Returns the active, verified role of the requesting user.
-- CRITICAL SECURITY: Automatically downgrades unverified staff accounts to 'resident'
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.app_role;
    v_verified BOOLEAN;
    v_active BOOLEAN;
BEGIN
    -- Unauthenticated callers are strictly 'anon'
    IF auth.uid() IS NULL THEN
        RETURN 'anon'::public.app_role;
    END IF;

    SELECT role, is_verified, is_active
    INTO v_role, v_verified, v_active
    FROM public.profiles
    WHERE id = auth.uid();

    -- Inactive accounts or non-existent profiles drop to 'anon'
    IF v_role IS NULL OR v_active IS FALSE THEN
        RETURN 'anon'::public.app_role;
    END IF;

    -- SAFELY DOWNGRADE UNVERIFIED STAFF:
    -- If an account holds a privileged staff role but has not been formally verified
    -- by an administrator, downgrade their effective role to standard 'resident'.
    IF v_role IN ('barangay_official', 'lgu_dispatcher', 'utility_operator', 'admin', 'auditor')
       AND v_verified IS NOT TRUE THEN
        RETURN 'resident'::public.app_role;
    END IF;

    RETURN v_role;
END;
$$;


-- Helper function: Returns the assigned barangay ID for verified barangay officials
CREATE OR REPLACE FUNCTION public.app_barangay()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.app_role;
    v_barangay_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    v_role := public.app_role();

    -- Scoped to verified barangay officials only (or admin)
    IF v_role = 'barangay_official' THEN
        SELECT assigned_barangay_id
        INTO v_barangay_id
        FROM public.profiles
        WHERE id = auth.uid() AND is_verified IS TRUE AND is_active IS TRUE;

        RETURN v_barangay_id;
    ELSIF v_role = 'admin' THEN
        SELECT assigned_barangay_id
        INTO v_barangay_id
        FROM public.profiles
        WHERE id = auth.uid();

        RETURN v_barangay_id;
    ELSE
        RETURN NULL;
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. AUTH TRIGGER: handle_new_user()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requested_role public.app_role := 'resident'::public.app_role;
    v_assigned_barangay UUID := NULL;
BEGIN
    -- Parse optional role request from metadata safely
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        BEGIN
            v_requested_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
        EXCEPTION WHEN OTHERS THEN
            v_requested_role := 'resident'::public.app_role;
        END;
    END IF;

    -- Parse optional assigned barangay from metadata
    IF NEW.raw_user_meta_data->>'assigned_barangay_id' IS NOT NULL THEN
        BEGIN
            v_assigned_barangay := (NEW.raw_user_meta_data->>'assigned_barangay_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_assigned_barangay := NULL;
        END;
    END IF;

    INSERT INTO public.profiles (
        id,
        role,
        first_name,
        last_name,
        mobile_number,
        assigned_barangay_id,
        is_verified,
        is_active
    )
    VALUES (
        NEW.id,
        v_requested_role,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'mobile_number',
        v_assigned_barangay,
        -- All self-registered users are UNVERIFIED by default.
        -- Privilege escalation prevented; app_role() will downgrade until verified.
        FALSE,
        TRUE
    );

    RETURN NEW;
END;
$$;

-- Register trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 5. RPC: admin_set_user_role()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
    target_user_id UUID,
    new_role public.app_role,
    target_barangay_id UUID DEFAULT NULL,
    set_verified BOOLEAN DEFAULT TRUE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Guard: Caller must possess verified administrator privileges
    IF public.app_role() != 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can assign roles and verify staff members.';
    END IF;

    -- Validation: Barangay official must be assigned to an actual barangay
    IF new_role = 'barangay_official' AND target_barangay_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: A barangay official must have a valid assigned_barangay_id.';
    END IF;

    UPDATE public.profiles
    SET
        role = new_role,
        assigned_barangay_id = target_barangay_id,
        is_verified = set_verified,
        updated_at = NOW()
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user profile not found for ID %', target_user_id;
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 6. ROLE UPDATE LOCKING TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lock_profile_role_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if sensitive privilege fields are being altered
    IF (
        NEW.role IS DISTINCT FROM OLD.role OR
        NEW.assigned_barangay_id IS DISTINCT FROM OLD.assigned_barangay_id OR
        NEW.is_verified IS DISTINCT FROM OLD.is_verified OR
        NEW.is_active IS DISTINCT FROM OLD.is_active
    ) THEN
        -- Only allow if caller is verified admin
        IF public.app_role() != 'admin' THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can modify roles, verification status, or barangay assignments.';
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_profile_role_updates ON public.profiles;
CREATE TRIGGER trg_lock_profile_role_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.lock_profile_role_updates();


-- -----------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.app_role() = 'admin');

CREATE POLICY "Barangay officials can view profiles in assigned barangay"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.app_role() = 'barangay_official'
        AND assigned_barangay_id = public.app_barangay()
    );

-- Update policies (governed additionally by the lock_profile_role_updates trigger)
CREATE POLICY "Users can update own basic profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.app_role() = 'admin')
    WITH CHECK (public.app_role() = 'admin');
