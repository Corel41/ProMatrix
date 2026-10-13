CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE public.companies (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    name                TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    slug                CITEXT          NOT NULL UNIQUE,
    legal_name          TEXT,
    registration_number TEXT,

    email               CITEXT,
    phone               TEXT,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    country             TEXT            NOT NULL DEFAULT 'KE',

    base_currency       CHAR(3)         NOT NULL DEFAULT 'KES',
    reporting_currency  CHAR(3)         NOT NULL DEFAULT 'KES',
    time_zone           TEXT            NOT NULL DEFAULT 'Africa/Nairobi',
    fiscal_year_start   SMALLINT        NOT NULL DEFAULT 1
                                        CHECK (fiscal_year_start BETWEEN 1 AND 12),

    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'suspended', 'archived')),
    onboarded_at        TIMESTAMPTZ     DEFAULT now(),

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID
);

COMMENT ON TABLE  public.companies IS 'Top-level independent company entities. Full data isolation enforced via RLS.';
COMMENT ON COLUMN public.companies.slug IS 'Short unique handle used in APIs and URLs. Immutable after creation.';
COMMENT ON COLUMN public.companies.base_currency IS 'ISO 4217 currency code. All financial records convert to this currency.';
COMMENT ON COLUMN public.companies.fiscal_year_start IS 'Month number (1-12) that begins the financial year for this company.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.branches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

    name                TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    code                TEXT,
    branch_type         TEXT            NOT NULL DEFAULT 'branch'
                                        CHECK (branch_type IN ('head_office', 'branch', 'department', 'project_office')),

    email               CITEXT,
    phone               TEXT,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,

    operational_manager_id  UUID,
    cash_custodian_id       UUID,

    permitted_modules   TEXT[]          NOT NULL DEFAULT '{}',

    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'inactive', 'archived')),
    effective_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT branches_effective_dates_check
        CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT branches_company_code_unique
        UNIQUE (company_id, code),
    CONSTRAINT branches_company_id_id_key
        UNIQUE (company_id, id)
);

COMMENT ON TABLE  public.branches IS 'Operational units within a company. Access is isolated to assigned branch membership by default.';
COMMENT ON COLUMN public.branches.permitted_modules IS 'Array of module slug strings this branch is licensed/configured to use.';
COMMENT ON COLUMN public.branches.effective_to IS 'NULL means the branch is currently active. Set to close/archive a branch.';

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_branches_company_active
    ON public.branches (company_id)
    WHERE status = 'active';

CREATE TABLE public.user_profiles (

    id                  UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name           TEXT,
    preferred_name      TEXT,

    email               CITEXT          NOT NULL,
    phone               TEXT,
    avatar_url          TEXT,

    global_status       TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (global_status IN ('active', 'suspended', 'deactivated')),
    last_seen_at        TIMESTAMPTZ,

    preferred_language  CHAR(5)         NOT NULL DEFAULT 'en',
    preferred_timezone  TEXT            NOT NULL DEFAULT 'Africa/Nairobi',
    notification_prefs  JSONB           NOT NULL DEFAULT '{}',

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.user_profiles IS 'Public extension of auth.users. One row per authenticated identity. Multi-company access is via company_memberships.';
COMMENT ON COLUMN public.user_profiles.global_status IS 'Platform-level status. Company-level suspension is handled in company_memberships.';
COMMENT ON COLUMN public.user_profiles.email IS 'Denormalized from auth.users to enable application-level queries without joining auth schema.';

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TABLE public.roles_permissions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    role_name           TEXT            NOT NULL CHECK (char_length(trim(role_name)) > 0),
    role_slug           TEXT            NOT NULL,
    description         TEXT,
    role_type           TEXT            NOT NULL DEFAULT 'operational'
                                        CHECK (role_type IN (
                                            'company_super_admin',
                                            'branch_manager',
                                            'operational',
                                            'finance',
                                            'auditor',
                                            'support_readonly'
                                        )),

    permissions         JSONB           NOT NULL DEFAULT '{}',

    approval_limit_currency     CHAR(3),
    approval_limit_amount       NUMERIC(18, 4),

    is_system_role      BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    effective_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT roles_permissions_company_slug_unique
        UNIQUE (company_id, role_slug)
);

