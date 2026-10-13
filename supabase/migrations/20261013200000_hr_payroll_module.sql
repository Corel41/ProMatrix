-- Migration: 20261013200000_hr_payroll_module.sql
-- Domain 7: HR, Staff Registry & Statutory Payroll Module
-- Multi-tenant compound foreign keys & Row-Level Security via get_my_branch_ids()

-- ── 1. Employees (Staff Registry) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    -- Code & KYC Identity
    employee_no             TEXT            NOT NULL,                         -- e.g. 'EMP-001'
    first_name              TEXT            NOT NULL CHECK (char_length(trim(first_name)) > 0),
    last_name               TEXT            NOT NULL CHECK (char_length(trim(last_name)) > 0),
    id_number               TEXT,                                            -- National ID / Passport
    kra_pin                 TEXT,                                            -- KRA Tax PIN
    nssf_no                 TEXT,                                            -- NSSF Member Number
    nhif_no                 TEXT,                                            -- NHIF Member Number

    -- Contact & Employment Details
    phone                   TEXT            NOT NULL,
    email                   TEXT,
    job_title               TEXT            NOT NULL DEFAULT 'Property Caretaker',
    basic_salary            NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (basic_salary >= 0),
    hire_date               DATE            NOT NULL DEFAULT CURRENT_DATE,
    status                  TEXT            NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave')),

    -- Audit
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT employees_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT employees_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT employees_company_no_key
        UNIQUE (company_id, employee_no)
);

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_employees_company_branch ON public.employees (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees (status);


-- ── 2. Payroll Runs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    -- Payroll Period
    period_month            SMALLINT        NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year             SMALLINT        NOT NULL CHECK (period_year >= 2000),

    -- Totals
    total_gross             NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_gross >= 0),
    total_net               NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_net >= 0),

    -- Workflow Status
    status                  TEXT            NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),

    -- Audit
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT payroll_runs_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT payroll_runs_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT payroll_runs_company_period_key
        UNIQUE (company_id, branch_id, period_year, period_month)
);

CREATE TRIGGER trg_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_branch ON public.payroll_runs (company_id, branch_id);


-- ── 3. Payslips (Individual Line Items) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payslips (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    payroll_run_id          UUID            NOT NULL,
    employee_id             UUID            NOT NULL,

    -- Remuneration Breakdown
    basic_salary            NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (basic_salary >= 0),
    allowances              NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (allowances >= 0),
    gross_pay               NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (gross_pay >= 0),

    -- Statutory Deductions (Kenya Tax / Social Security Model)
    paye_tax                NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (paye_tax >= 0),
    nhif_deduction          NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (nhif_deduction >= 0),
    nssf_deduction          NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (nssf_deduction >= 0),
    net_pay                 NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (net_pay >= 0),

    -- Audit
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT payslips_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT payslips_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT payslips_company_payroll_run_fk
        FOREIGN KEY (company_id, payroll_run_id)
        REFERENCES public.payroll_runs (company_id, id) ON DELETE CASCADE,
    CONSTRAINT payslips_company_employee_fk
        FOREIGN KEY (company_id, employee_id)
        REFERENCES public.employees (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT payslips_run_employee_key
        UNIQUE (payroll_run_id, employee_id)
);

CREATE TRIGGER trg_payslips_updated_at BEFORE UPDATE ON public.payslips
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payslips_company_branch ON public.payslips (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON public.payslips (payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips (employee_id);


-- ── 4. Row-Level Security (RLS) Multi-Tenant Policies ──────────────────────
ALTER TABLE public.employees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employees     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payslips      FORCE ROW LEVEL SECURITY;

-- Apply Branch-Scoped Policies using get_my_branch_ids() and get_my_company_ids()
DO $$
DECLARE
    tbl text;
    hr_tables text[] := ARRAY['employees', 'payroll_runs', 'payslips'];
BEGIN
    FOREACH tbl IN ARRAY hr_tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "%s_select_branch_members" ON public.%I;
            CREATE POLICY "%s_select_branch_members" ON public.%I
                FOR SELECT TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            DROP POLICY IF EXISTS "%s_insert_branch_members" ON public.%I;
            CREATE POLICY "%s_insert_branch_members" ON public.%I
                FOR INSERT TO authenticated
                WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            DROP POLICY IF EXISTS "%s_update_branch_members" ON public.%I;
            CREATE POLICY "%s_update_branch_members" ON public.%I
                FOR UPDATE TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()))
                WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            DROP POLICY IF EXISTS "%s_delete_branch_members" ON public.%I;
            CREATE POLICY "%s_delete_branch_members" ON public.%I
                FOR DELETE TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));
        ', tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl);
    END LOOP;
END;
$$;
