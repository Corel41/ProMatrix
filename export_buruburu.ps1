$server = "DESKTOP-9LMT843\SQLEXPRESS"
$database = "MetrocosmoNairobi"
$user = "sa"
$password = "metro1234"
$outputCsv = "e:\ProMatrix\buruburu_legacy_export.csv"

$sql = @"
SET NOCOUNT ON;
WITH DepositAgg AS (
    SELECT 
        t_code,
        property_id,
        unit_id,
        SUM(CASE WHEN Payable IN ('004', '005', '006') THEN Credit ELSE 0 END) as deposit_collected
    FROM PropTransactions
    GROUP BY t_code, property_id, unit_id
),
RentPayables AS (
    SELECT 
        property_id,
        unit_id,
        MAX(Amount) as rent_amount
    FROM Unit_Payables
    WHERE Payable = '001'
    GROUP BY property_id, unit_id
)
SELECT 
    RTRIM(COALESCE(NULLIF(p.Descr, ''), p.PropertyID)) as property_name,
    RTRIM(p.PropertyID) as property_code,
    RTRIM(p.Location) as location,
    RTRIM(u.unit_id) as unit_number,
    RTRIM(COALESCE(u.unit_type, 'Residential')) as unit_type,
    CAST(COALESCE(rp.rent_amount, 0.00) AS DECIMAL(14,2)) as rent_amount,
    CAST(COALESCE(d.deposit_collected, 0.00) AS DECIMAL(14,2)) as deposit_amount,
    RTRIM(COALESCE(NULLIF(u.wateracct, '-'), '')) as water_meter_number,
    RTRIM(COALESCE(t.t_code, '')) as tenant_no,
    CASE 
        WHEN CHARINDEX(' ', LTRIM(RTRIM(t.t_name))) > 0 
        THEN SUBSTRING(LTRIM(RTRIM(t.t_name)), 1, CHARINDEX(' ', LTRIM(RTRIM(t.t_name))) - 1)
        ELSE LTRIM(RTRIM(COALESCE(t.t_name, '')))
    END as tenant_first_name,
    CASE 
        WHEN CHARINDEX(' ', LTRIM(RTRIM(t.t_name))) > 0 
        THEN LTRIM(SUBSTRING(LTRIM(RTRIM(t.t_name)), CHARINDEX(' ', LTRIM(RTRIM(t.t_name))) + 1, LEN(t.t_name)))
        ELSE ''
    END as tenant_last_name,
    RTRIM(COALESCE(t.t_name, '')) as full_name,
    RTRIM(COALESCE(t.telephone, '')) as phone,
    RTRIM(COALESCE(NULLIF(t.idno, '0'), '')) as id_number,
    COALESCE(CONVERT(VARCHAR(10), t.DateIn, 120), '') as lease_start_date,
    CASE 
        WHEN t.active = 1 THEN 'Active' 
        WHEN t.t_code IS NOT NULL THEN 'Exited' 
        ELSE 'Vacant' 
    END as occupancy_status,
    u.recid as legacy_unit_recid
FROM unit u
JOIN Pro_propertyDetails p ON u.property_id = p.PropertyID
LEFT JOIN Tenants t ON t.Property = u.property_id AND t.Unit = u.unit_id
LEFT JOIN RentPayables rp ON rp.property_id = u.property_id AND rp.unit_id = u.unit_id
LEFT JOIN DepositAgg d ON d.t_code = t.t_code AND d.property_id = u.property_id AND d.unit_id = u.unit_id
WHERE p.Location LIKE '%Buru%' 
   OR p.PropertyID LIKE '%Buru%' 
   OR u.property_id LIKE '%Buru%'
   OR u.recid = 462
   OR u.unit_id = '462'
ORDER BY p.PropertyID, u.unit_id, t.active DESC, t.DateIn DESC;
"@

$rawOutput = & sqlcmd -S $server -U $user -P $password -d $database -C -s "~" -W -h -1 -Q $sql

$records = [System.Collections.Generic.List[PSCustomObject]]::new()

foreach ($line in $rawOutput) {
    if ([string]::IsNullOrWhiteSpace($line)) {
        continue
    }
    $parts = $line.Split("~")
    if ($parts.Count -ge 17) {
        $record = [PSCustomObject]@{
            property_name      = $parts[0].Trim()
            property_code      = $parts[1].Trim()
            location           = $parts[2].Trim()
            unit_number        = $parts[3].Trim()
            unit_type          = $parts[4].Trim()
            rent_amount        = $parts[5].Trim()
            deposit_amount     = $parts[6].Trim()
            water_meter_number = $parts[7].Trim()
            tenant_no          = $parts[8].Trim()
            tenant_first_name  = $parts[9].Trim()
            tenant_last_name   = $parts[10].Trim()
            full_name          = $parts[11].Trim()
            phone              = $parts[12].Trim()
            id_number          = $parts[13].Trim()
            lease_start_date   = $parts[14].Trim()
            occupancy_status   = $parts[15].Trim()
            legacy_unit_recid  = $parts[16].Trim()
        }
        $records.Add($record)
    }
}

$records | Export-Csv -Path $outputCsv -NoTypeInformation -Encoding UTF8

Write-Host "Export completed successfully. Total records exported: $($records.Count)"
Write-Host "Destination: $outputCsv"