COMMENT ON TABLE  public.roles_permissions IS 'Company-scoped role definitions. Permissions matrix is the declared contract; server business logic enforces it.';
COMMENT ON COLUMN public.roles_permissions.permissions IS 'JSONB matrix: {module_slug: {view, create, edit, approve, post, export, delete, administer}}.';
COMMENT ON COLUMN public.roles_permissions.is_system_role IS 'System roles (e.g. company_super_admin) cannot be deleted and must not reduce approval controls.';
COMMENT ON COLUMN public.roles_permissions.approval_limit_amount IS 'Maximum monetary amount this role can approve. NULL means no approval authority on financial items.';

CREATE TRIGGER trg_roles_permissions_updated_at
    BEFORE UPDATE ON public.roles_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.seed_company_system_roles(p_company_id UUID, p_created_by UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.roles_permissions
        (company_id, role_name, role_slug, description, role_type, is_system_role, permissions, created_by)
    VALUES
    (
        p_company_id,
        'Company Super Administrator',
        'company_super_admin',
        'Full company administration: branches, memberships, roles, configuration. Cannot erase audit history or override posted financial events.',
        'company_super_admin',
        TRUE,
        '{"*": {"view": true, "create": true, "edit": true, "approve": true, "post": true, "export": true, "delete": false, "administer": true}}'::jsonb,
        p_created_by
    ),
    (
        p_company_id,
        'Internal Auditor',
        'auditor_readonly',
        'Read-only access to approved records, reports and audit trails. Cannot post, approve or change records.',
        'auditor',
        TRUE,
        '{"*": {"view": true, "create": false, "edit": false, "approve": false, "post": false, "export": true, "delete": false, "administer": false}}'::jsonb,
        p_created_by
    );
END;
$$;

CREATE TABLE public.company_memberships (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id             UUID            NOT NULL REFERENCES public.roles_permissions(id) ON DELETE RESTRICT,

    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('invited', 'active', 'suspended', 'revoked', 'transferred')),
    invited_at          TIMESTAMPTZ,
    activated_at        TIMESTAMPTZ,
    suspended_at        TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revocation_reason   TEXT,

    transfer_note       TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT company_memberships_one_active_per_user
        EXCLUDE USING btree (company_id WITH =, user_id WITH =)
        WHERE (status = 'active')
);

COMMENT ON TABLE  public.company_memberships IS 'Links user identities to companies with a role. One active row per user-per-company enforced by exclusion constraint.';
COMMENT ON COLUMN public.company_memberships.status IS 'Company-level access status. Revoked users must not continue actions through old sessions or queued offline changes.';

CREATE TRIGGER trg_company_memberships_updated_at
    BEFORE UPDATE ON public.company_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_company_memberships_user
    ON public.company_memberships (user_id)
    WHERE status = 'active';

CREATE INDEX idx_company_memberships_company
    ON public.company_memberships (company_id)
    WHERE status = 'active';

CREATE TABLE public.branch_memberships (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id)     ON DELETE CASCADE,
    branch_id           UUID            NOT NULL REFERENCES public.branches(id)      ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    role_id             UUID            NOT NULL REFERENCES public.roles_permissions(id) ON DELETE RESTRICT,

    is_default_branch   BOOLEAN         NOT NULL DEFAULT FALSE,

    is_temporary        BOOLEAN         NOT NULL DEFAULT FALSE,
    access_purpose      TEXT,
    approved_by         UUID,
    access_expires_at   TIMESTAMPTZ,
    access_revoked_at   TIMESTAMPTZ,
    access_revoked_by   UUID,

    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT branch_memberships_one_active_per_user_branch
        EXCLUDE USING btree (branch_id WITH =, user_id WITH =)
        WHERE (status = 'active'),

    CONSTRAINT branch_memberships_temporary_requires_purpose
        CHECK (NOT is_temporary OR (access_purpose IS NOT NULL AND access_expires_at IS NOT NULL)),

    CONSTRAINT branch_memberships_company_matches
        FOREIGN KEY (company_id, branch_id)
            REFERENCES public.branches (company_id, id)
);

