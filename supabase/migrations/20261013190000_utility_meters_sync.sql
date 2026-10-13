INSERT INTO public.utility_meters (company_id, branch_id, property_id, unit_id, meter_type, meter_number, initial_reading, current_reading, is_active)
SELECT company_id, branch_id, property_id, id, 'water', water_meter_no, 0.00, 0.00, TRUE
FROM public.units
WHERE water_meter_no IS NOT NULL AND trim(water_meter_no) != ''
ON CONFLICT (unit_id, meter_type) DO UPDATE
SET meter_number = EXCLUDED.meter_number;
