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
  const [selectedEntity, setSelectedEntity] = useState('tenants')
  const [selectedBranchSource, setSelectedBranchSource] = useState('MetrocosmoNairobi')
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
    { id: 'MetrocosmoNairobi', name: 'Nairobi Branch (MetrocosmoNairobi)', properties: 84, tenants: 1272, trans: 111963 },
    { id: 'MetrocosmoThika', name: 'Thika Branch (MetrocosmoThika)', properties: 74, tenants: 1847, trans: 114688 },
    { id: 'Propwings_Metrocosmo_Kitengela', name: 'Kitengela Branch (Propwings Kitengela)', properties: 8, tenants: 376, trans: 26235 },
    { id: 'MetrocosmoNakuru', name: 'Nakuru Branch (MetrocosmoNakuru)', properties: 0, tenants: 0, trans: 0 },
    { id: 'MetrocosmoEldoret', name: 'Eldoret Branch (MetrocosmoEldoret)', properties: 0, tenants: 0, trans: 0 },
  ]

  const entityDefinitions = {
    properties: {
      label: 'Properties',
      icon: Building2,
      legacyTable: 'Pro_propertyDetails',
      targetTable: 'properties',
      columns: [
        { legacy: 'PropertyID', target: 'property_code', label: 'Property Code/ID', required: true, aliases: ['property_code', 'property_id', 'PropertyID'] },
        { legacy: 'Descr', target: 'name', label: 'Property Name / Description', required: true, aliases: ['property_name', 'name', 'Descr', 'Property'] },
        { legacy: 'Location', target: 'location_description', label: 'Location / Town', required: false, aliases: ['location', 'Location', 'location_description'] },
        { legacy: 'NoOfunits', target: 'unit_count', label: 'No of Units', required: false, aliases: ['unit_count', 'NoOfunits'] },
        { legacy: 'Commission', target: 'commission_rate', label: 'Commission %', required: false, aliases: ['commission_rate', 'Commission'] },
        { legacy: 'CareTaker', target: 'caretaker_name', label: 'Caretaker Name', required: false, aliases: ['caretaker_name', 'CareTaker'] },
        { legacy: 'Caretakermobile', target: 'caretaker_phone', label: 'Caretaker Phone', required: false, aliases: ['caretaker_phone', 'Caretakermobile'] },
        { legacy: 'LandlordID', target: 'legacy_landlord_ref', label: 'Landlord Ref', required: false, aliases: ['legacy_landlord_ref', 'LandlordID'] }
      ]
    },
    units: {
      label: 'Units & Rates',
      icon: Home,
      legacyTable: 'unit',
      targetTable: 'units',
      columns: [
        { legacy: 'unit_id', target: 'unit_number', label: 'Unit Number / Identifier', required: true, aliases: ['unit_number', 'unit_id', 'Unit'] },
        { legacy: 'property_id', target: 'legacy_property_ref', label: 'Property Ref', required: true, aliases: ['property_name', 'property_code', 'property_id', 'Property'] },
        { legacy: 'unit_category', target: 'unit_type', label: 'Category (Residential/Commercial)', required: false, aliases: ['unit_type', 'unit_category'] },
        { legacy: 'wateracct', target: 'water_meter_no', label: 'Water Meter / Account', required: false, aliases: ['water_meter_number', 'water_meter_no', 'wateracct'] },
        { legacy: 'Amount', target: 'base_rent_rate', label: 'Monthly Base Rent', required: false, aliases: ['rent_amount', 'base_rent_rate', 'base_rent', 'Amount'] }
      ]
    },
    tenants: {
      label: 'Tenants & Leases',
      icon: Users,
      legacyTable: 'Tenants',
      targetTable: 'tenants',
      columns: [
        { legacy: 't_code', target: 'tenant_no', label: 'Tenant Code (e.g. T00357)', required: true, aliases: ['tenant_no', 't_code'] },
        { legacy: 't_name', target: 'full_name', label: 'Tenant Full Name', required: true, aliases: ['full_name', 't_name', 'tenant_name'] },
        { legacy: 'telephone', target: 'phone', label: 'Primary Phone', required: true, aliases: ['phone', 'telephone'] },
        { legacy: 'email', target: 'email', label: 'Email Address', required: false, aliases: ['email'] },
        { legacy: 'idno', target: 'id_or_passport_no', label: 'National ID Number', required: false, aliases: ['id_number', 'id_or_passport_no', 'idno'] },
        { legacy: 'Property', target: 'legacy_property_ref', label: 'Assigned Property', required: false, aliases: ['property_name', 'property_code', 'Property'] },
        { legacy: 'Unit', target: 'legacy_unit_ref', label: 'Assigned Unit', required: false, aliases: ['unit_number', 'unit_id', 'Unit'] },
        { legacy: 'DateIn', target: 'lease_start_date', label: 'Move In Date', required: false, aliases: ['lease_start_date', 'DateIn'] },
        { legacy: 'deposit', target: 'deposit_amount', label: 'Deposit Balance', required: false, aliases: ['deposit_amount', 'deposit'] }
      ]
    },
    landlords: {
      label: 'Landlords',
      icon: Users,
      legacyTable: 'Landlord',
      targetTable: 'landlords',
      columns: [
        { legacy: 'landlord_id', target: 'landlord_no', label: 'Landlord ID (e.g. L001)', required: true, aliases: ['landlord_no', 'landlord_id'] },
        { legacy: 'surname', target: 'last_name', label: 'Surname', required: true, aliases: ['last_name', 'surname'] },
        { legacy: 'othername', target: 'first_name', label: 'Other Names', required: true, aliases: ['first_name', 'othername'] },
        { legacy: 'telephone', target: 'phone', label: 'Telephone', required: true, aliases: ['phone', 'telephone'] },
        { legacy: 'email', target: 'email', label: 'Email', required: false, aliases: ['email'] },
        { legacy: 'idnumber', target: 'id_number', label: 'National ID', required: false, aliases: ['id_number', 'idnumber'] },
        { legacy: 'PIN', target: 'kra_pin', label: 'KRA PIN', required: false, aliases: ['kra_pin', 'PIN'] },
        { legacy: 'bank', target: 'bank_name', label: 'Bank Name', required: false, aliases: ['bank_name', 'bank'] },
        { legacy: 'bankbranch', target: 'bank_branch', label: 'Bank Branch', required: false, aliases: ['bank_branch', 'bankbranch'] }
      ]
    },
    transactions: {
      label: 'Ledger Transactions',
      icon: Receipt,
      legacyTable: 'PropTransactions',
      targetTable: 'financial_transactions',
      columns: [
        { legacy: 'ReceiptNo', target: 'reference_no', label: 'Receipt / Invoice No', required: true, aliases: ['reference_no', 'ReceiptNo'] },
        { legacy: 't_code', target: 'legacy_tenant_ref', label: 'Tenant Code', required: true, aliases: ['legacy_tenant_ref', 'tenant_no', 't_code'] },
        { legacy: 'property_id', target: 'legacy_property_ref', label: 'Property Code', required: false, aliases: ['legacy_property_ref', 'property_code', 'property_id'] },
        { legacy: 'unit_id', target: 'legacy_unit_ref', label: 'Unit Code', required: false, aliases: ['legacy_unit_ref', 'unit_number', 'unit_id'] },
        { legacy: 'Payable', target: 'charge_code', label: 'Charge Code (001, 002, 009, 017)', required: true, aliases: ['charge_code', 'Payable'] },
        { legacy: 'Debit', target: 'debit_amount', label: 'Debit (Invoice Amount)', required: false, aliases: ['debit_amount', 'Debit'] },
        { legacy: 'Credit', target: 'credit_amount', label: 'Credit (Receipt Amount)', required: false, aliases: ['credit_amount', 'Credit'] },
        { legacy: 'trandate', target: 'transaction_date', label: 'Transaction Date', required: true, aliases: ['transaction_date', 'trandate'] },
        { legacy: 'refnbr', target: 'payment_reference', label: 'Bank / M-Pesa Ref', required: false, aliases: ['payment_reference', 'refnbr'] }
      ]
    },
    employees: {
      label: 'Employees & Staff',
      icon: UserCheck,
      legacyTable: 'EmployeesDetails',
      targetTable: 'employees',
      columns: [
        { legacy: 'EmployeeNo', target: 'employee_no', label: 'Staff Code', required: true, aliases: ['employee_no', 'EmployeeNo'] },
        { legacy: 'FirstName', target: 'first_name', label: 'First Name', required: true, aliases: ['first_name', 'FirstName'] },
        { legacy: 'MiddleName', target: 'middle_name', label: 'Middle Name', required: false, aliases: ['middle_name', 'MiddleName'] },
        { legacy: 'SurName', target: 'last_name', label: 'Surname', required: true, aliases: ['last_name', 'SurName'] },
        { legacy: 'IdNo', target: 'id_number', label: 'National ID', required: false, aliases: ['id_number', 'IdNo'] },
        { legacy: 'Tel', target: 'phone', label: 'Mobile Number', required: true, aliases: ['phone', 'Tel'] },
        { legacy: 'Email', target: 'email', label: 'Email Address', required: false, aliases: ['email', 'Email'] },
        { legacy: 'Gender', target: 'gender', label: 'Gender', required: false, aliases: ['gender', 'Gender'] },
        { legacy: 'BasicPay', target: 'basic_salary', label: 'Basic Salary', required: false, aliases: ['basic_salary', 'BasicPay'] }
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

            const activeConfig = entityDefinitions[selectedEntity]
            const autoMap = {}
            activeConfig.columns.forEach((col) => {
              const matchedHeader = headers.find((h) => {
                const hl = h.toLowerCase().trim()
                if (hl === col.target.toLowerCase() || hl === col.legacy.toLowerCase()) return true
                if (col.aliases && col.aliases.some((a) => a.toLowerCase() === hl)) return true
                return false
              })
              if (matchedHeader) {
                autoMap[col.target] = matchedHeader
              }
            })
            setMappingOverrides(autoMap)
            setLogs([`Parsed ${rows.length} rows with ${headers.length} columns: ${headers.join(', ')}`])
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
          const overrideKey = mappingOverrides[col.target]
          let val = undefined
          if (overrideKey && row[overrideKey] !== undefined) {
            val = row[overrideKey]
          } else if (row[col.target] !== undefined) {
            val = row[col.target]
          } else if (row[col.legacy] !== undefined) {
            val = row[col.legacy]
          } else if (col.aliases) {
            for (const alias of col.aliases) {
              if (row[alias] !== undefined && row[alias] !== '') {
                val = row[alias]
                break
              }
            }
          }
          if (val !== undefined && val !== '') {
            item[col.target] = val
          }
        })

        if (selectedEntity === 'landlords') {
          if (!item.full_name) {
            item.full_name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.landlord_no || 'Unknown Landlord'
          }
        }

        if (selectedEntity === 'tenants') {
          if (!item.full_name && (row.tenant_first_name || row.tenant_last_name)) {
            item.full_name = `${row.tenant_first_name || ''} ${row.tenant_last_name || ''}`.trim()
          }
          if (!item.full_name) {
            item.full_name = row.full_name || item.tenant_no || 'Unknown Tenant'
          }
          if (!item.id_or_passport_no) {
            item.id_or_passport_no = row.id_number || row.idno || 'NOT SPECIFIED'
          }
          if (!item.phone) {
            item.phone = row.phone || '0700000000'
          }
          item.status = row.occupancy_status ? (row.occupancy_status.toLowerCase() === 'active' ? 'active' : 'exited') : 'active'
        }

        if (selectedEntity === 'employees') {
          item.status = 'active'
          item.basic_salary = parseFloat(item.basic_salary) || 0
        }

        return item
      })

      const validRows = transformedBatch.filter((r) => {
        if (selectedEntity === 'tenants' && (!r.tenant_no || !r.full_name)) return false
        if (selectedEntity === 'properties' && (!r.property_code || !r.name)) return false
        if (selectedEntity === 'units' && !r.unit_number) return false
        return true
      })

      if (validRows.length === 0) {
        skippedCount += batch.length
        continue
      }

      try {
        const { error } = await supabase
          .from(activeConfig.targetTable)
          .upsert(validRows, { ignoreDuplicates: true })

        if (error) {
          logsArr.push(`Batch ${b + 1} error: ${error.message}`)
          errorCount += validRows.length
        } else {
          importedCount += validRows.length
        }
      } catch (err) {
        logsArr.push(`Batch ${b + 1} exception: ${err.message}`)
        errorCount += validRows.length
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
            <span className="text-[10px] uppercase font-mono text-surface-400 block">Target Branch Isolation</span>
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {tenantContext?.branchName || 'Resolving...'} ({tenantContext?.branchCode || '---'})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-surface-800/80 bg-surface-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 font-mono">1</span>
            <h3 className="text-sm font-semibold text-white">Select Legacy Source</h3>
          </div>
          <p className="text-xs text-surface-400 mb-4">
            Select which branch database from the IIS SQLEXPRESS instance you are importing from:
          </p>
          <div className="space-y-2">
            {branchDatabases.map((db) => (
              <label
                key={db.id}
                onClick={() => setSelectedBranchSource(db.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedBranchSource === db.id
                    ? 'border-blue-500/80 bg-blue-600/10 text-white font-semibold'
                    : 'border-surface-800/60 bg-surface-950/40 text-surface-300 hover:border-surface-700'
                }`}
              >
                <div>
                  <div className="font-sans">{db.name}</div>
                  <div className="text-[10px] text-surface-400 font-mono mt-0.5">
                    {db.properties} Properties • {db.tenants} Tenants • {db.trans.toLocaleString()} Trans
                  </div>
                </div>
                <input
                  type="radio"
                  name="branch_source"
                  checked={selectedBranchSource === db.id}
                  onChange={() => setSelectedBranchSource(db.id)}
                  className="accent-blue-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-800/80 bg-surface-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 font-mono">2</span>
            <h3 className="text-sm font-semibold text-white">Select Entity Type</h3>
          </div>
          <p className="text-xs text-surface-400 mb-4">
            Select the target relational model you want to populate:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(entityDefinitions).map(([key, def]) => {
              const Icon = def.icon
              const isSelected = selectedEntity === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedEntity(key)
                    setMappingOverrides({})
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/80 bg-blue-600/15 text-white font-semibold shadow-soft'
                      : 'border-surface-800/60 bg-surface-950/40 text-surface-300 hover:border-surface-700'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-2 ${isSelected ? 'text-blue-400' : 'text-surface-400'}`} />
                  <span className="text-xs">{def.label}</span>
                  <span className="text-[10px] text-surface-500 font-mono mt-0.5">{def.legacyTable}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-800/80 bg-surface-900/60 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 font-mono">3</span>
              <h3 className="text-sm font-semibold text-white">Upload Legacy Data File</h3>
            </div>
            <p className="text-xs text-surface-400 mb-4">
              Select exported CSV or JSON dump file:
            </p>

            <div className="relative border-2 border-dashed border-surface-800 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-colors bg-surface-950/30">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="h-8 w-8 mx-auto text-surface-400 mb-2" />
              <p className="text-xs font-medium text-white">
                {fileName ? fileName : 'Drop legacy CSV or JSON file here'}
              </p>
              <p className="text-[11px] text-surface-500 mt-1">
                Supports buruburu_legacy_export.csv or SQL dumps
              </p>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {parsedRows.length} rows loaded
              </span>
              <button
                type="button"
                onClick={executeMigration}
                disabled={importStatus === 'importing'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-soft transition-all cursor-pointer disabled:opacity-50"
              >
                {importStatus === 'importing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>Run Migration Batch</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {importStatus === 'importing' && (
        <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 shadow-card">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-blue-300">Executing Multi-Tenant Batch Ingestion</span>
            <span className="font-mono text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-surface-950 rounded-full h-2 overflow-hidden border border-surface-800">
            <div
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {importResults && (
        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Migration Batch Complete</h4>
              <p className="text-xs text-surface-400">
                Successfully processed and inserted records into {currentEntityConfig.targetTable}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-surface-500 block text-[10px] uppercase">Imported</span>
              <span className="text-emerald-400 font-bold text-sm">{importResults.imported}</span>
            </div>
            <div>
              <span className="text-surface-500 block text-[10px] uppercase">Skipped</span>
              <span className="text-surface-300 font-bold text-sm">{importResults.skipped}</span>
            </div>
            <div>
              <span className="text-surface-500 block text-[10px] uppercase">Errors</span>
              <span className="text-coral-400 font-bold text-sm">{importResults.errors}</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-surface-800/80 bg-surface-900/60 overflow-hidden mb-8 shadow-card">
        <div className="p-4 border-b border-surface-800/80 flex items-center justify-between bg-surface-950/60">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              1:1 Schema Mapping Matrix — {currentEntityConfig.label} ({currentEntityConfig.legacyTable} → {currentEntityConfig.targetTable})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-surface-400">
            Auto-Injects: company_id & branch_id compound foreign keys
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-800/80 bg-surface-950/70 text-surface-400 font-mono text-[11px]">
                <th className="py-3 px-4">Legacy SQL Column</th>
                <th className="py-3 px-4">ProMatrix Target Column</th>
                <th className="py-3 px-4">Field Purpose</th>
                <th className="py-3 px-4">Required</th>
                <th className="py-3 px-4">Source Key Mapping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50 font-sans">
              {currentEntityConfig.columns.map((col) => (
                <tr key={col.target} className="even:bg-surface-900/30 hover:bg-surface-850/40 text-surface-300">
                  <td className="py-3 px-4 font-mono font-bold text-blue-300">{col.legacy}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{col.target}</td>
                  <td className="py-3 px-4 text-surface-200">{col.label}</td>
                  <td className="py-3 px-4">
                    {col.required ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-coral-950/50 text-coral-400 border border-coral-500/20 font-semibold">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-800 text-surface-400">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-surface-400 text-[11px]">
                    <span className="px-2 py-1 rounded-lg bg-surface-950 border border-surface-800 text-surface-200">
                      {mappingOverrides[col.target] || col.legacy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="rounded-2xl border border-surface-800/80 bg-surface-900/60 overflow-hidden mb-8 shadow-card">
          <div className="p-4 border-b border-surface-800/80 flex items-center justify-between bg-surface-950/60">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Parsed Data Preview (First 5 Rows)</span>
            </h3>
            <span className="text-xs font-mono text-surface-400">{fileName}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-surface-800/80 bg-surface-950/70 text-surface-400 text-[11px]">
                  {Object.keys(previewRows[0] || {}).map((k) => (
                    <th key={k} className="py-3 px-4 whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="even:bg-surface-900/30 hover:bg-surface-850/40 text-surface-300">
                    {Object.values(row).map((val, cidx) => (
                      <td key={cidx} className="py-2.5 px-4 whitespace-nowrap text-surface-200">{String(val || '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-2xl border border-surface-800/80 bg-surface-950 p-4 font-mono text-xs text-surface-400 shadow-card">
          <div className="text-[11px] uppercase tracking-wider text-surface-500 font-bold mb-2">Execution Logs</div>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-surface-300">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
