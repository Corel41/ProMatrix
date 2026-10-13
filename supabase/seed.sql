-- =============================================================================
-- ProMatrix: Seed Sample Data from Thika Database
-- =============================================================================

DO $$
DECLARE
    v_user_id       UUID;
    v_company_id    UUID;
    v_branch_id     UUID;
    v_role_id       UUID;

    -- Landlord IDs
    v_ll_hazina     UUID := gen_random_uuid();
    v_ll_fariji     UUID := gen_random_uuid();
    v_ll_chimney    UUID := gen_random_uuid();
    v_ll_immanuel   UUID := gen_random_uuid();
    v_ll_plot65     UUID := gen_random_uuid();

    -- Property IDs
    v_prop_hazina   UUID := gen_random_uuid();
    v_prop_fariji   UUID := gen_random_uuid();
    v_prop_chimney  UUID := gen_random_uuid();
    v_prop_immanuel UUID := gen_random_uuid();
    v_prop_plot65   UUID := gen_random_uuid();
    v_prop_chania_g UUID := gen_random_uuid();
    v_prop_chania_v UUID := gen_random_uuid();
    v_prop_karura   UUID := gen_random_uuid();
    v_prop_beatrice UUID := gen_random_uuid();
    v_prop_kiganjo  UUID := gen_random_uuid();

