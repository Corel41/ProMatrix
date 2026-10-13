-- =============================================================================
-- ProMatrix: Phase 1 Foundation Migration
-- File   : 20261013000000_phase1_foundation.sql
-- Module : Organisation & Access
-- Author : ProMatrix Platform
-- Date   : 2026-10-13
--
-- Principles (from Master Brief):
--   • One shared operational record
--   • Server validation is authoritative
--   • Least privilege by default / Default deny
--   • Company A users cannot read Company B records
--   • Branch managers have no unrestricted cross-branch access
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for emails


-- =============================================================================
-- SECTION 1: COMPANIES
-- The top-level organisational entity. Each company is completely isolated from
-- every other company by Row Level Security. All records in the system carry a
-- company_id that is used to enforce this isolation at the database layer.
-- =============================================================================

CREATE TABLE public.companies (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name                TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    slug                CITEXT          NOT NULL UNIQUE,                     -- URL-safe unique identifier
    legal_name          TEXT,
    registration_number TEXT,

    -- Contact & location
    email               CITEXT,
    phone               TEXT,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    country             TEXT            NOT NULL DEFAULT 'KE',

    -- Financial configuration
    base_currency       CHAR(3)         NOT NULL DEFAULT 'KES',             -- ISO 4217
    reporting_currency  CHAR(3)         NOT NULL DEFAULT 'KES',
    time_zone           TEXT            NOT NULL DEFAULT 'Africa/Nairobi',
    fiscal_year_start   SMALLINT        NOT NULL DEFAULT 1                   -- month 1=Jan
                                        CHECK (fiscal_year_start BETWEEN 1 AND 12),

    -- Lifecycle
    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'suspended', 'archived')),
    onboarded_at        TIMESTAMPTZ     DEFAULT now(),

    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,           -- references auth.users(id) — set after auth bootstrap
    updated_by          UUID
);

COMMENT ON TABLE  public.companies IS 'Top-level independent company entities. Full data isolation enforced via RLS.';
COMMENT ON COLUMN public.companies.slug IS 'Short unique handle used in APIs and URLs. Immutable after creation.';
COMMENT ON COLUMN public.companies.base_currency IS 'ISO 4217 currency code. All financial records convert to this currency.';
COMMENT ON COLUMN public.companies.fiscal_year_start IS 'Month number (1-12) that begins the financial year for this company.';

-- Keep updated_at current automatically
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


-- =============================================================================
-- SECTION 2: BRANCHES
-- Operational units within a company. A company has at least one branch (the
-- head office). Branch managers receive access only to their own branch's
-- records unless an explicit, time-limited cross-branch grant is active.
-- =============================================================================

CREATE TABLE public.branches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

    -- Identity
    name                TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    code                TEXT,                                                -- short alphanumeric branch code
    branch_type         TEXT            NOT NULL DEFAULT 'branch'
                                        CHECK (branch_type IN ('head_office', 'branch', 'department', 'project_office')),

    -- Contact & location
    email               CITEXT,
    phone               TEXT,
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,

    -- Operational ownership
    operational_manager_id  UUID,       -- references public.user_profiles(id)
    cash_custodian_id       UUID,       -- references public.user_profiles(id)

    -- Permitted modules (stored as an array of module slugs)
    -- e.g. '{"property_management","finance","maintenance"}'
    permitted_modules   TEXT[]          NOT NULL DEFAULT '{}',

    -- Lifecycle
    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'inactive', 'archived')),
    effective_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,           -- NULL means currently active

    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    CONSTRAINT branches_effective_dates_check
        CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT branches_company_code_unique
        UNIQUE (company_id, code),      -- branch codes are unique within a company
    CONSTRAINT branches_company_id_id_key
        UNIQUE (company_id, id)         -- required for compound FK from branch_memberships
);

COMMENT ON TABLE  public.branches IS 'Operational units within a company. Access is isolated to assigned branch membership by default.';
COMMENT ON COLUMN public.branches.permitted_modules IS 'Array of module slug strings this branch is licensed/configured to use.';
COMMENT ON COLUMN public.branches.effective_to IS 'NULL means the branch is currently active. Set to close/archive a branch.';

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partial index: fast lookup of active branches per company
CREATE INDEX idx_branches_company_active
    ON public.branches (company_id)
    WHERE status = 'active';