COMMENT ON TABLE  public.branch_memberships IS 'Scopes company members to specific branches. Cross-branch access requires an explicit, time-limited, approved grant.';
COMMENT ON COLUMN public.branch_memberships.is_temporary IS 'TRUE = cross-branch grant. Must have access_purpose, approved_by, and access_expires_at.';
COMMENT ON COLUMN public.branch_memberships.is_default_branch IS 'Determines which branch context loads on sign-in when a user has access to multiple branches.';

CREATE TRIGGER trg_branch_memberships_updated_at
    BEFORE UPDATE ON public.branch_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.expire_branch_access_grants()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.branch_memberships
    SET
        status     = 'expired',
        updated_at = now()
    WHERE
        is_temporary        = TRUE
        AND status          = 'active'
        AND access_expires_at <= now();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_branch_access_grants IS 'Expires cross-branch access grants whose access_expires_at has passed. Intended for scheduled invocation (e.g. pg_cron every 5 min).';

CREATE INDEX idx_branch_memberships_user_active
    ON public.branch_memberships (user_id, branch_id)
    WHERE status = 'active';

CREATE INDEX idx_branch_memberships_temporary_expiry
    ON public.branch_memberships (access_expires_at)
    WHERE is_temporary = TRUE AND status = 'active';

CREATE TABLE public.audit_events (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id            UUID,
    company_id          UUID,
    branch_id           UUID,

    event_type          TEXT            NOT NULL,

    severity            TEXT            NOT NULL DEFAULT 'info'
                                        CHECK (severity IN ('info', 'warning', 'critical')),

    target_table        TEXT,
    target_id           UUID,

    metadata            JSONB           NOT NULL DEFAULT '{}',
    ip_address          INET,
    user_agent          TEXT,

    occurred_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_events IS 'Immutable audit log. RLS enforces INSERT-only for application roles. No UPDATE or DELETE permitted.';

CREATE INDEX idx_audit_events_actor      ON public.audit_events (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_events_company    ON public.audit_events (company_id, occurred_at DESC);
CREATE INDEX idx_audit_events_target     ON public.audit_events (target_table, target_id, occurred_at DESC);
CREATE INDEX idx_audit_events_type       ON public.audit_events (event_type, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM   public.company_memberships
    WHERE  user_id = auth.uid()
      AND  status  = 'active';
$$;

COMMENT ON FUNCTION public.get_my_company_ids IS 'Returns UUIDs of companies the authenticated user has an active membership in. Used in RLS policies.';

CREATE OR REPLACE FUNCTION public.get_my_branch_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT branch_id
    FROM   public.branch_memberships
    WHERE  user_id = auth.uid()
      AND  status  = 'active'
      AND  (access_expires_at IS NULL OR access_expires_at > now());
$$;

COMMENT ON FUNCTION public.get_my_branch_ids IS 'Returns UUIDs of branches the authenticated user can currently access. Respects expiry of temporary grants.';

ALTER TABLE public.companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events        ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.companies           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.branches            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.branch_memberships  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events        FORCE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_own_memberships"
    ON public.companies
    FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT public.get_my_company_ids())
    );

CREATE POLICY "companies_insert_service_role_only"
    ON public.companies
    FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

CREATE POLICY "companies_update_super_admin_only"
    ON public.companies
    FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id    = auth.uid()
              AND  cm.status     = 'active'
              AND  rp.role_type  = 'company_super_admin'
        )
    )
    WITH CHECK (
        id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id    = auth.uid()
              AND  cm.status     = 'active'
              AND  rp.role_type  = 'company_super_admin'
        )
    );

CREATE POLICY "companies_no_delete"
    ON public.companies
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "branches_select_active_branch_members_only"
    ON public.branches
    FOR SELECT
    TO authenticated
    USING (

        id IN (SELECT public.get_my_branch_ids())
        AND

        company_id IN (SELECT public.get_my_company_ids())
    );

CREATE POLICY "branches_insert_company_super_admin"
    ON public.branches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id    = auth.uid()
              AND  cm.status     = 'active'
              AND  rp.role_type  = 'company_super_admin'
        )
    );

