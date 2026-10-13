-- =============================================================================
-- ProMatrix: Phase 2 Property Operations Migration
-- File   : 20261013091120_phase2_property_ops.sql
-- Module : Property Operations (Properties & Units)
-- Author : ProMatrix Platform
-- Date   : 2026-10-13
--
-- Principles (from Master Brief):
--   • One shared operational record
--   • Server validation is authoritative
--   • Least privilege by default / Default deny
--   • Multi-tenant cross-company data leakage prevention via compound foreign keys
--   • Branch isolation: Users can only manage properties & units within their branch scope
--   • Authoritative Audit Trail: Automatic audit events recorded for all mutations
-- =============================================================================


-- =============================================================================
-- SECTION 1: PROPERTIES TABLE
-- Represents physical or legal estates managed within a specific company branch.
-- Cross-company isolation is enforced through a compound foreign key to `branches`.
-- =============================================================================

CREATE TABLE public.properties (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id           UUID            NOT NULL,

    -- Identity & Details
    name                TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    code                TEXT,                                                -- short property code/identifier
    property_type       TEXT            NOT NULL DEFAULT 'residential'
                                        CHECK (property_type IN (
                                            'residential',
                                            'commercial',
                                            'mixed_use',
                                            'industrial',
                                            'land'
                                        )),
    address             TEXT,
    city                TEXT,
    postal_code         TEXT,
    total_floors        INTEGER         CHECK (total_floors IS NULL OR total_floors >= 0),

    -- Status & Lifecycle
    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'inactive', 'archived', 'under_development')),

    -- Audit & Timestamps
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,           -- references auth.users(id)
    updated_by          UUID,           -- references auth.users(id)

    -- Strict multi-tenant compound foreign key:
    -- Guarantees the branch belongs to the designated company
    CONSTRAINT properties_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id)
        ON DELETE RESTRICT,

    -- Compound unique key to allow child tables (e.g. units) to enforce matching company_id
    CONSTRAINT properties_company_id_id_key
        UNIQUE (company_id, id),

    -- Property code must be unique within a branch (if specified)
    CONSTRAINT properties_branch_code_unique
        UNIQUE (branch_id, code)
);

COMMENT ON TABLE  public.properties IS 'Properties managed within an organisation branch. Compound FK strictly ties company_id and branch_id.';
COMMENT ON COLUMN public.properties.company_id IS 'Tenant partition key. Must match parent branch company.';
COMMENT ON COLUMN public.properties.branch_id IS 'Branch partition key. Access is gated by branch membership.';

-- Update trigger
CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fast lookup indexes
CREATE INDEX idx_properties_company_branch
    ON public.properties (company_id, branch_id);

CREATE INDEX idx_properties_status
    ON public.properties (branch_id, status);


-- =============================================================================
-- SECTION 2: UNITS TABLE
-- Represents rentable or leasable spaces within a property (apartments, offices, stalls).
-- Cross-company isolation is enforced via compound foreign key referencing `properties(company_id, id)`.
-- =============================================================================

CREATE TABLE public.units (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id         UUID            NOT NULL,
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

    -- Unit Attributes
    unit_number         TEXT            NOT NULL CHECK (char_length(trim(unit_number)) > 0),
    floor_number        INTEGER,
    unit_type           TEXT            DEFAULT 'standard',                  -- e.g. '1BHK', '2BHK', 'shop', 'office', 'warehouse'
    bedrooms            NUMERIC(3, 1)   CHECK (bedrooms IS NULL OR bedrooms >= 0),
    bathrooms           NUMERIC(3, 1)   CHECK (bathrooms IS NULL OR bathrooms >= 0),
    square_footage      NUMERIC(10, 2)  CHECK (square_footage IS NULL OR square_footage >= 0),

    -- Financial baseline
    rent_amount         NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_amount >= 0),
    deposit_amount      NUMERIC(14, 2)  DEFAULT 0.00 CHECK (deposit_amount IS NULL OR deposit_amount >= 0),

    -- Operational Status
    status              TEXT            NOT NULL DEFAULT 'vacant'
                                        CHECK (status IN (
                                            'vacant',
                                            'occupied',
                                            'reserved',
                                            'maintenance',
                                            'inactive'
                                        )),

    -- Audit & Timestamps
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    -- Multi-tenant compound foreign key:
    -- Prevents a unit from pointing to Property A while having Company B.
    CONSTRAINT units_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id)
        ON DELETE CASCADE,

    -- Compound unique key to allow downstream entities (leases, tenancies) to inherit company verification
    CONSTRAINT units_company_id_id_key
        UNIQUE (company_id, id),

    -- Unit number must be unique within a single property
    CONSTRAINT units_property_unit_number_key
        UNIQUE (property_id, unit_number)
);

