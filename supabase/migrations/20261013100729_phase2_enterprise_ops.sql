DROP TRIGGER IF EXISTS trg_audit_properties ON public.properties;
DROP TRIGGER IF EXISTS trg_audit_units ON public.units;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP FUNCTION IF EXISTS public.log_property_ops_audit_event() CASCADE;

CREATE TABLE public.landlords (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    landlord_no             TEXT            NOT NULL,
    surname                 TEXT            NOT NULL CHECK (char_length(trim(surname)) > 0),
    other_names             TEXT            NOT NULL,
    id_or_registration_no   TEXT,
    tax_pin                 TEXT,

    phone                   TEXT            NOT NULL,
    email                   CITEXT,
    postal_address          TEXT,
    postal_code             TEXT,
    next_of_kin_name        TEXT,
    next_of_kin_phone       TEXT,
    next_of_kin_relation    TEXT,

    bank_name               TEXT,
    bank_branch             TEXT,
    bank_account_no         TEXT,
    bank_account_name       TEXT,
    remittance_mode         TEXT            NOT NULL DEFAULT 'eft' CHECK (remittance_mode IN ('eft', 'rtgs', 'mpesa', 'cheque')),
    mpesa_phone             TEXT,

    status                  TEXT            NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT landlords_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT landlords_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT landlords_company_no_key
        UNIQUE (company_id, landlord_no)
);

CREATE TRIGGER trg_landlords_updated_at BEFORE UPDATE ON public.landlords
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_landlords_company_branch ON public.landlords (company_id, branch_id);

CREATE TABLE public.properties (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    landlord_id             UUID            NOT NULL,

    property_code           TEXT            NOT NULL,
    name                    TEXT            NOT NULL CHECK (char_length(trim(name)) > 0),
    lr_number               TEXT,
    property_type           TEXT            NOT NULL DEFAULT 'residential'
                                            CHECK (property_type IN ('residential', 'commercial', 'mixed_use', 'industrial', 'land')),
    location_description   TEXT,
    city                    TEXT            DEFAULT 'Thika',
    postal_address          TEXT,

    commission_rate         NUMERIC(5, 2)   NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0),
    commission_type         TEXT            NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
    commission_basis        TEXT            NOT NULL DEFAULT 'collected' CHECK (commission_basis IN ('collected', 'invoiced')),
    is_vatable              BOOLEAN         NOT NULL DEFAULT TRUE,
    remittance_day          SMALLINT        NOT NULL DEFAULT 10 CHECK (remittance_day BETWEEN 1 AND 31),

    officer_in_charge_id    UUID            REFERENCES public.user_profiles(id),
    caretaker_name          TEXT,
    caretaker_phone         TEXT,
    parking_spaces          INTEGER         NOT NULL DEFAULT 0 CHECK (parking_spaces >= 0),
    parking_fee             NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (parking_fee >= 0),
    total_floors            INTEGER         DEFAULT 1,

    status                  TEXT            NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT properties_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT properties_company_landlord_fk
        FOREIGN KEY (company_id, landlord_id)
        REFERENCES public.landlords (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT properties_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT properties_company_branch_id_key
        UNIQUE (company_id, branch_id, id),
    CONSTRAINT properties_branch_code_key
        UNIQUE (branch_id, property_code)
);

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_properties_company_branch ON public.properties (company_id, branch_id);
CREATE INDEX idx_properties_landlord ON public.properties (landlord_id);

