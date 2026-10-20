-- =============================================================================
-- Migration: 0008_governance_audit.sql
-- Description: Immutable append-only audit logging and governance tracking
-- Tables: audit_logs
-- Functions: audit_row(), prevent_audit_log_tampering()
-- Rules Enforced:
--   WR08: Append-only audit trail (immutable; no UPDATE or DELETE permitted)
-- =============================================================================

-- 1. Immutable Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role public.app_role,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    record_id UUID,
    previous_state JSONB,
    new_state JSONB,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
    ON public.audit_logs(target_table, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
    ON public.audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON public.audit_logs(action);


-- -----------------------------------------------------------------------------
-- 2. IMMUTABILITY TRIGGER: prevent_audit_log_tampering() (Rule WR08)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation (Rule WR08): audit_logs is append-only. Modifying or deleting audit records is strictly prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_tampering
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_tampering();


-- -----------------------------------------------------------------------------
-- 3. GENERIC AUDIT TRIGGER FUNCTION: audit_row()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_record_id UUID := NULL;
    v_action TEXT := TG_OP;
    v_actor_id UUID := auth.uid();
    v_actor_role public.app_role := public.app_role();
BEGIN
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        v_record_id := OLD.id;
    END IF;

    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_new_data := to_jsonb(NEW);
        v_record_id := NEW.id;
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        target_table,
        record_id,
        previous_state,
        new_state,
        created_at
    )
    VALUES (
        v_actor_id,
        v_actor_role,
        v_action,
        TG_TABLE_NAME,
        v_record_id,
        v_old_data,
        v_new_data,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Attach audit triggers to governance-sensitive operational tables
DROP TRIGGER IF EXISTS trg_audit_water_schedules ON public.water_schedules;
CREATE TRIGGER trg_audit_water_schedules
    AFTER INSERT OR UPDATE OR DELETE ON public.water_schedules
    FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DROP TRIGGER IF EXISTS trg_audit_relief_dispatches ON public.relief_dispatches;
CREATE TRIGGER trg_audit_relief_dispatches
    AFTER INSERT OR UPDATE OR DELETE ON public.relief_dispatches
    FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DROP TRIGGER IF EXISTS trg_audit_methodology_parameters ON public.methodology_parameters;
CREATE TRIGGER trg_audit_methodology_parameters
    AFTER INSERT OR UPDATE OR DELETE ON public.methodology_parameters
    FOR EACH ROW EXECUTE FUNCTION public.audit_row();


-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY & ACCESS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policy: Only administrators and designated independent auditors can inspect the audit log
CREATE POLICY "Admins and auditors can inspect audit_logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.app_role() IN ('admin', 'auditor'));

-- Insert policy: Trusted database triggers and internal processes insert logs
CREATE POLICY "System can append audit_logs"
    ON public.audit_logs FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