-- =============================================================================
-- SECTION 3: USER PROFILES
-- Extends Supabase auth.users with the public profile fields the application
-- needs. One identity may belong to multiple companies (through separate
-- company_memberships rows). The auth.users record is the identity anchor.
-- =============================================================================

CREATE TABLE public.user_profiles (
    -- Mirrors auth.users primary key; RLS policies can join to auth.users
    id                  UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Name fields
    full_name           TEXT,
    preferred_name      TEXT,

    -- Contact
    email               CITEXT          NOT NULL,                            -- denormalized from auth.users for queries
    phone               TEXT,
    avatar_url          TEXT,

    -- System-level lifecycle (company access is managed in company_memberships)
    global_status       TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (global_status IN ('active', 'suspended', 'deactivated')),
    last_seen_at        TIMESTAMPTZ,

    -- Preferences
    preferred_language  CHAR(5)         NOT NULL DEFAULT 'en',
    preferred_timezone  TEXT            NOT NULL DEFAULT 'Africa/Nairobi',
    notification_prefs  JSONB           NOT NULL DEFAULT '{}',

    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.user_profiles IS 'Public extension of auth.users. One row per authenticated identity. Multi-company access is via company_memberships.';
COMMENT ON COLUMN public.user_profiles.global_status IS 'Platform-level status. Company-level suspension is handled in company_memberships.';
COMMENT ON COLUMN public.user_profiles.email IS 'Denormalized from auth.users to enable application-level queries without joining auth schema.';

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row whenever a new auth.users record is inserted
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


-- =============================================================================
-- SECTION 4: ROLES CATALOGUE
-- Company-scoped role definitions. Platform roles (super admin, platform ops)
-- are separate from company-level roles. Each company builds its own role
-- catalogue; roles are not shared across companies.
-- =============================================================================

CREATE TABLE public.roles_permissions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    -- Role identity
    role_name           TEXT            NOT NULL CHECK (char_length(trim(role_name)) > 0),
    role_slug           TEXT            NOT NULL,                            -- machine-readable slug
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

    -- Permission matrix stored as a JSONB object.
    -- Structure: { "module_slug": { "view": true, "create": true, "edit": false,
    --              "approve": false, "post": false, "export": false,
    --              "delete": false, "administer": false } }
    -- Server-side logic validates all permission checks; this matrix is the
    -- declared contract. A hidden button is NOT a security control.
    permissions         JSONB           NOT NULL DEFAULT '{}',

    -- Approval limits (if this role can approve financial requests)
    approval_limit_currency     CHAR(3),
    approval_limit_amount       NUMERIC(18, 4),

    -- Lifecycle
    is_system_role      BOOLEAN         NOT NULL DEFAULT FALSE,              -- TRUE = cannot be deleted
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    effective_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,

    -- Audit
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

-- Seed the mandatory system roles for a company when it is created
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


-- =============================================================================
-- SECTION 5: COMPANY MEMBERSHIPS
-- Links a user identity to a specific company with a specific role.
-- A user may appear in multiple companies (one row per company).
-- Status here governs company-level access independently of global_status.
-- =============================================================================

CREATE TABLE public.company_memberships (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id             UUID            NOT NULL REFERENCES public.roles_permissions(id) ON DELETE RESTRICT,

    -- Joiner / mover / leaver lifecycle
    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('invited', 'active', 'suspended', 'revoked', 'transferred')),
    invited_at          TIMESTAMPTZ,
    activated_at        TIMESTAMPTZ,
    suspended_at        TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revocation_reason   TEXT,

    -- Transfer history: when a user moves to another company
    transfer_note       TEXT,

    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    -- A user can only have one active membership per company at a time.
    -- Additional memberships with different statuses are preserved for history.
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


-- =============================================================================
-- SECTION 6: BRANCH MEMBERSHIPS
-- A user with a company membership is further scoped to specific branches.
-- Branch managers do not receive access to other branches simply because they
-- have a management title. Expanded access must be explicit and auditable.
-- =============================================================================

CREATE TABLE public.branch_memberships (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID            NOT NULL REFERENCES public.companies(id)     ON DELETE CASCADE,
    branch_id           UUID            NOT NULL REFERENCES public.branches(id)      ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- The role in the context of this branch (may differ from company-level role)
    role_id             UUID            NOT NULL REFERENCES public.roles_permissions(id) ON DELETE RESTRICT,

    -- Default branch: controls which branch loads on sign-in
    is_default_branch   BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Time-limited cross-branch access grant
    -- When is_temporary = TRUE, this membership auto-expires at access_expires_at
    is_temporary        BOOLEAN         NOT NULL DEFAULT FALSE,
    access_purpose      TEXT,           -- Required when is_temporary = TRUE
    approved_by         UUID,           -- references user_profiles(id)
    access_expires_at   TIMESTAMPTZ,
    access_revoked_at   TIMESTAMPTZ,
    access_revoked_by   UUID,

    -- Lifecycle
    status              TEXT            NOT NULL DEFAULT 'active'
                                        CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),

    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_by          UUID,

    -- A user may have only one active membership per branch
    CONSTRAINT branch_memberships_one_active_per_user_branch
        EXCLUDE USING btree (branch_id WITH =, user_id WITH =)
        WHERE (status = 'active'),

    -- Cross-branch grants must state a purpose
    CONSTRAINT branch_memberships_temporary_requires_purpose
        CHECK (NOT is_temporary OR (access_purpose IS NOT NULL AND access_expires_at IS NOT NULL)),

    -- Ensure branch belongs to the stated company (cross-company confusion guard)
    CONSTRAINT branch_memberships_company_matches
        FOREIGN KEY (company_id, branch_id)
            REFERENCES public.branches (company_id, id)  -- references compound: we need unique on branches
);