CREATE TABLE public.units (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,

    unit_number             TEXT            NOT NULL CHECK (char_length(trim(unit_number)) > 0),
    unit_category           TEXT            NOT NULL DEFAULT '1B'
                                            CHECK (unit_category IN ('BD', '1B', '2B', '3B', '4B', 'SH', 'ST', 'OFF', 'DS', 'WH')),
    unit_type               TEXT            NOT NULL DEFAULT 'residential'
                                            CHECK (unit_type IN ('residential', 'commercial', 'industrial')),
    floor_level             TEXT            DEFAULT 'Ground Floor',
    bedrooms                NUMERIC(3, 1),
    bathrooms               NUMERIC(3, 1),
    square_footage          NUMERIC(10, 2),
    particulars             TEXT,

    base_rent_rate          NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (base_rent_rate >= 0),
    rent_deposit_rate       NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_deposit_rate >= 0),
    water_deposit_rate      NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (water_deposit_rate >= 0),
    electricity_deposit_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (electricity_deposit_rate >= 0),
    service_charge_rate     NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (service_charge_rate >= 0),
    garbage_fee_rate        NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (garbage_fee_rate >= 0),

    water_meter_no          TEXT,
    electricity_meter_no    TEXT,
    other_meter_no          TEXT,

    is_occupied             BOOLEAN         NOT NULL DEFAULT FALSE,
    status                  TEXT            NOT NULL DEFAULT 'vacant'
                                            CHECK (status IN ('vacant', 'occupied', 'reserved', 'under_maintenance', 'inactive')),

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT units_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE CASCADE,
    CONSTRAINT units_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT units_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT units_property_unit_number_key
        UNIQUE (property_id, unit_number)
);

CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_units_company_branch ON public.units (company_id, branch_id);
CREATE INDEX idx_units_property ON public.units (property_id);
CREATE INDEX idx_units_status ON public.units (property_id, status);

CREATE TABLE public.property_notes (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,

    notes                   TEXT            NOT NULL CHECK (char_length(trim(notes)) > 0),
    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),
    is_featured             BOOLEAN         NOT NULL DEFAULT FALSE,
    has_reminder            BOOLEAN         NOT NULL DEFAULT FALSE,
    reminder_date           DATE,
    status                  TEXT            NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT property_notes_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE CASCADE,
    CONSTRAINT property_notes_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_property_notes_updated_at BEFORE UPDATE ON public.property_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.charge_types (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

    code                    TEXT            NOT NULL,
    name                    TEXT            NOT NULL,
    description             TEXT,
    gl_account_code         TEXT,

    is_compulsory           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_refundable           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_commissionable       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_recurring            BOOLEAN         NOT NULL DEFAULT TRUE,
    is_agent_hold           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_percentage           BOOLEAN         NOT NULL DEFAULT FALSE,
    allocation_priority     INTEGER         NOT NULL DEFAULT 50,

    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT charge_types_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT charge_types_company_code_key
        UNIQUE (company_id, code)
);

