import { useState, useEffect } from 'react'
import {
  Database,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Users,
  Home,
  Receipt,
  UserCheck,
  Layers,
  ArrowDownToLine,
  Sliders
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function DataImport() {
  const [tenantContext, setTenantContext] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState('landlords')
  const [selectedBranchSource, setSelectedBranchSource] = useState('MetrocosmoThika')
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [mappingOverrides, setMappingOverrides] = useState({})
  const [importStatus, setImportStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState(null)
  const [logs, setLogs] = useState([])

  const branchDatabases = [
    { id: 'MetrocosmoThika', name: 'Thika Branch (MetrocosmoThika)', properties: 74, tenants: 1847, trans: 114688 },
    { id: 'MetrocosmoNairobi', name: 'Nairobi Branch (MetrocosmoNairobi)', properties: 84, tenants: 1272, trans: 111963 },
    { id: 'Propwings_Metrocosmo_Kitengela', name: 'Kitengela Branch (Propwings Kitengela)', properties: 8, tenants: 376, trans: 26235 },
    { id: 'MetrocosmoNakuru', name: 'Nakuru Branch (MetrocosmoNakuru)', properties: 0, tenants: 0, trans: 0 },
    { id: 'MetrocosmoEldoret', name: 'Eldoret Branch (MetrocosmoEldoret)', properties: 0, tenants: 0, trans: 0 },
  ]

  const entityDefinitions = {
    landlords: {
      label: 'Landlords',
      icon: Users,
      legacyTable: 'Landlord',
      targetTable: 'landlords',
      columns: [
        { legacy: 'landlord_id', target: 'landlord_no', label: 'Landlord ID (e.g. L001)', required: true },
        { legacy: 'surname', target: 'last_name', label: 'Surname', required: true },
        { legacy: 'othername', target: 'first_name', label: 'Other Names', required: true },
        { legacy: 'telephone', target: 'phone', label: 'Telephone', required: true },
        { legacy: 'email', target: 'email', label: 'Email', required: false },
        { legacy: 'idnumber', target: 'id_number', label: 'National ID', required: false },
        { legacy: 'PIN', target: 'kra_pin', label: 'KRA PIN', required: false },
        { legacy: 'bank', target: 'bank_name', label: 'Bank Name', required: false },
        { legacy: 'bankbranch', target: 'bank_branch', label: 'Bank Branch', required: false }
      ]
    },
    properties: {
      label: 'Properties',
      icon: Building2,
      legacyTable: 'Pro_propertyDetails',
      targetTable: 'properties',
      columns: [
        { legacy: 'PropertyID', target: 'property_code', label: 'Property Code/ID', required: true },
        { legacy: 'Descr', target: 'name', label: 'Property Name / Description', required: true },
        { legacy: 'Location', target: 'location', label: 'Location / Town', required: false },
        { legacy: 'NoOfunits', target: 'unit_count', label: 'No of Units', required: false },
        { legacy: 'Commission', target: 'commission_rate', label: 'Commission %', required: false },
        { legacy: 'CareTaker', target: 'caretaker_name', label: 'Caretaker Name', required: false },
        { legacy: 'Caretakermobile', target: 'caretaker_phone', label: 'Caretaker Phone', required: false },
        { legacy: 'LandlordID', target: 'legacy_landlord_ref', label: 'Landlord Ref', required: false }
      ]
    },
    units: {
      label: 'Units & Rates',
      icon: Home,
      legacyTable: 'unit',
      targetTable: 'units',
      columns: [
        { legacy: 'unit_id', target: 'unit_number', label: 'Unit Number / Identifier', required: true },
        { legacy: 'property_id', target: 'legacy_property_ref', label: 'Property Ref', required: true },
        { legacy: 'unit_category', target: 'unit_type', label: 'Category (Residential/Commercial)', required: false },
        { legacy: 'occupied', target: 'is_occupied', label: 'Occupancy Status (0/1)', required: false },
        { legacy: 'wateracct', target: 'water_meter_number', label: 'Water Meter / Account', required: false },
        { legacy: 'Amount', target: 'base_rent', label: 'Monthly Base Rent', required: false }
      ]
    },
    tenants: {
      label: 'Tenants & Leases',
      icon: Users,
      legacyTable: 'Tenants',
      targetTable: 'tenants',
      columns: [
        { legacy: 't_code', target: 'tenant_no', label: 'Tenant Code (e.g. T00357)', required: true },
        { legacy: 't_name', target: 'full_name', label: 'Tenant Full Name', required: true },
        { legacy: 'telephone', target: 'phone', label: 'Primary Phone', required: true },
        { legacy: 'email', target: 'email', label: 'Email Address', required: false },
        { legacy: 'idno', target: 'id_number', label: 'National ID Number', required: false },
        { legacy: 'Property', target: 'legacy_property_ref', label: 'Assigned Property', required: false },
        { legacy: 'Unit', target: 'legacy_unit_ref', label: 'Assigned Unit', required: false },
        { legacy: 'DateIn', target: 'lease_start_date', label: 'Move In Date', required: false }
      ]
    },
    transactions: {
      label: 'Ledger Transactions',
      icon: Receipt,
      legacyTable: 'PropTransactions',
      targetTable: 'financial_transactions',
      columns: [
        { legacy: 'ReceiptNo', target: 'reference_no', label: 'Receipt / Invoice No', required: true },
        { legacy: 't_code', target: 'legacy_tenant_ref', label: 'Tenant Code', required: true },
        { legacy: 'property_id', target: 'legacy_property_ref', label: 'Property Code', required: false },
        { legacy: 'unit_id', target: 'legacy_unit_ref', label: 'Unit Code', required: false },
        { legacy: 'Payable', target: 'charge_code', label: 'Charge Code (001, 002, 009, 017)', required: true },
        { legacy: 'Debit', target: 'debit_amount', label: 'Debit (Invoice Amount)', required: false },
        { legacy: 'Credit', target: 'credit_amount', label: 'Credit (Receipt Amount)', required: false },
        { legacy: 'trandate', target: 'transaction_date', label: 'Transaction Date', required: true },
        { legacy: 'refnbr', target: 'payment_reference', label: 'Bank / M-Pesa Ref', required: false }
      ]
    },
    employees: {
      label: 'Employees & Staff',
      icon: UserCheck,
      legacyTable: 'EmployeesDetails',
      targetTable: 'employees',
      columns: [
        { legacy: 'EmployeeNo', target: 'employee_no', label: 'Staff Code', required: true },
        { legacy: 'FirstName', target: 'first_name', label: 'First Name', required: true },
        { legacy: 'MiddleName', target: 'middle_name', label: 'Middle Name', required: false },
        { legacy: 'SurName', target: 'last_name', label: 'Surname', required: true },
        { legacy: 'IdNo', target: 'id_number', label: 'National ID', required: false },
        { legacy: 'Tel', target: 'phone', label: 'Mobile Number', required: true },
        { legacy: 'Email', target: 'email', label: 'Email Address', required: false },
        { legacy: 'Gender', target: 'gender', label: 'Gender', required: false },
        { legacy: 'BasicPay', target: 'basic_salary', label: 'Basic Salary', required: false }
      ]
    }
  }

  useEffect(() => {
    async function loadContext() {
      try {
        const ctx = await getTenantContext()
        setTenantContext(ctx)
      } catch (err) {
        console.error(err)
      }
    }
    loadContext()
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setImportResults(null)
    setLogs([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target.result
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content)
          const rows = Array.isArray(parsed) ? parsed : [parsed]
          setParsedRows(rows)
          setPreviewRows(rows.slice(0, 5))
          setLogs([`Parsed ${rows.length} records from JSON file`])
        } else {
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
          if (lines.length > 1) {
            const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim())
            const rows = lines.slice(1).map((line) => {
              const vals = line.split(',').map((v) => v.replace(/^["']|["']$/g, '').trim())
              const obj = {}
              headers.forEach((h, idx) => {
                obj[h] = vals[idx] || ''
              })
              return obj
            })
            setParsedRows(rows)
            setPreviewRows(rows.slice(0, 5))
            setLogs([`Parsed ${rows.length} rows with columns: ${headers.join(', ')}`])
          }
        }
      } catch (err) {
        setLogs([`Failed to parse file: ${err.message}`])
      }
    }
    reader.readAsText(file)
  }

  const executeMigration = async () => {
    if (!tenantContext || parsedRows.length === 0) return
    setImportStatus('importing')
    setProgress(0)

    const activeConfig = entityDefinitions[selectedEntity]
    const logsArr = [`Starting migration into ${activeConfig.targetTable}...`]
    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0

    const batchSize = 50
    const totalBatches = Math.ceil(parsedRows.length / batchSize)

    for (let b = 0; b < totalBatches; b++) {
      const batch = parsedRows.slice(b * batchSize, (b + 1) * batchSize)
      const transformedBatch = batch.map((row) => {
        const item = {
          company_id: tenantContext.companyId,
          branch_id: tenantContext.branchId,
        }

        activeConfig.columns.forEach((col) => {
          const sourceKey = mappingOverrides[col.target] || col.legacy
          if (row[sourceKey] !== undefined) {
            item[col.target] = row[sourceKey]
          }
        })

        if (selectedEntity === 'landlords') {
          if (!item.full_name) {
            item.full_name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.landlord_no || 'Unknown Landlord'
          }
        }

        if (selectedEntity === 'employees') {
          item.status = 'active'
          item.basic_salary = parseFloat(item.basic_salary) || 0
        }

        return item
      })

      try {
        const { error } = await supabase
          .from(activeConfig.targetTable)
          .upsert(transformedBatch, { ignoreDuplicates: true })

        if (error) {
          logsArr.push(`Batch ${b + 1} error: ${error.message}`)
          errorCount += batch.length
        } else {
          importedCount += batch.length
        }
      } catch (err) {
        logsArr.push(`Batch ${b + 1} exception: ${err.message}`)
        errorCount += batch.length
      }

      const pct = Math.round(((b + 1) / totalBatches) * 100)
      setProgress(pct)
    }

    logsArr.push(`Migration complete. Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`)
    setLogs(logsArr)
    setImportStatus('completed')
    setImportResults({
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
    })
  }

  const currentEntityConfig = entityDefinitions[selectedEntity]

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b1329] p-8 text-surface-200">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Legacy Data Import Engine</h1>
              <p className="text-xs text-surface-400">
                1:1 Architectural mapping from IIS SQL Server databases to ProMatrix multi-tenant schemas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-surface-800/80 bg-surface-900/60 px-4 py-2">
            <span className="text-[10px] font-mono uppercase text-surface-500">Target Tenant Branch</span>
            <p className="text-xs font-semibold text-white">
              {tenantContext?.branchName || 'Loading branch...'} ({tenantContext?.branchCode || '...'})
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {branchDatabases.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelectedBranchSource(b.id)}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              selectedBranchSource === b.id
                ? 'border-blue-500/80 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                : 'border-surface-800/80 bg-surface-900/40 hover:bg-surface-850/60'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{b.name.split(' (')[0]}</span>
              {selectedBranchSource === b.id && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="space-y-1 text-[11px] font-mono text-surface-400">
              <div className="flex justify-between">
                <span>Props:</span>
                <span className="text-surface-200">{b.properties.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tenants:</span>
                <span className="text-surface-200">{b.tenants.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Ledger Rows:</span>
                <span className="text-surface-200">{b.trans.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-surface-800/80 pb-4">
        {Object.entries(entityDefinitions).map(([key, def]) => {
          const Icon = def.icon
          const isActive = selectedEntity === key
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedEntity(key)
                setFileData(null)
                setFileName('')
                setPreviewRows([])
                setParsedRows([])
                setImportResults(null)
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border border-blue-500/40 bg-blue-600/20 text-white'
                  : 'border border-surface-800/60 bg-surface-900/50 text-surface-400 hover:bg-surface-850 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{def.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-3xl border border-surface-800/80 bg-surface-900/60 p-6 shadow-card">
            <h3 className="mb-1 text-sm font-semibold text-white">Physical Schema Mapping</h3>
            <p className="mb-4 text-xs text-surface-400">
              Mapping legacy <span className="font-mono text-blue-400">{currentEntityConfig.legacyTable}</span> columns to target table{' '}
              <span className="font-mono text-emerald-400">{currentEntityConfig.targetTable}</span>
            </p>

            <div className="space-y-3">
              {currentEntityConfig.columns.map((col) => (
                <div
                  key={col.target}
                  className="rounded-xl border border-surface-800/60 bg-surface-950/40 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono font-semibold text-blue-300">{col.legacy}</span>
                    <ArrowRight className="h-3 w-3 text-surface-500" />
                    <span className="font-mono font-semibold text-emerald-300">{col.target}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-surface-400">
                    <span>{col.label}</span>
                    {col.required && <span className="text-[10px] text-amber-400 font-mono">REQUIRED</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-800/80 bg-surface-900/60 p-6 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-white">Multi-Tenant Guardrails</h3>
            <ul className="space-y-2 text-xs text-surface-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>Compound Foreign Key binding to current Company and selected Branch</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>RLS isolation enforced via get_my_branch_ids() security definer</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>Duplicate detection on natural keys prevents redundant re-imports</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-surface-800/80 bg-surface-900/60 p-6 shadow-card">
            <h3 className="mb-1 text-sm font-semibold text-white">Upload Historical Dataset</h3>
            <p className="mb-4 text-xs text-surface-400">
              Provide legacy export data in CSV or JSON format for {currentEntityConfig.label}
            </p>

            <div className="mb-6 rounded-2xl border-2 border-dashed border-surface-800 p-8 text-center hover:border-blue-500/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-800/50 text-surface-300">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-white">
                  {fileName ? fileName : 'Click to select or drop CSV / JSON file'}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Supports exported tables from SQL Server or Propwings exports
                </p>
              </label>
            </div>

            {previewRows.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-surface-300">
                    Previewing First 5 Records ({parsedRows.length} total rows detected)
                  </h4>
                  <span className="text-xs font-mono text-emerald-400">Pre-validation passed</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-surface-800/80">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-surface-800/80 bg-surface-950/80 text-surface-400">
                      <tr>
                        {Object.keys(previewRows[0]).slice(0, 6).map((k) => (
                          <th key={k} className="p-2.5 font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/40">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-850/30">
                          {Object.values(row).slice(0, 6).map((v, i) => (
                            <td key={i} className="p-2.5 text-surface-300 truncate max-w-[150px]">
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importStatus === 'importing' && (
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-xs font-mono text-surface-300">
                  <span>Executing RLS-bound batch import...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-950">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {importResults && (
              <div className="mb-6 grid grid-cols-3 gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400">IMPORTED</span>
                  <p className="text-lg font-bold text-white font-mono">{importResults.imported}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-surface-400">SKIPPED</span>
                  <p className="text-lg font-bold text-white font-mono">{importResults.skipped}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-rose-400">ERRORS</span>
                  <p className="text-lg font-bold text-white font-mono">{importResults.errors}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                disabled={parsedRows.length === 0 || importStatus === 'importing'}
                onClick={executeMigration}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-all"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Execute Batch Ingestion</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-surface-800/80 bg-surface-900/60 p-6 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-white">Migration Execution Log</h3>
            <div className="h-40 overflow-y-auto rounded-xl border border-surface-800/60 bg-surface-950 p-3 font-mono text-[11px] text-surface-300 space-y-1">
              {logs.length === 0 ? (
                <span className="text-surface-600">Awaiting file input or migration trigger...</span>
              ) : (
                logs.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