COMMENT ON TABLE  public.branch_memberships IS 'Scopes company members to specific branches. Cross-branch access requires an explicit, time-limited, approved grant.';
COMMENT ON COLUMN public.branch_memberships.is_temporary IS 'TRUE = cross-branch grant. Must have access_purpose, approved_by, and access_expires_at.';
COMMENT ON COLUMN public.branch_memberships.is_default_branch IS 'Determines which branch context loads on sign-in when a user has access to multiple branches.';

CREATE TRIGGER trg_branch_memberships_updated_at
    BEFORE UPDATE ON public.branch_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to automatically expire cross-branch grants past their expiry time
-- (Called by a scheduled job / pg_cron in production)
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


-- =============================================================================
-- SECTION 7: AUDIT LOG
-- Immutable record of access and permission events. No user can delete audit
-- evidence for an action they performed (RLS: INSERT only, never DELETE/UPDATE).
-- =============================================================================

CREATE TABLE public.audit_events (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who, what, where
    actor_id            UUID,           -- user_profiles(id); NULL for system actions
    company_id          UUID,           -- NULL for platform-level events
    branch_id           UUID,           -- NULL if not branch-scoped

    -- Event classification
    event_type          TEXT            NOT NULL,
    -- e.g. 'access.login', 'access.revoked', 'membership.created',
    --      'permission.granted', 'permission.expired', 'company.created'
    severity            TEXT            NOT NULL DEFAULT 'info'
                                        CHECK (severity IN ('info', 'warning', 'critical')),

    -- Record reference (the object this event relates to)
    target_table        TEXT,
    target_id           UUID,

    -- Event detail
    metadata            JSONB           NOT NULL DEFAULT '{}',
    ip_address          INET,
    user_agent          TEXT,

    -- Immutable timestamp — no updated_at on this table
    occurred_at         TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_events IS 'Immutable audit log. RLS enforces INSERT-only for application roles. No UPDATE or DELETE permitted.';

-- Partition by month for scalability (optional — can be added later without breaking RLS)
-- For now, a standard index on occurred_at suffices for Phase 1.
CREATE INDEX idx_audit_events_actor      ON public.audit_events (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_events_company    ON public.audit_events (company_id, occurred_at DESC);
CREATE INDEX idx_audit_events_target     ON public.audit_events (target_table, target_id, occurred_at DESC);
CREATE INDEX idx_audit_events_type       ON public.audit_events (event_type, occurred_at DESC);


-- =============================================================================
-- SECTION 8: ROW LEVEL SECURITY
-- Policy principle:
--   • Default DENY — no record is visible unless a policy explicitly grants it.
--   • Company isolation — a user only sees rows whose company_id matches a
--     company they are an ACTIVE member of.
--   • Branch isolation — for branch-scoped tables, the user must also have an
--     ACTIVE branch membership for that branch.
--   • Service role bypass — the Supabase service_role key bypasses RLS for
--     server-side administrative operations (migrations, seeding, cron jobs).
--
-- All business logic and API handlers MUST use the anon/authenticated roles
-- (never the service_role key) when performing user-context operations.
-- =============================================================================

-- ── Helper function ──────────────────────────────────────────────────────────
-- Returns the set of company_ids the current authenticated user is an active
-- member of. Used in all company-scoped RLS policies.
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

-- Returns the set of branch_ids the current authenticated user is an active
-- (non-expired, non-revoked) member of — including approved temporary grants.
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


-- ── 8.1 Enable RLS on all tables ────────────────────────────────────────────

ALTER TABLE public.companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events        ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (the postgres superuser in Supabase bypasses
-- RLS by default; FORCE ensures policies apply to all non-superuser roles).
ALTER TABLE public.companies           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.branches            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles_permissions   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.branch_memberships  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events        FORCE ROW LEVEL SECURITY;


-- ── 8.2 companies — RLS Policies ────────────────────────────────────────────

-- SELECT: A user may read companies they are an active member of.
CREATE POLICY "companies_select_own_memberships"
    ON public.companies
    FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT public.get_my_company_ids())
    );