COMMENT ON TABLE  public.units IS 'Individual rentable spaces inside properties. Compound FK prevents cross-company property mismatch.';
COMMENT ON COLUMN public.units.rent_amount IS 'Nominal baseline rent. Actual contract charges are governed by lease records in Phase 2.';
COMMENT ON COLUMN public.units.status IS 'Current unit occupancy status.';

-- Update trigger
CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fast lookup indexes
CREATE INDEX idx_units_property
    ON public.units (property_id);

CREATE INDEX idx_units_company_property
    ON public.units (company_id, property_id);

CREATE INDEX idx_units_status
    ON public.units (property_id, status);


-- =============================================================================
-- SECTION 3: AUTHORITATIVE AUDIT TRAIL TRIGGER
-- Automatically records audit entries into `public.audit_events` on INSERT, UPDATE,
-- or DELETE of properties and units.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_property_ops_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id    UUID;
    v_company_id  UUID;
    v_branch_id   UUID;
    v_target_id   UUID;
    v_event_type  TEXT;
    v_metadata    JSONB;
BEGIN
    v_actor_id := auth.uid();

    IF TG_OP = 'DELETE' THEN
        v_target_id  := OLD.id;
        v_company_id := OLD.company_id;

        IF TG_TABLE_NAME = 'properties' THEN
            v_branch_id := OLD.branch_id;
        ELSIF TG_TABLE_NAME = 'units' THEN
            SELECT branch_id INTO v_branch_id
            FROM public.properties
            WHERE id = OLD.property_id;
        END IF;

        v_event_type := TG_TABLE_NAME || '.deleted';
        v_metadata   := jsonb_build_object('old', to_jsonb(OLD));

    ELSIF TG_OP = 'UPDATE' THEN
        v_target_id  := NEW.id;
        v_company_id := NEW.company_id;

        IF TG_TABLE_NAME = 'properties' THEN
            v_branch_id := NEW.branch_id;
        ELSIF TG_TABLE_NAME = 'units' THEN
            SELECT branch_id INTO v_branch_id
            FROM public.properties
            WHERE id = NEW.property_id;
        END IF;

        v_event_type := TG_TABLE_NAME || '.updated';
        v_metadata   := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );

    ELSIF TG_OP = 'INSERT' THEN
        v_target_id  := NEW.id;
        v_company_id := NEW.company_id;

        IF TG_TABLE_NAME = 'properties' THEN
            v_branch_id := NEW.branch_id;
        ELSIF TG_TABLE_NAME = 'units' THEN
            SELECT branch_id INTO v_branch_id
            FROM public.properties
            WHERE id = NEW.property_id;
        END IF;

        v_event_type := TG_TABLE_NAME || '.created';
        v_metadata   := jsonb_build_object('new', to_jsonb(NEW));
    END IF;

    -- Authoritative immutable audit write
    INSERT INTO public.audit_events (
        actor_id,
        company_id,
        branch_id,
        event_type,
        severity,
        target_table,
        target_id,
        metadata
    ) VALUES (
        v_actor_id,
        v_company_id,
        v_branch_id,
        v_event_type,
        'info',
        TG_TABLE_NAME,
        v_target_id,
        v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.log_property_ops_audit_event IS 'Captures mutations on properties and units directly into audit_events.';

-- Attach audit triggers
CREATE TRIGGER trg_audit_properties
    AFTER INSERT OR UPDATE OR DELETE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.log_property_ops_audit_event();

CREATE TRIGGER trg_audit_units
    AFTER INSERT OR UPDATE OR DELETE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.log_property_ops_audit_event();


-- =============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS)
-- Principle:
--   • Default DENY.
--   • A user can only access (SELECT, INSERT, UPDATE, DELETE) properties and units
--     for branches where they hold an active, non-expired branch membership.
-- =============================================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.units      FORCE ROW LEVEL SECURITY;