CREATE POLICY "branches_update_super_admin_or_branch_manager"
    ON public.branches
    FOR UPDATE
    TO authenticated
    USING (

        id IN (SELECT public.get_my_branch_ids())
        AND

        id IN (
            SELECT bm.branch_id
            FROM   public.branch_memberships bm
            JOIN   public.roles_permissions  rp ON rp.id = bm.role_id
            WHERE  bm.user_id = auth.uid()
              AND  bm.status  = 'active'
              AND  rp.role_type IN ('company_super_admin', 'branch_manager')
        )
    )
    WITH CHECK (
        id IN (SELECT public.get_my_branch_ids())
    );

CREATE POLICY "branches_no_delete"
    ON public.branches
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "user_profiles_select_own_and_coworkers"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (

        id = auth.uid()
        OR

        id IN (
            SELECT cm2.user_id
            FROM   public.company_memberships cm1
            JOIN   public.company_memberships cm2
                ON cm2.company_id = cm1.company_id
               AND cm2.status     = 'active'
            WHERE  cm1.user_id = auth.uid()
              AND  cm1.status  = 'active'
        )
    );

CREATE POLICY "user_profiles_update_own_only"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING  (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_insert_trigger_only"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_no_delete"
    ON public.user_profiles
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "roles_select_company_members"
    ON public.roles_permissions
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT public.get_my_company_ids())
    );

CREATE POLICY "roles_insert_super_admin"
    ON public.roles_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "roles_update_super_admin"
    ON public.roles_permissions
    FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
        AND is_system_role = FALSE
    )
    WITH CHECK (is_system_role = FALSE);

CREATE POLICY "roles_no_delete"
    ON public.roles_permissions
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "company_memberships_select_own_company"
    ON public.company_memberships
    FOR SELECT
    TO authenticated
    USING (

        user_id = auth.uid()
        OR

        company_id IN (SELECT public.get_my_company_ids())
    );

CREATE POLICY "company_memberships_manage_super_admin"
    ON public.company_memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "company_memberships_update_super_admin"
    ON public.company_memberships
    FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "company_memberships_no_delete"
    ON public.company_memberships
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "branch_memberships_select_own_and_managed"
    ON public.branch_memberships
    FOR SELECT
    TO authenticated
    USING (

        user_id = auth.uid()
        OR

        branch_id IN (
            SELECT bm.branch_id
            FROM   public.branch_memberships bm
            JOIN   public.roles_permissions  rp ON rp.id = bm.role_id
            WHERE  bm.user_id  = auth.uid()
              AND  bm.status   = 'active'
              AND  rp.role_type IN ('company_super_admin', 'branch_manager')
        )
    );

CREATE POLICY "branch_memberships_manage_super_admin_and_manager"
    ON public.branch_memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (

        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "branch_memberships_update_super_admin"
    ON public.branch_memberships
    FOR UPDATE
    TO authenticated
    USING (
        company_id IN (
            SELECT cm.company_id
            FROM   public.company_memberships cm
            JOIN   public.roles_permissions   rp ON rp.id = cm.role_id
            WHERE  cm.user_id   = auth.uid()
              AND  cm.status    = 'active'
              AND  rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "branch_memberships_no_delete"
    ON public.branch_memberships
    FOR DELETE
    TO authenticated
    USING (FALSE);

CREATE POLICY "audit_events_select_company_members"
    ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (
        company_id IS NULL
        OR
        company_id IN (SELECT public.get_my_company_ids())
    );

CREATE POLICY "audit_events_insert_authenticated"
    ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "audit_events_no_update"
    ON public.audit_events
    FOR UPDATE
    TO authenticated
    USING (FALSE);

CREATE POLICY "audit_events_no_delete"
    ON public.audit_events
    FOR DELETE
    TO authenticated
    USING (FALSE);

GRANT USAGE                      ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE     ON public.companies           TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.branches            TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.user_profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.roles_permissions   TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.company_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.branch_memberships  TO authenticated;
GRANT SELECT, INSERT             ON public.audit_events        TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_company_ids()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_branch_ids()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user()       TO authenticated;