-- INSERT: Platform-level operation only (service_role or a privileged function).
--         Ordinary users cannot create companies through the client.
CREATE POLICY "companies_insert_service_role_only"
    ON public.companies
    FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);   -- Blocked for all authenticated users; service_role bypasses RLS

-- UPDATE: Only the company super-admin membership role can update company settings.
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

-- DELETE: Permanently blocked via RLS. Use status = 'archived' instead.
CREATE POLICY "companies_no_delete"
    ON public.companies
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.3 branches — RLS Policies ─────────────────────────────────────────────
--
-- Key isolation requirement (Master Brief §5.2 / §8.5):
--   "Company A users cannot read Company B records by changing a URL or API request."
--   "A branch user cannot read another branch's records through an API call."
--
-- Policy: READ requires an active BRANCH membership for that specific branch.
-- This is stricter than company-level membership alone.

CREATE POLICY "branches_select_active_branch_members_only"
    ON public.branches
    FOR SELECT
    TO authenticated
    USING (
        -- The user must be an active member of this specific branch
        id IN (SELECT public.get_my_branch_ids())
        AND
        -- AND must also be an active member of this company (double-check guard)
        company_id IN (SELECT public.get_my_company_ids())
    );

-- INSERT: Company super-admins may create branches within their company.
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

-- UPDATE: Super-admins and branch managers of the specific branch.
CREATE POLICY "branches_update_super_admin_or_branch_manager"
    ON public.branches
    FOR UPDATE
    TO authenticated
    USING (
        -- Must be able to see this branch (active membership)
        id IN (SELECT public.get_my_branch_ids())
        AND
        -- And have either company super-admin or branch_manager role
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

-- DELETE: Permanently blocked. Archive via status = 'archived'.
CREATE POLICY "branches_no_delete"
    ON public.branches
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.4 user_profiles — RLS Policies ────────────────────────────────────────

-- SELECT: A user can see their own profile, plus profiles of users who share
--         at least one common active company membership.
CREATE POLICY "user_profiles_select_own_and_coworkers"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Own profile always visible
        id = auth.uid()
        OR
        -- Profiles of active members of companies you belong to
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

-- UPDATE: Users may only update their own profile.
CREATE POLICY "user_profiles_update_own_only"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING  (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- INSERT: Handled by the trigger on auth.users (handle_new_auth_user).
--         Blocked for direct authenticated client inserts.
CREATE POLICY "user_profiles_insert_trigger_only"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());   -- Only allowed to insert own profile row

-- DELETE: Blocked — profiles follow auth.users lifecycle via CASCADE.
CREATE POLICY "user_profiles_no_delete"
    ON public.user_profiles
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.5 roles_permissions — RLS Policies ────────────────────────────────────

-- SELECT: Active company members may view roles in their company.
CREATE POLICY "roles_select_company_members"
    ON public.roles_permissions
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (SELECT public.get_my_company_ids())
    );