BEGIN
    -- 1. Identify active user profile
    SELECT id INTO v_user_id FROM public.user_profiles ORDER BY created_at ASC LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user_profiles record found. Please sign up or check auth.';
    END IF;

    -- 2. Retrieve or create Company
    SELECT id INTO v_company_id FROM public.companies WHERE slug = 'promatrix-real-estate' LIMIT 1;
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (
            name, slug, legal_name, base_currency, reporting_currency, time_zone, fiscal_year_start, status, created_by
        ) VALUES (
            'ProMatrix Real Estate Agency',
            'promatrix-real-estate',
            'ProMatrix Properties Limited (Thika Operations)',
            'KES', 'KES', 'Africa/Nairobi', 1, 'active', v_user_id
        ) RETURNING id INTO v_company_id;

        -- Seed system roles
        PERFORM public.seed_company_system_roles(v_company_id, v_user_id);
    END IF;

    -- 3. Retrieve or create Head Office Branch
    SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id AND code = 'THK-01' LIMIT 1;
    IF v_branch_id IS NULL THEN
        INSERT INTO public.branches (
            company_id, name, code, branch_type, permitted_modules, status, created_by
        ) VALUES (
            v_company_id,
            'Thika Head Office',
            'THK-01',
            'head_office',
            ARRAY['registration', 'properties', 'finance', 'tenants'],
            'active',
            v_user_id
        ) RETURNING id INTO v_branch_id;
    END IF;

    -- 4. Ensure Super Admin role assignment
    SELECT id INTO v_role_id FROM public.roles_permissions 
    WHERE company_id = v_company_id AND role_slug = 'company_super_admin' LIMIT 1;

    -- Ensure Company Membership
    INSERT INTO public.company_memberships (company_id, user_id, role_id, status, created_by)
    VALUES (v_company_id, v_user_id, v_role_id, 'active', v_user_id)
    ON CONFLICT DO NOTHING;

    -- Ensure Branch Membership
    INSERT INTO public.branch_memberships (company_id, branch_id, user_id, role_id, is_default_branch, status, created_by)
    VALUES (v_company_id, v_branch_id, v_user_id, v_role_id, TRUE, 'active', v_user_id)
    ON CONFLICT DO NOTHING;

    -- 5. Seed Standard Charge Types Catalog
    INSERT INTO public.charge_types (company_id, code, name, description, is_compulsory, is_refundable, is_commissionable, is_recurring, allocation_priority)
    VALUES
        (v_company_id, '001', 'Rent', 'Monthly Space Rent', TRUE, FALSE, TRUE, TRUE, 30),
        (v_company_id, '002', 'Water Bill', 'Metered Water Consumption', FALSE, FALSE, FALSE, FALSE, 10),
        (v_company_id, '004', 'Rent Deposit', 'Refundable Security Deposit', TRUE, TRUE, FALSE, FALSE, 40),
        (v_company_id, '005', 'Water Deposit', 'Refundable Water Meter Deposit', TRUE, TRUE, FALSE, FALSE, 45),
        (v_company_id, '006', 'Electricity Deposit', 'Refundable Power Deposit', TRUE, TRUE, FALSE, FALSE, 50),
        (v_company_id, '009', 'Service Charge', 'Common Area Maintenance', TRUE, FALSE, FALSE, TRUE, 20),
        (v_company_id, '017', 'Garbage Collection', 'Sanitation & Refuse Removal', TRUE, FALSE, FALSE, TRUE, 15),
        (v_company_id, '035', 'Default Penalty', 'Late Rent Payment Penalty Fee', FALSE, FALSE, TRUE, FALSE, 25)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- 6. Seed 5 Representative Landlords from Thika DB
    INSERT INTO public.landlords (
        id, company_id, branch_id, landlord_no, surname, other_names, id_or_registration_no, tax_pin, phone, email,
        bank_name, bank_branch, bank_account_no, bank_account_name, remittance_mode, status, created_by
    ) VALUES
        (v_ll_hazina, v_company_id, v_branch_id, 'L001', 'Hazina Investment Company', 'Limited', 'CPR/2012/89421', 'P051239841K', '+254722000001', 'hazina@investments.co.ke', 'Equity Bank', 'Thika Supreme', '0090291437119', 'Hazina Investment Co Ltd', 'eft', 'active', v_user_id),
        (v_ll_fariji, v_company_id, v_branch_id, 'L003', 'Muthende', 'Joseph Wandurua', '10874891', 'A002391048M', '+254780479320', 'jmuthende@gmail.com', 'Co-operative Bank', 'Thika Town', '01129384729100', 'Joseph Wandurua Muthende', 'eft', 'active', v_user_id),
        (v_ll_chimney, v_company_id, v_branch_id, 'L005', 'Wachira', 'James Gichuhi', '12093842', 'A019284729L', '+254721948291', 'james.wachira@yahoo.com', 'KCB Bank', 'Nanyuki Branch', '1102938471', 'James Gichuhi Wachira', 'eft', 'active', v_user_id),
        (v_ll_immanuel, v_company_id, v_branch_id, 'L007', 'Mbuguah', 'Peter Muchai', '04313844', 'A013833816R', '+254722433077', 'pmbuguah@gmail.com', 'NCBA Bank', 'Thika Section 9', '40029384192', 'Peter Muchai Mbuguah', 'eft', 'active', v_user_id),
        (v_ll_plot65, v_company_id, v_branch_id, 'L028', 'Njoroge', 'Alice Wanjiru', '28200037', 'A014829104Z', '+254727945129', 'alice.njoroge@yahoo.com', 'Absa Bank Kenya', 'Thika Branch', '0309284712', 'Alice Wanjiru Njoroge', 'eft', 'active', v_user_id)
    ON CONFLICT (company_id, landlord_no) DO NOTHING;

    -- Fetch actual landlord IDs (in case they already exist)
    SELECT id INTO v_ll_hazina FROM public.landlords WHERE landlord_no = 'L001' AND company_id = v_company_id;
    SELECT id INTO v_ll_fariji FROM public.landlords WHERE landlord_no = 'L003' AND company_id = v_company_id;
    SELECT id INTO v_ll_chimney FROM public.landlords WHERE landlord_no = 'L005' AND company_id = v_company_id;
    SELECT id INTO v_ll_immanuel FROM public.landlords WHERE landlord_no = 'L007' AND company_id = v_company_id;
    SELECT id INTO v_ll_plot65 FROM public.landlords WHERE landlord_no = 'L028' AND company_id = v_company_id;

    -- 7. Seed 10 Representative Properties from Thika DB
    INSERT INTO public.properties (
        id, company_id, branch_id, landlord_id, property_code, name, lr_number, property_type, location_description, city,
        commission_rate, commission_type, commission_basis, is_vatable, remittance_day, caretaker_name, caretaker_phone, parking_spaces, parking_fee, total_floors, status, created_by
    ) VALUES
        (v_prop_hazina, v_company_id, v_branch_id, v_ll_hazina, 'HAZINA FLATS', 'Hazina Flats', 'LR-THIKA-SEC9-102', 'residential', 'Runda Estate, Thika', 'Thika', 6.50, 'percentage', 'collected', TRUE, 10, 'Margaret Njeri', '+254720111222', 12, 1000.00, 4, 'active', v_user_id),
        (v_prop_fariji, v_company_id, v_branch_id, v_ll_fariji, 'FARIJI HOUSE', 'Fariji House', 'LR-WITEITHIE-BLOCK-45', 'residential', 'Witeithie, Along Superhighway', 'Thika', 7.50, 'percentage', 'collected', TRUE, 10, 'Dian Wangui', '+254721333444', 8, 500.00, 3, 'active', v_user_id),
        (v_prop_chimney, v_company_id, v_branch_id, v_ll_chimney, 'CHIMNEY RISE', 'Chimney Rise Estate', 'LR-NANYUKI-EST-88', 'residential', 'Nanyuki Outskirts', 'Nanyuki', 5.00, 'percentage', 'collected', TRUE, 10, 'Kibet Rotich', '+254722555666', 20, 0.00, 2, 'active', v_user_id),
        (v_prop_immanuel, v_company_id, v_branch_id, v_ll_immanuel, 'IMMANUEL APARTMENT', 'Immanuel Apartments', 'LR-NGOINGWA-EST-71', 'residential', 'Ngoingwa Estate', 'Thika', 5.00, 'percentage', 'collected', TRUE, 10, 'Norah Chemtai', '+254723777888', 15, 1500.00, 5, 'active', v_user_id),
        (v_prop_plot65, v_company_id, v_branch_id, v_ll_plot65, 'PLOT 65', 'Plot 65 Commercial Complex', 'LR-THIKA-CBD-65', 'commercial', 'Thika CBD Central', 'Thika', 5.00, 'percentage', 'collected', TRUE, 1, 'John Muriithi', '+254724999000', 10, 2000.00, 4, 'active', v_user_id),
        (v_prop_chania_g, v_company_id, v_branch_id, v_ll_hazina, 'CHANIA GARDENS', 'Chania Gardens Ngoingwa', 'LR-NGOINGWA-GARDENS-14', 'residential', 'Ngoingwa Gardens Phase 2', 'Thika', 7.50, 'percentage', 'collected', TRUE, 10, 'Simon Kimani', '+254725111333', 18, 1000.00, 4, 'active', v_user_id),
        (v_prop_chania_v, v_company_id, v_branch_id, v_ll_fariji, 'CHANIA VILLAGE', 'Chania Village Complex', 'LR-CHANIA-VILL-90', 'mixed_use', 'Near Chania River', 'Thika', 7.50, 'percentage', 'collected', TRUE, 10, 'Alice Nyambura', '+254726222444', 14, 1200.00, 3, 'active', v_user_id),
        (v_prop_karura, v_company_id, v_branch_id, v_ll_chimney, 'KARURA HOUSE', 'Karura House', 'LR-MAKONGENI-PH13-10', 'residential', 'Makongeni Phase 13', 'Thika', 5.00, 'percentage', 'collected', TRUE, 10, 'Nancy Wahu', '+254727333555', 6, 800.00, 3, 'active', v_user_id),
        (v_prop_beatrice, v_company_id, v_branch_id, v_ll_immanuel, 'BEATRICE-LANDLESS', 'Beatrice Court', 'LR-LANDLESS-PH3-27', 'residential', 'Landless Estate', 'Thika', 10.00, 'percentage', 'collected', TRUE, 10, 'Samuel Ndung''u', '+254728444666', 10, 0.00, 2, 'active', v_user_id),
        (v_prop_kiganjo, v_company_id, v_branch_id, v_ll_plot65, 'KIGANJO-RUHENI', 'Kiganjo Ruheni Heights', 'LR-KIGANJO-SEC4-18', 'residential', 'Kiganjo Town Center', 'Thika', 8.00, 'percentage', 'collected', TRUE, 10, 'David Mwangi', '+254729555777', 8, 500.00, 3, 'active', v_user_id)
    ON CONFLICT (branch_id, property_code) DO NOTHING;

    -- Fetch actual property IDs (in case they already exist)
    SELECT id INTO v_prop_hazina FROM public.properties WHERE property_code = 'HAZINA FLATS' AND branch_id = v_branch_id;
    SELECT id INTO v_prop_immanuel FROM public.properties WHERE property_code = 'IMMANUEL APARTMENT' AND branch_id = v_branch_id;


    -- 8. Seed 20 Representative Units for Hazina Flats & Immanuel Apartments
    INSERT INTO public.units (
        company_id, branch_id, property_id, unit_number, unit_category, unit_type, floor_level,
        base_rent_rate, rent_deposit_rate, water_deposit_rate, electricity_deposit_rate, service_charge_rate, garbage_fee_rate,
        water_meter_no, electricity_meter_no, is_occupied, status, created_by
    ) VALUES
        -- Hazina Flats Units (Bedsitters & 1 Bedrooms)
        (v_company_id, v_branch_id, v_prop_hazina, 'B1', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-001', 'KPLC-890214', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B2', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-002', 'KPLC-890215', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B3', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-003', 'KPLC-890216', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B4', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-004', 'KPLC-890217', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B5', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-005', 'KPLC-890218', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B6', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-006', 'KPLC-890219', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B7', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-007', 'KPLC-890220', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B8', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-008', 'KPLC-890221', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B9', 'BD', 'residential', 'Ground Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-009', 'KPLC-890222', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, 'B10', 'BD', 'residential', '1st Floor', 6500.00, 6500.00, 2500.00, 0.00, 100.00, 100.00, 'WM-HZ-010', 'KPLC-890223', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, '1', '1B', 'residential', '1st Floor', 9000.00, 9000.00, 3000.00, 0.00, 200.00, 100.00, 'WM-HZ-011', 'KPLC-890224', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, '2', '1B', 'residential', '1st Floor', 9000.00, 9000.00, 3000.00, 0.00, 200.00, 100.00, 'WM-HZ-012', 'KPLC-890225', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, '3', '1B', 'residential', '2nd Floor', 9000.00, 9000.00, 3000.00, 0.00, 200.00, 100.00, 'WM-HZ-013', 'KPLC-890226', FALSE, 'vacant', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, '4', '1B', 'residential', '2nd Floor', 9000.00, 9000.00, 3000.00, 0.00, 200.00, 100.00, 'WM-HZ-014', 'KPLC-890227', FALSE, 'vacant', v_user_id),
        (v_company_id, v_branch_id, v_prop_hazina, '5', '1B', 'residential', '2nd Floor', 9000.00, 9000.00, 3000.00, 0.00, 200.00, 100.00, 'WM-HZ-015', 'KPLC-890228', FALSE, 'vacant', v_user_id),
        
        -- Immanuel Apartments Units (2 Bedrooms & 3 Bedrooms)
        (v_company_id, v_branch_id, v_prop_immanuel, 'A1', '2B', 'residential', 'Ground Floor', 16000.00, 16000.00, 3000.00, 0.00, 500.00, 150.00, 'WM-IMM-001', 'KPLC-920101', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_immanuel, 'A2', '2B', 'residential', 'Ground Floor', 16000.00, 16000.00, 3000.00, 0.00, 500.00, 150.00, 'WM-IMM-002', 'KPLC-920102', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_immanuel, 'B1', '2B', 'residential', '1st Floor', 16000.00, 16000.00, 3000.00, 0.00, 500.00, 150.00, 'WM-IMM-003', 'KPLC-920103', TRUE, 'occupied', v_user_id),
        (v_company_id, v_branch_id, v_prop_immanuel, 'B2', '2B', 'residential', '1st Floor', 16000.00, 16000.00, 3000.00, 0.00, 500.00, 150.00, 'WM-IMM-004', 'KPLC-920104', FALSE, 'vacant', v_user_id),
        (v_company_id, v_branch_id, v_prop_immanuel, 'C1', '3B', 'residential', '2nd Floor', 22000.00, 22000.00, 4000.00, 0.00, 700.00, 200.00, 'WM-IMM-005', 'KPLC-920105', FALSE, 'vacant', v_user_id)
    ON CONFLICT (property_id, unit_number) DO NOTHING;

    -- 9. Seed 6 Representative Tenants from Thika DB
    INSERT INTO public.tenants (
        company_id, branch_id, tenant_no, full_name, id_or_passport_no, phone, email,
        workplace, work_contact, next_of_kin_name, next_of_kin_phone, next_of_kin_relation,
        status, date_registered, created_by
    ) VALUES
        (v_company_id, v_branch_id, 'T00358', 'Byrum Alophonce Ongaya', '29481920', '+254727485379', 'byrum.ongaya@gmail.com', 'Bidco Africa Ltd', '+254700111222', 'Eunice Ongaya', '+254711333444', 'Spouse', 'active', '2023-03-02', v_user_id),
        (v_company_id, v_branch_id, 'T00364', 'Job Mugo Kahari', '28735965', '+254726353680', 'job.kahari@gmail.com', 'Del Monte Kenya', '+254700222333', 'Mercy Wanjiku', '+254722555666', 'Sister', 'active', '2023-01-03', v_user_id),
        (v_company_id, v_branch_id, 'T01364', 'Miriam Delight Wangui', '38094297', '+254757917728', 'miriam.wangui@yahoo.com', 'Kenyatta University Thika Campus', '+254700333444', 'David Njoroge', '+254733444555', 'Father', 'active', '2023-03-24', v_user_id),
        (v_company_id, v_branch_id, 'T00360', 'Kipyegon Geoffrey Koech', '31829471', '+254720987654', 'kipyegon.koech@gmail.com', 'Thika Level 5 Hospital', '+254700444555', 'Chebet Koech', '+254711888999', 'Spouse', 'active', '2023-03-02', v_user_id),
        (v_company_id, v_branch_id, 'T00361', 'Robin Kagina Maina', '27491028', '+254712345678', 'robin.kagina@outlook.com', 'BAT Kenya - Thika Plant', '+254700555666', 'Grace Maina', '+254722111222', 'Mother', 'active', '2023-03-02', v_user_id),
        (v_company_id, v_branch_id, 'T00362', 'Lucy Wairimu Gathong''a', '32910482', '+254728901234', 'lucy.gathonga@gmail.com', 'Broadway Bakeries Ltd', '+254700666777', 'Peter Gathong''a', '+254733222111', 'Brother', 'active', '2023-03-02', v_user_id)
    ON CONFLICT (company_id, tenant_no) DO NOTHING;

    -- 10. Seed Representative Active Leases for Occupied Units
    INSERT INTO public.leases (
        company_id, branch_id, property_id, unit_id, tenant_id,
        lease_no, start_date, end_date, rent_pay_day, agreed_rent,
        rent_deposit_held, water_deposit_held, elec_deposit_held,
        service_charge_agreed, garbage_fee_agreed, escalation_rate,
        escalation_period_months, status, created_by
    )
    SELECT
        v_company_id, v_branch_id, u.property_id, u.id, t.id,
        'LS-HZ-001', '2024-01-01', '2025-12-31', 5, 6500.00,
        6500.00, 2500.00, 0.00, 100.00, 100.00, 5.00, 12, 'active', v_user_id
    FROM public.units u, public.tenants t
    WHERE u.property_id = v_prop_hazina AND u.unit_number = 'B1' AND t.tenant_no = 'T00358'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.leases (
        company_id, branch_id, property_id, unit_id, tenant_id,
        lease_no, start_date, end_date, rent_pay_day, agreed_rent,
        rent_deposit_held, water_deposit_held, elec_deposit_held,
        service_charge_agreed, garbage_fee_agreed, escalation_rate,
        escalation_period_months, status, created_by
    )
    SELECT
        v_company_id, v_branch_id, u.property_id, u.id, t.id,
        'LS-HZ-002', '2024-02-01', '2026-01-31', 5, 6500.00,
        6500.00, 2500.00, 0.00, 100.00, 100.00, 5.00, 12, 'active', v_user_id
    FROM public.units u, public.tenants t
    WHERE u.property_id = v_prop_hazina AND u.unit_number = 'B2' AND t.tenant_no = 'T00364'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.leases (
        company_id, branch_id, property_id, unit_id, tenant_id,
        lease_no, start_date, end_date, rent_pay_day, agreed_rent,
        rent_deposit_held, water_deposit_held, elec_deposit_held,
        service_charge_agreed, garbage_fee_agreed, escalation_rate,
        escalation_period_months, status, created_by
    )
    SELECT
        v_company_id, v_branch_id, u.property_id, u.id, t.id,
        'LS-IMM-001', '2024-01-15', '2025-12-31', 5, 16000.00,
        16000.00, 3000.00, 0.00, 500.00, 150.00, 10.00, 12, 'active', v_user_id
    FROM public.units u, public.tenants t
    WHERE u.property_id = v_prop_immanuel AND u.unit_number = 'A1' AND t.tenant_no = 'T01364'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seeding successfully completed for Company %, Branch %, User %', v_company_id, v_branch_id, v_user_id;
END;
$$;

