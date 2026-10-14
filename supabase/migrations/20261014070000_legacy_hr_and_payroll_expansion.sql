ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Mr.',
    ADD COLUMN IF NOT EXISTS middle_name TEXT,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS marital_status TEXT,
    ADD COLUMN IF NOT EXISTS religion TEXT,
    ADD COLUMN IF NOT EXISTS ethnicity TEXT,
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent',
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
    ADD COLUMN IF NOT EXISTS bank_code TEXT,
    ADD COLUMN IF NOT EXISTS postal_address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS next_of_kin TEXT,
    ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT,
    ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT,
    ADD COLUMN IF NOT EXISTS relationship TEXT,
    ADD COLUMN IF NOT EXISTS next_of_kin_relation TEXT,
    ADD COLUMN IF NOT EXISTS allocated_leave_days INT DEFAULT 21,
    ADD COLUMN IF NOT EXISTS leave_balance INT DEFAULT 21,
    ADD COLUMN IF NOT EXISTS annual_leave_days INT DEFAULT 21,
    ADD COLUMN IF NOT EXISTS sick_leave_days INT DEFAULT 30;

ALTER TABLE public.payslips
    ADD COLUMN IF NOT EXISTS housing_levy NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS taxable_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS personal_relief NUMERIC(14, 2) NOT NULL DEFAULT 2400.00,
    ADD COLUMN IF NOT EXISTS insurance_relief NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank',
    ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
    ADD COLUMN IF NOT EXISTS bank_name TEXT;

CREATE TABLE IF NOT EXISTS public.payroll_deductions_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    payroll_run_id UUID,

    item_type TEXT NOT NULL CHECK (item_type IN ('earning', 'deduction')),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_recurring BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pde_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT pde_company_employee_fk
        FOREIGN KEY (company_id, employee_id)
        REFERENCES public.employees (company_id, id) ON DELETE CASCADE,
    CONSTRAINT pde_company_payroll_run_fk
        FOREIGN KEY (company_id, payroll_run_id)
        REFERENCES public.payroll_runs (company_id, id) ON DELETE CASCADE
);

CREATE TRIGGER trg_payroll_deductions_earnings_updated_at BEFORE UPDATE ON public.payroll_deductions_earnings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pde_company_branch ON public.payroll_deductions_earnings (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_pde_employee ON public.payroll_deductions_earnings (employee_id);
CREATE INDEX IF NOT EXISTS idx_pde_run ON public.payroll_deductions_earnings (payroll_run_id);

ALTER TABLE public.payroll_deductions_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions_earnings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pde_select_branch_members" ON public.payroll_deductions_earnings;
CREATE POLICY "pde_select_branch_members" ON public.payroll_deductions_earnings
    FOR SELECT TO authenticated
    USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DROP POLICY IF EXISTS "pde_insert_branch_members" ON public.payroll_deductions_earnings;
CREATE POLICY "pde_insert_branch_members" ON public.payroll_deductions_earnings
    FOR INSERT TO authenticated
    WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DROP POLICY IF EXISTS "pde_update_branch_members" ON public.payroll_deductions_earnings;
CREATE POLICY "pde_update_branch_members" ON public.payroll_deductions_earnings
    FOR UPDATE TO authenticated
    USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()))
    WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DROP POLICY IF EXISTS "pde_delete_branch_members" ON public.payroll_deductions_earnings;
CREATE POLICY "pde_delete_branch_members" ON public.payroll_deductions_earnings
    FOR DELETE TO authenticated
    USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));