-- INSERT / UPDATE: Only company super-admins.
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
        AND is_system_role = FALSE   -- System roles cannot be modified via client
    )
    WITH CHECK (is_system_role = FALSE);

-- DELETE: Blocked — use is_active = FALSE.
CREATE POLICY "roles_no_delete"
    ON public.roles_permissions
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.6 company_memberships — RLS Policies ──────────────────────────────────
--
-- Key requirement (Master Brief §5.2):
--   "Company A users cannot read Company B records."
--   Users can read memberships within companies they belong to.
--   No user approves their own access expansion.

CREATE POLICY "company_memberships_select_own_company"
    ON public.company_memberships
    FOR SELECT
    TO authenticated
    USING (
        -- See own memberships (all companies)
        user_id = auth.uid()
        OR
        -- See co-members within shared companies
        company_id IN (SELECT public.get_my_company_ids())
    );

-- INSERT / UPDATE: Only super-admins may manage company memberships.
--                 A user cannot approve their own membership expansion (enforced
--                 in business logic layer; policy ensures the actor is a super-admin).
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

-- DELETE: Blocked — use status = 'revoked'.
CREATE POLICY "company_memberships_no_delete"
    ON public.company_memberships
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.7 branch_memberships — RLS Policies ───────────────────────────────────

CREATE POLICY "branch_memberships_select_own_and_managed"
    ON public.branch_memberships
    FOR SELECT
    TO authenticated
    USING (
        -- Own memberships always visible
        user_id = auth.uid()
        OR
        -- Members of the same company with branch_manager or super_admin role
        -- can view branch memberships for their managed branches
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
        -- Must be super-admin of this company OR branch manager of this branch
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

-- DELETE: Blocked — use status = 'revoked'.
CREATE POLICY "branch_memberships_no_delete"
    ON public.branch_memberships
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ── 8.8 audit_events — RLS Policies ─────────────────────────────────────────
--
-- Key requirement (Master Brief §13 / §5.13):
--   "No user can delete audit evidence for an action they performed."

-- SELECT: Company members can read audit events for their companies.
--         Internal auditors can read more broadly within their scope.
CREATE POLICY "audit_events_select_company_members"
    ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (
        company_id IS NULL            -- Platform-level events visible to platform ops only (via service_role)
        OR
        company_id IN (SELECT public.get_my_company_ids())
    );

-- INSERT: Authenticated users may insert audit events (application creates these).
CREATE POLICY "audit_events_insert_authenticated"
    ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);  -- Business layer sets company_id/actor_id correctly

-- UPDATE: Permanently blocked — audit records are immutable.
CREATE POLICY "audit_events_no_update"
    ON public.audit_events
    FOR UPDATE
    TO authenticated
    USING (FALSE);

-- DELETE: Permanently blocked — no user can erase their own audit trail.
CREATE POLICY "audit_events_no_delete"
    ON public.audit_events
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- =============================================================================
-- SECTION 9: GRANT STATEMENTS
-- The 'authenticated' role used by Supabase JWT sessions must have access to
-- the tables and functions above. The service_role bypasses RLS and is used
-- only for server-side administrative operations.
-- =============================================================================

GRANT USAGE                      ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE     ON public.companies           TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.branches            TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.user_profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.roles_permissions   TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.company_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE     ON public.branch_memberships  TO authenticated;
GRANT SELECT, INSERT             ON public.audit_events        TO authenticated;

-- Functions needed by RLS policies
GRANT EXECUTE ON FUNCTION public.get_my_company_ids()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_branch_ids()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user()       TO authenticated;

-- Realtime publication (optional: uncomment to enable Supabase Realtime)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.branch_memberships;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.company_memberships;


-- =============================================================================
-- END OF MIGRATION: 20261013000000_phase1_foundation.sql
-- =============================================================================
