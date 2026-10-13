-- Migration: Add compound foreign keys from financial_transactions to tenants, units, and leases
-- This ensures multi-tenant integrity and allows PostgREST embeddings without ambiguity.

ALTER TABLE public.financial_transactions
    ADD CONSTRAINT ft_company_tenant_fk FOREIGN KEY (company_id, tenant_id) REFERENCES public.tenants(company_id, id) ON DELETE RESTRICT,
    ADD CONSTRAINT ft_company_unit_fk FOREIGN KEY (company_id, unit_id) REFERENCES public.units(company_id, id) ON DELETE RESTRICT,
    ADD CONSTRAINT ft_company_lease_fk FOREIGN KEY (company_id, lease_id) REFERENCES public.leases(company_id, id) ON DELETE RESTRICT;
