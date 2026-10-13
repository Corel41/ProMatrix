-- Migration: 20261013200100_seed_sample_employees.sql
-- Seed 3 sample real estate staff records for HR & Payroll testing

DO $$
DECLARE
    v_company_id UUID;
    v_branch_id  UUID;
BEGIN
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id LIMIT 1;

    IF v_company_id IS NOT NULL AND v_branch_id IS NOT NULL THEN
        -- Insert 3 sample staff members
        INSERT INTO public.employees (
            company_id, branch_id, employee_no, first_name, last_name, id_number, kra_pin, nssf_no, nhif_no, phone, email, job_title, basic_salary, hire_date, status
        ) VALUES 
        (
            v_company_id, v_branch_id, 'EMP-001', 'Cornelius', 'Kibet', '28491028', 'A019283746Z', 'NSSF-928172', 'NHIF-1029384', '+254712345678', 'cornelius.kibet@promatrix.co.ke', 'Property Manager', 85000.00, '2023-01-15', 'active'
        ),
        (
            v_company_id, v_branch_id, 'EMP-002', 'Samuel', 'Ndung''u', '24910283', 'A028374619M', 'NSSF-837192', 'NHIF-2938471', '+254722123456', 'samuel.ndungu@promatrix.co.ke', 'Senior Site Caretaker', 42000.00, '2023-06-01', 'active'
        ),
        (
            v_company_id, v_branch_id, 'EMP-003', 'Grace', 'Wanjiru', '31920384', 'A039485721K', 'NSSF-746281', 'NHIF-3847291', '+254733987654', 'grace.wanjiru@promatrix.co.ke', 'Accounts & Payroll Officer', 60000.00, '2024-02-10', 'active'
        )
        ON CONFLICT (company_id, employee_no) DO NOTHING;
    END IF;
END $$;