-- ── 4.1 properties — Policies ──────────────────────────────────────────────

-- SELECT: User has active branch membership for this property's branch
CREATE POLICY "properties_select_branch_members"
    ON public.properties
    FOR SELECT
    TO authenticated
    USING (
        branch_id IN (SELECT public.get_my_branch_ids())
    );

-- INSERT: User has active branch membership for the target branch
CREATE POLICY "properties_insert_branch_members"
    ON public.properties
    FOR INSERT
    TO authenticated
    WITH CHECK (
        branch_id IN (SELECT public.get_my_branch_ids())
        AND
        company_id IN (SELECT public.get_my_company_ids())
    );

-- UPDATE: User has active branch membership for the branch
CREATE POLICY "properties_update_branch_members"
    ON public.properties
    FOR UPDATE
    TO authenticated
    USING (
        branch_id IN (SELECT public.get_my_branch_ids())
    )
    WITH CHECK (
        branch_id IN (SELECT public.get_my_branch_ids())
        AND
        company_id IN (SELECT public.get_my_company_ids())
    );

-- DELETE: User has active branch membership for the branch
CREATE POLICY "properties_delete_branch_members"
    ON public.properties
    FOR DELETE
    TO authenticated
    USING (
        branch_id IN (SELECT public.get_my_branch_ids())
    );


-- ── 4.2 units — Policies ───────────────────────────────────────────────────

-- SELECT: User has active branch membership for the property containing this unit
CREATE POLICY "units_select_branch_members"
    ON public.units
    FOR SELECT
    TO authenticated
    USING (
        property_id IN (
            SELECT p.id
            FROM public.properties p
            WHERE p.branch_id IN (SELECT public.get_my_branch_ids())
        )
    );

-- INSERT: User has active branch membership for the parent property's branch
CREATE POLICY "units_insert_branch_members"
    ON public.units
    FOR INSERT
    TO authenticated
    WITH CHECK (
        property_id IN (
            SELECT p.id
            FROM public.properties p
            WHERE p.branch_id IN (SELECT public.get_my_branch_ids())
        )
        AND
        company_id IN (SELECT public.get_my_company_ids())
    );

-- UPDATE: User has active branch membership for the parent property's branch
CREATE POLICY "units_update_branch_members"
    ON public.units
    FOR UPDATE
    TO authenticated
    USING (
        property_id IN (
            SELECT p.id
            FROM public.properties p
            WHERE p.branch_id IN (SELECT public.get_my_branch_ids())
        )
    )
    WITH CHECK (
        property_id IN (
            SELECT p.id
            FROM public.properties p
            WHERE p.branch_id IN (SELECT public.get_my_branch_ids())
        )
        AND
        company_id IN (SELECT public.get_my_company_ids())
    );

-- DELETE: User has active branch membership for the parent property's branch
CREATE POLICY "units_delete_branch_members"
    ON public.units
    FOR DELETE
    TO authenticated
    USING (
        property_id IN (
            SELECT p.id
            FROM public.properties p
            WHERE p.branch_id IN (SELECT public.get_my_branch_ids())
        )
    );


-- =============================================================================
-- SECTION 5: GRANT STATEMENTS
-- Authenticated role receives full operational permissions, governed strictly
-- by the RLS policies defined above.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units      TO authenticated;

GRANT EXECUTE ON FUNCTION public.log_property_ops_audit_event() TO authenticated;


-- =============================================================================
-- END OF MIGRATION: 20261013091120_phase2_property_ops.sql
-- =============================================================================
