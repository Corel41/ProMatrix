ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Mr.',
    ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT,
    ADD COLUMN IF NOT EXISTS next_of_kin_relation TEXT,
    ADD COLUMN IF NOT EXISTS annual_leave_days INT DEFAULT 21,
    ADD COLUMN IF NOT EXISTS sick_leave_days INT DEFAULT 30;
