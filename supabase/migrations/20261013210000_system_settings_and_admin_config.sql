CREATE TABLE IF NOT EXISTS public.system_settings (
    id                                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                          UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id                           UUID            NOT NULL,

    slogan                              TEXT            DEFAULT 'Properties. People. Performance.',
    kra_pin                             TEXT            DEFAULT 'P051283921A',
    nssf_no                             TEXT            DEFAULT 'NSSF-492019',
    nhif_no                             TEXT            DEFAULT 'NHIF-820192',
    postal_code                         TEXT            DEFAULT '01000',
    logo_url                            TEXT,

    paybill_number                      TEXT            DEFAULT '522522, 400200',
    mpesa_shortcode                     TEXT            DEFAULT '522522',
    mpesa_consumer_key                  TEXT,
    mpesa_consumer_secret               TEXT,
    mpesa_passkey                       TEXT,
    mpesa_b2c_phone                     TEXT            DEFAULT '+254712345678',

    smtp_host                           TEXT            DEFAULT 'mail.propwings.co.ke',
    smtp_port                           INTEGER         DEFAULT 465,
    smtp_username                       TEXT            DEFAULT 'updates@propwings.co.ke',
    smtp_password                       TEXT            DEFAULT '********',
    smtp_sender_email                   TEXT            DEFAULT 'updates@propwings.co.ke',
    smtp_alert_emails                   TEXT            DEFAULT 'admin@promatrix.co.ke, accounts@promatrix.co.ke',
    smtp_use_ssl                        BOOLEAN         DEFAULT TRUE,

    sms_sender_id                       TEXT            DEFAULT 'PROPMATRIX',
    sms_api_key                         TEXT,
    sms_gateway_url                     TEXT            DEFAULT 'https://api.mobilesasa.com/v1/send/',

    approval_payment_receipt_limit      NUMERIC(14, 2)  NOT NULL DEFAULT 100000.00,
    approval_expense_voucher_limit      NUMERIC(14, 2)  NOT NULL DEFAULT 50000.00,
    approval_landlord_remittance_limit  NUMERIC(14, 2)  NOT NULL DEFAULT 200000.00,
    approval_deposit_refund_limit       NUMERIC(14, 2)  NOT NULL DEFAULT 50000.00,
    require_maker_checker               BOOLEAN         NOT NULL DEFAULT TRUE,

    created_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by                          UUID,
    updated_by                          UUID,

    CONSTRAINT system_settings_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT system_settings_company_branch_key
        UNIQUE (company_id, branch_id)
);

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_branch_members" ON public.system_settings;
CREATE POLICY "system_settings_select_branch_members" ON public.system_settings
    FOR SELECT TO authenticated
    USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DROP POLICY IF EXISTS "system_settings_insert_branch_members" ON public.system_settings;
CREATE POLICY "system_settings_insert_branch_members" ON public.system_settings
    FOR INSERT TO authenticated
    WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DROP POLICY IF EXISTS "system_settings_update_branch_members" ON public.system_settings;
CREATE POLICY "system_settings_update_branch_members" ON public.system_settings
    FOR UPDATE TO authenticated
    USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()))
    WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

DO $$
DECLARE
    v_comp_id UUID;
    v_br_id   UUID;
BEGIN
    SELECT id INTO v_comp_id FROM public.companies LIMIT 1;
    SELECT id INTO v_br_id FROM public.branches WHERE company_id = v_comp_id LIMIT 1;

    IF v_comp_id IS NOT NULL AND v_br_id IS NOT NULL THEN
        INSERT INTO public.system_settings (
            company_id, branch_id, slogan, kra_pin, nssf_no, nhif_no, postal_code,
            paybill_number, mpesa_shortcode, mpesa_b2c_phone,
            smtp_host, smtp_port, smtp_username, smtp_sender_email, smtp_alert_emails,
            sms_sender_id, require_maker_checker
        ) VALUES (
            v_comp_id, v_br_id, 'Properties. People. Performance.', 'P051283921A', 'NSSF-492019', 'NHIF-820192', '01000',
            '522522, 400200', '522522', '+254712345678',
            'mail.propwings.co.ke', 465, 'updates@propwings.co.ke', 'updates@propwings.co.ke', 'admin@promatrix.co.ke',
            'PROPMATRIX', TRUE
        )
        ON CONFLICT (company_id, branch_id) DO NOTHING;
    END IF;
END $$;