CREATE TRIGGER trg_charge_types_updated_at BEFORE UPDATE ON public.charge_types
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.property_charge_settings (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    charge_type_id          UUID            NOT NULL,

    is_enabled              BOOLEAN         NOT NULL DEFAULT TRUE,
    is_compulsory           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_commissionable       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_recurring            BOOLEAN         NOT NULL DEFAULT TRUE,
    fixed_amount            NUMERIC(14, 2),
    rate_percentage         NUMERIC(5, 2),

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT prop_charges_company_prop_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE CASCADE,
    CONSTRAINT prop_charges_company_charge_fk
        FOREIGN KEY (company_id, charge_type_id)
        REFERENCES public.charge_types (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT prop_charges_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT prop_charges_unique
        UNIQUE (property_id, charge_type_id)
);

CREATE TRIGGER trg_property_charge_settings_updated_at BEFORE UPDATE ON public.property_charge_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.unit_charge_rates (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,
    charge_type_id          UUID            NOT NULL,

    amount                  NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT unit_charges_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE CASCADE,
    CONSTRAINT unit_charges_company_charge_fk
        FOREIGN KEY (company_id, charge_type_id)
        REFERENCES public.charge_types (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT unit_charges_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT unit_charges_unique
        UNIQUE (unit_id, charge_type_id)
);

CREATE TRIGGER trg_unit_charge_rates_updated_at BEFORE UPDATE ON public.unit_charge_rates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tenants (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    tenant_no               TEXT            NOT NULL,
    full_name               TEXT            NOT NULL CHECK (char_length(trim(full_name)) > 0),
    id_or_passport_no       TEXT            NOT NULL,
    phone                   TEXT            NOT NULL,
    email                   CITEXT,
    postal_address          TEXT,
    postal_code             TEXT,

    workplace               TEXT,
    work_contact            TEXT,

    next_of_kin_name        TEXT,
    next_of_kin_phone       TEXT,
    next_of_kin_relation    TEXT,

    status                  TEXT            NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exited', 'blacklisted')),
    date_registered         DATE            NOT NULL DEFAULT CURRENT_DATE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT tenants_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT tenants_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT tenants_company_tenant_no_key
        UNIQUE (company_id, tenant_no)
);

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tenants_company_branch ON public.tenants (company_id, branch_id);
CREATE INDEX idx_tenants_phone ON public.tenants (phone);

CREATE TABLE public.leases (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,
    tenant_id               UUID            NOT NULL,

    lease_no                TEXT            NOT NULL,
    start_date              DATE            NOT NULL,
    end_date                DATE,
    rent_pay_day            SMALLINT        NOT NULL DEFAULT 5 CHECK (rent_pay_day BETWEEN 1 AND 31),

    agreed_rent             NUMERIC(14, 2)  NOT NULL CHECK (agreed_rent >= 0),
    rent_deposit_held       NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_deposit_held >= 0),
    water_deposit_held      NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (water_deposit_held >= 0),
    elec_deposit_held       NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (elec_deposit_held >= 0),
    service_charge_agreed   NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (service_charge_agreed >= 0),
    garbage_fee_agreed      NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (garbage_fee_agreed >= 0),

    escalation_rate         NUMERIC(5, 2)   NOT NULL DEFAULT 0.00 CHECK (escalation_rate >= 0),
    escalation_period_months INTEGER        DEFAULT 12,
    next_review_date        DATE,

    status                  TEXT            NOT NULL DEFAULT 'active'
                                            CHECK (status IN ('active', 'terminated', 'transferred', 'expired')),
    terminated_at           TIMESTAMPTZ,
    termination_reason      TEXT,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT leases_company_tenant_fk
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.tenants (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT leases_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT leases_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT leases_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT leases_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT leases_unique_active_unit
        EXCLUDE USING btree (unit_id WITH =) WHERE (status = 'active')
);

CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON public.leases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_leases_company_branch ON public.leases (company_id, branch_id);
CREATE INDEX idx_leases_tenant ON public.leases (tenant_id);
CREATE INDEX idx_leases_unit ON public.leases (unit_id);

CREATE TABLE public.tenant_shifts (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    tenant_id               UUID            NOT NULL,
    old_lease_id            UUID            NOT NULL,
    new_lease_id            UUID,
    from_unit_id            UUID            NOT NULL,
    to_unit_id              UUID            NOT NULL,

    shift_date              DATE            NOT NULL DEFAULT CURRENT_DATE,
    shifting_fee            NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (shifting_fee >= 0),
    rent_deposit_top_up     NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_deposit_top_up >= 0),
    rent_deposit_refund     NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_deposit_refund >= 0),
    carried_forward_balance NUMERIC(14, 2)  NOT NULL DEFAULT 0.00,
    remarks                 TEXT,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT shifts_company_tenant_fk
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.tenants (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT shifts_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT shifts_company_from_unit_fk
        FOREIGN KEY (company_id, from_unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT shifts_company_to_unit_fk
        FOREIGN KEY (company_id, to_unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT shifts_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_tenant_shifts_updated_at BEFORE UPDATE ON public.tenant_shifts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tenant_exits (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,
    tenant_id               UUID            NOT NULL,
    lease_id                UUID            NOT NULL,

    notice_date             DATE,
    vacation_date           DATE            NOT NULL,

    total_deposit_held      NUMERIC(14, 2)  NOT NULL CHECK (total_deposit_held >= 0),
    rent_arrears_deducted   NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (rent_arrears_deducted >= 0),
    water_bills_deducted    NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (water_bills_deducted >= 0),
    repairs_deducted        NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (repairs_deducted >= 0),
    other_deductions        NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (other_deductions >= 0),
    net_refund_amount       NUMERIC(14, 2)  NOT NULL CHECK (net_refund_amount >= 0),

    is_refund_released      BOOLEAN         NOT NULL DEFAULT FALSE,
    refund_payment_mode     TEXT            CHECK (refund_payment_mode IN ('eft', 'mpesa', 'cheque', 'cash')),
    refund_reference_no     TEXT,
    refund_bank_account     TEXT,
    remarks                 TEXT,

    inspected_by            UUID            REFERENCES public.user_profiles(id),
    approved_by             UUID            REFERENCES public.user_profiles(id),
    approved_at             TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT exits_company_lease_fk
        FOREIGN KEY (company_id, lease_id)
        REFERENCES public.leases (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exits_company_tenant_fk
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.tenants (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exits_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exits_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exits_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_tenant_exits_updated_at BEFORE UPDATE ON public.tenant_exits
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.utility_meters (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,

    meter_type              TEXT            NOT NULL DEFAULT 'water' CHECK (meter_type IN ('water', 'electricity_postpaid', 'generator')),
    meter_number            TEXT            NOT NULL,
    initial_reading         NUMERIC(12, 2)  NOT NULL DEFAULT 0.00 CHECK (initial_reading >= 0),
    current_reading         NUMERIC(12, 2)  NOT NULL DEFAULT 0.00 CHECK (current_reading >= initial_reading),
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT meters_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE CASCADE,
    CONSTRAINT meters_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT meters_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT meters_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT meters_unit_type_unique
        UNIQUE (unit_id, meter_type)
);

CREATE TRIGGER trg_utility_meters_updated_at BEFORE UPDATE ON public.utility_meters
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.utility_readings (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,
    meter_id                UUID            NOT NULL,

    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),
    reading_date            DATE            NOT NULL DEFAULT CURRENT_DATE,
    previous_reading        NUMERIC(12, 2)  NOT NULL CHECK (previous_reading >= 0),
    current_reading         NUMERIC(12, 2)  NOT NULL CHECK (current_reading >= previous_reading),
    units_consumed          NUMERIC(12, 2)  GENERATED ALWAYS AS (current_reading - previous_reading) STORED,

    tariff_rate             NUMERIC(10, 2)  NOT NULL DEFAULT 150.00 CHECK (tariff_rate >= 0),
    meter_rent              NUMERIC(10, 2)  NOT NULL DEFAULT 0.00 CHECK (meter_rent >= 0),
    sewerage_amount         NUMERIC(10, 2)  NOT NULL DEFAULT 0.00 CHECK (sewerage_amount >= 0),
    total_charge_amount     NUMERIC(14, 2)  NOT NULL CHECK (total_charge_amount >= 0),
    is_billed               BOOLEAN         NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT readings_company_meter_fk
        FOREIGN KEY (company_id, meter_id)
        REFERENCES public.utility_meters (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT readings_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT readings_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT readings_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT readings_meter_period_unique
        UNIQUE (meter_id, year, month)
);

CREATE TRIGGER trg_utility_readings_updated_at BEFORE UPDATE ON public.utility_readings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.monthly_vacancy_snapshots (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,

    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),
    market_rent_rate        NUMERIC(14, 2)  NOT NULL CHECK (market_rent_rate >= 0),
    days_vacant             SMALLINT        DEFAULT 30,
    estimated_revenue_loss  NUMERIC(14, 2)  NOT NULL CHECK (estimated_revenue_loss >= 0),
    snapshot_date           DATE            NOT NULL DEFAULT CURRENT_DATE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT vacancy_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE CASCADE,
    CONSTRAINT vacancy_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT vacancy_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT vacancy_unique_unit_period
        UNIQUE (unit_id, year, month)
);

CREATE TRIGGER trg_monthly_vacancy_snapshots_updated_at BEFORE UPDATE ON public.monthly_vacancy_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.accounting_periods (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),
    period_name             TEXT            NOT NULL,
    date_opened             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    date_closed             TIMESTAMPTZ,
    status                  TEXT            NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    vat_rate                NUMERIC(5, 2)   NOT NULL DEFAULT 16.00 CHECK (vat_rate >= 0),

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT periods_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT periods_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT periods_branch_year_month_key
        UNIQUE (branch_id, year, month)
);

CREATE TRIGGER trg_accounting_periods_updated_at BEFORE UPDATE ON public.accounting_periods
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_import_staging (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,

    source_channel          TEXT            NOT NULL CHECK (source_channel IN ('mpesa_paybill', 'bank_statement', 'manual')),
    external_reference      TEXT            NOT NULL,
    transaction_timestamp   TIMESTAMPTZ     NOT NULL,
    amount_received         NUMERIC(14, 2)  NOT NULL CHECK (amount_received > 0),
    sender_name             TEXT,
    sender_phone            TEXT,
    account_number_entered  TEXT,

    status                  TEXT            NOT NULL DEFAULT 'pending'
                                            CHECK (status IN ('pending', 'matched', 'posted', 'exception', 'rejected')),
    matched_tenant_id       UUID            REFERENCES public.tenants(id),
    matched_lease_id        UUID            REFERENCES public.leases(id),
    exception_reason        TEXT,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT import_staging_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT import_staging_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT import_staging_unique_ref
        UNIQUE (company_id, source_channel, external_reference)
);

CREATE TRIGGER trg_payment_import_staging_updated_at BEFORE UPDATE ON public.payment_import_staging
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.financial_transactions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID,
    tenant_id               UUID,
    lease_id                UUID,
    charge_type_id          UUID            NOT NULL,
    period_id               UUID            REFERENCES public.accounting_periods(id),

    entry_type              TEXT            NOT NULL CHECK (entry_type IN ('invoice_charge', 'payment_receipt', 'adjustment', 'reversal')),
    reference_no            TEXT            NOT NULL,
    transaction_date        DATE            NOT NULL DEFAULT CURRENT_DATE,
    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),

    debit_amount            NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount           NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),

    payment_mode            TEXT            CHECK (payment_mode IN ('bank', 'mpesa', 'cash', 'cheque')),
    payment_reference       TEXT,
    bank_account_name       TEXT,
    comments                TEXT,

    is_confirmed            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_reversed             BOOLEAN         NOT NULL DEFAULT FALSE,
    confirmed_by            UUID            REFERENCES public.user_profiles(id),
    confirmed_at            TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT ft_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT ft_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT ft_company_charge_fk
        FOREIGN KEY (company_id, charge_type_id)
        REFERENCES public.charge_types (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT ft_company_id_key
        UNIQUE (company_id, id),
    CONSTRAINT ft_debit_or_credit_check
        CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE TRIGGER trg_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ft_company_branch ON public.financial_transactions (company_id, branch_id);
CREATE INDEX idx_ft_lease ON public.financial_transactions (lease_id);
CREATE INDEX idx_ft_tenant ON public.financial_transactions (tenant_id);
CREATE INDEX idx_ft_reference ON public.financial_transactions (reference_no);

CREATE TABLE public.tenant_bill_summaries (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    unit_id                 UUID            NOT NULL,
    tenant_id               UUID            NOT NULL,
    lease_id                UUID            NOT NULL,
    period_id               UUID            NOT NULL REFERENCES public.accounting_periods(id),

    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),

    opening_arrears_balance NUMERIC(14, 2)  NOT NULL DEFAULT 0.00,
    total_billed_amount     NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_billed_amount >= 0),
    total_paid_amount       NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_paid_amount >= 0),
    closing_balance         NUMERIC(14, 2)  NOT NULL DEFAULT 0.00,
    is_settled              BOOLEAN         NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT bills_company_lease_fk
        FOREIGN KEY (company_id, lease_id)
        REFERENCES public.leases (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT bills_company_tenant_fk
        FOREIGN KEY (company_id, tenant_id)
        REFERENCES public.tenants (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT bills_company_unit_fk
        FOREIGN KEY (company_id, unit_id)
        REFERENCES public.units (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT bills_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT bills_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT bills_unique_lease_period
        UNIQUE (lease_id, period_id)
);

CREATE TRIGGER trg_tenant_bill_summaries_updated_at BEFORE UPDATE ON public.tenant_bill_summaries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transaction_reversals (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    original_transaction_id UUID            NOT NULL,
    reversal_transaction_id UUID            NOT NULL,

    reversal_reason         TEXT            NOT NULL CHECK (reversal_reason IN ('vacated', 'incorrect_amount', 'cheque_bounced', 'duplicate', 'disputed')),
    explanation             TEXT            NOT NULL CHECK (char_length(trim(explanation)) > 0),
    authorized_by           UUID            NOT NULL REFERENCES public.user_profiles(id),
    reversal_timestamp      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT rev_company_orig_fk
        FOREIGN KEY (company_id, original_transaction_id)
        REFERENCES public.financial_transactions (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT rev_company_rev_fk
        FOREIGN KEY (company_id, reversal_transaction_id)
        REFERENCES public.financial_transactions (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT rev_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.property_expenses (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    landlord_id             UUID            NOT NULL,
    period_id               UUID            REFERENCES public.accounting_periods(id),

    expense_category        TEXT            NOT NULL CHECK (expense_category IN ('caretaker_wage', 'repairs', 'security', 'electricity', 'water', 'legal', 'tax', 'other')),
    voucher_no              TEXT            NOT NULL,
    description             TEXT            NOT NULL,
    amount                  NUMERIC(14, 2)  NOT NULL CHECK (amount > 0),
    expense_date            DATE            NOT NULL DEFAULT CURRENT_DATE,
    supplier_name           TEXT,
    receipt_attachment_url  TEXT,

    is_confirmed            BOOLEAN         NOT NULL DEFAULT FALSE,
    confirmed_by            UUID            REFERENCES public.user_profiles(id),
    confirmed_at            TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT exp_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exp_company_landlord_fk
        FOREIGN KEY (company_id, landlord_id)
        REFERENCES public.landlords (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT exp_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_property_expenses_updated_at BEFORE UPDATE ON public.property_expenses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.landlord_remittances (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    property_id             UUID            NOT NULL,
    landlord_id             UUID            NOT NULL,
    period_id               UUID            NOT NULL REFERENCES public.accounting_periods(id),

    month                   SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT        NOT NULL CHECK (year >= 2000),

    gross_rent_collected    NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (gross_rent_collected >= 0),
    arrears_collected       NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (arrears_collected >= 0),
    total_gross_income      NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_gross_income >= 0),

    management_fee_rate     NUMERIC(5, 2)   NOT NULL CHECK (management_fee_rate >= 0),
    management_fee_amount   NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (management_fee_amount >= 0),
    vat_on_management_fee   NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (vat_on_management_fee >= 0),
    total_property_expenses NUMERIC(14, 2)  NOT NULL DEFAULT 0.00 CHECK (total_property_expenses >= 0),

    net_payable_to_landlord NUMERIC(14, 2)  NOT NULL CHECK (net_payable_to_landlord >= 0),

    is_disbursed            BOOLEAN         NOT NULL DEFAULT FALSE,
    disbursement_mode       TEXT            CHECK (disbursement_mode IN ('eft', 'rtgs', 'mpesa', 'cheque')),
    disbursement_reference  TEXT,
    disbursed_at            TIMESTAMPTZ,

    prepared_by             UUID            REFERENCES public.user_profiles(id),
    approved_by             UUID            REFERENCES public.user_profiles(id),
    approved_at             TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,
    updated_by              UUID,

    CONSTRAINT rem_company_property_fk
        FOREIGN KEY (company_id, property_id)
        REFERENCES public.properties (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT rem_company_landlord_fk
        FOREIGN KEY (company_id, landlord_id)
        REFERENCES public.landlords (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT rem_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT,
    CONSTRAINT rem_unique_property_period
        UNIQUE (property_id, landlord_id, period_id)
);

CREATE TRIGGER trg_landlord_remittances_updated_at BEFORE UPDATE ON public.landlord_remittances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.communication_logs (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    branch_id               UUID            NOT NULL,
    tenant_id               UUID            REFERENCES public.tenants(id),

    channel                 TEXT            NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'whatsapp')),
    recipient_destination   TEXT            NOT NULL,
    message_type            TEXT            NOT NULL CHECK (message_type IN ('credit_receipt', 'rent_due_reminder', 'arrears_demand', 'general_broadcast')),
    message_content         TEXT            NOT NULL,

    status                  TEXT            NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    external_gateway_id     TEXT,
    error_message           TEXT,
    sent_at                 TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID,

    CONSTRAINT comms_company_branch_fk
        FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_comms_company_branch ON public.communication_logs (company_id, branch_id);
CREATE INDEX idx_comms_recipient ON public.communication_logs (recipient_destination);

CREATE OR REPLACE FUNCTION public.log_enterprise_ops_audit_event()
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
        BEGIN
            v_branch_id := OLD.branch_id;
        EXCEPTION WHEN OTHERS THEN
            v_branch_id := NULL;
        END;
        v_event_type := TG_TABLE_NAME || '.deleted';
        v_metadata   := jsonb_build_object('old', to_jsonb(OLD));

    ELSIF TG_OP = 'UPDATE' THEN
        v_target_id  := NEW.id;
        v_company_id := NEW.company_id;
        BEGIN
            v_branch_id := NEW.branch_id;
        EXCEPTION WHEN OTHERS THEN
            v_branch_id := NULL;
        END;
        v_event_type := TG_TABLE_NAME || '.updated';
        v_metadata   := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));

    ELSIF TG_OP = 'INSERT' THEN
        v_target_id  := NEW.id;
        v_company_id := NEW.company_id;
        BEGIN
            v_branch_id := NEW.branch_id;
        EXCEPTION WHEN OTHERS THEN
            v_branch_id := NULL;
        END;
        v_event_type := TG_TABLE_NAME || '.created';
        v_metadata   := jsonb_build_object('new', to_jsonb(NEW));
    END IF;

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

CREATE TRIGGER trg_audit_landlords AFTER INSERT OR UPDATE OR DELETE ON public.landlords FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_properties AFTER INSERT OR UPDATE OR DELETE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_units AFTER INSERT OR UPDATE OR DELETE ON public.units FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_property_notes AFTER INSERT OR UPDATE OR DELETE ON public.property_notes FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_charge_types AFTER INSERT OR UPDATE OR DELETE ON public.charge_types FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_property_charge_settings AFTER INSERT OR UPDATE OR DELETE ON public.property_charge_settings FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_unit_charge_rates AFTER INSERT OR UPDATE OR DELETE ON public.unit_charge_rates FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_leases AFTER INSERT OR UPDATE OR DELETE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_tenant_shifts AFTER INSERT OR UPDATE OR DELETE ON public.tenant_shifts FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_tenant_exits AFTER INSERT OR UPDATE OR DELETE ON public.tenant_exits FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_utility_meters AFTER INSERT OR UPDATE OR DELETE ON public.utility_meters FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_utility_readings AFTER INSERT OR UPDATE OR DELETE ON public.utility_readings FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_monthly_vacancy_snapshots AFTER INSERT OR UPDATE OR DELETE ON public.monthly_vacancy_snapshots FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_accounting_periods AFTER INSERT OR UPDATE OR DELETE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_payment_import_staging AFTER INSERT OR UPDATE OR DELETE ON public.payment_import_staging FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_financial_transactions AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_tenant_bill_summaries AFTER INSERT OR UPDATE OR DELETE ON public.tenant_bill_summaries FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_transaction_reversals AFTER INSERT OR UPDATE OR DELETE ON public.transaction_reversals FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_property_expenses AFTER INSERT OR UPDATE OR DELETE ON public.property_expenses FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_landlord_remittances AFTER INSERT OR UPDATE OR DELETE ON public.landlord_remittances FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();
CREATE TRIGGER trg_audit_communication_logs AFTER INSERT OR UPDATE OR DELETE ON public.communication_logs FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_ops_audit_event();

ALTER TABLE public.landlords                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_types                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_charge_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_charge_rates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_shifts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_exits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_meters                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_readings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_vacancy_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_import_staging        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_bill_summaries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_reversals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_remittances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs            ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.landlords                     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.properties                    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.units                         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.property_notes                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.charge_types                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.property_charge_settings      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.unit_charge_rates             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.leases                        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_shifts                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_exits                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utility_meters                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utility_readings              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_vacancy_snapshots     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_import_staging        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_bill_summaries         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_reversals         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.property_expenses             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_remittances          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs            FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    branch_tables text[] := ARRAY[
        'landlords', 'properties', 'units', 'property_notes', 'property_charge_settings',
        'unit_charge_rates', 'tenants', 'leases', 'tenant_shifts', 'tenant_exits',
        'utility_meters', 'utility_readings', 'monthly_vacancy_snapshots',
        'accounting_periods', 'payment_import_staging', 'financial_transactions',
        'tenant_bill_summaries', 'transaction_reversals', 'property_expenses',
        'landlord_remittances', 'communication_logs'
    ];
BEGIN
    FOREACH t IN ARRAY branch_tables LOOP
        EXECUTE format('
            CREATE POLICY "%s_select_branch_members" ON public.%I
                FOR SELECT TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            CREATE POLICY "%s_insert_branch_members" ON public.%I
                FOR INSERT TO authenticated
                WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            CREATE POLICY "%s_update_branch_members" ON public.%I
                FOR UPDATE TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()))
                WITH CHECK (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));

            CREATE POLICY "%s_delete_branch_members" ON public.%I
                FOR DELETE TO authenticated
                USING (branch_id IN (SELECT public.get_my_branch_ids()) AND company_id IN (SELECT public.get_my_company_ids()));
        ', t, t, t, t, t, t, t, t);
    END LOOP;
END;
$$;

CREATE POLICY "charge_types_select_company_members" ON public.charge_types
    FOR SELECT TO authenticated
    USING (company_id IN (SELECT public.get_my_company_ids()));

CREATE POLICY "charge_types_insert_super_admin" ON public.charge_types
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT cm.company_id FROM public.company_memberships cm
            JOIN public.roles_permissions rp ON rp.id = cm.role_id
            WHERE cm.user_id = auth.uid() AND cm.status = 'active' AND rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "charge_types_update_super_admin" ON public.charge_types
    FOR UPDATE TO authenticated
    USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_memberships cm
            JOIN public.roles_permissions rp ON rp.id = cm.role_id
            WHERE cm.user_id = auth.uid() AND cm.status = 'active' AND rp.role_type = 'company_super_admin'
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT cm.company_id FROM public.company_memberships cm
            JOIN public.roles_permissions rp ON rp.id = cm.role_id
            WHERE cm.user_id = auth.uid() AND cm.status = 'active' AND rp.role_type = 'company_super_admin'
        )
    );

CREATE POLICY "charge_types_delete_super_admin" ON public.charge_types
    FOR DELETE TO authenticated
    USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_memberships cm
            JOIN public.roles_permissions rp ON rp.id = cm.role_id
            WHERE cm.user_id = auth.uid() AND cm.status = 'active' AND rp.role_type = 'company_super_admin'
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_enterprise_ops_audit_event() TO authenticated;
