import { useState, useEffect, useMemo } from 'react'
import {
  Receipt,
  Building,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Calendar,
  FileText,
  Printer,
  Banknote,
  DollarSign,
  Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Receipting() {
  const [leasesList, setLeasesList] = useState([])
  const [selectedLeaseId, setSelectedLeaseId] = useState('')
  const [selectedLease, setSelectedLease] = useState(null)
  const [outstandingBills, setOutstandingBills] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])
  const [chargeTypes, setChargeTypes] = useState([])
  const [currentPeriodId, setCurrentPeriodId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingBills, setLoadingBills] = useState(false)
  const [context, setContext] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [printedReceipt, setPrintedReceipt] = useState(null)

  const [lineAllocations, setLineAllocations] = useState({})

  const todayStr = new Date().toISOString().split('T')[0]
  const initialFormState = {
    posting_date: todayStr,
    payment_date: todayStr,
    payment_type: 'mpesa',
    ref_no: '',
    bank_name: '',
    comments: '',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: leasesData, error: lErr } = await supabase
        .from('leases')
        .select(`
          id,
          lease_no,
          agreed_rent,
          status,
          property_id,
          unit_id,
          tenant_id,
          properties!leases_company_property_fk (
            id,
            property_code,
            name
          ),
          units!leases_company_unit_fk (
            id,
            unit_number,
            unit_category,
            floor_level
          ),
          tenants!leases_company_tenant_fk (
            id,
            tenant_no,
            full_name,
            phone,
            id_or_passport_no
          )
        `)
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (lErr) throw lErr
      setLeasesList(leasesData || [])

      const { data: ctData, error: ctErr } = await supabase
        .from('charge_types')
        .select('id, code, name, description')
        .eq('company_id', tenant.companyId)
        .order('code', { ascending: true })

      if (ctErr) throw ctErr
      setChargeTypes(ctData || [])

      const { data: pData } = await supabase
        .from('accounting_periods')
        .select('id')
        .eq('company_id', tenant.companyId)
        .eq('status', 'open')
        .limit(1)

      if (pData && pData.length > 0) {
        setCurrentPeriodId(pData[0].id)
      }

      const { data: recData, error: recErr } = await supabase
        .from('financial_transactions')
        .select(`
          id,
          reference_no,
          transaction_date,
          credit_amount,
          payment_mode,
          payment_reference,
          comments,
          charge_types!ft_company_charge_fk (
            name,
            code
          ),
          tenants!ft_company_tenant_fk (
            full_name,
            tenant_no
          ),
          properties!ft_company_property_fk (
            name,
            property_code
          ),
          units!ft_company_unit_fk (
            unit_number
          )
        `)
        .eq('company_id', tenant.companyId)
        .eq('entry_type', 'payment_receipt')
        .order('created_at', { ascending: false })
        .limit(10)

      if (recErr) throw recErr
      setRecentReceipts(recData || [])

      if (leasesData && leasesData.length > 0 && !selectedLeaseId) {
        handleSelectLease(leasesData[0].id, leasesData, tenant)
      }
    } catch (err) {
      console.error('Failed to load receipting data:', err)
      setErrorMsg(err.message || 'Error loading receipting window.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const handleSelectLease = async (leaseId, list = leasesList, curContext = context) => {
    setSelectedLeaseId(leaseId)
    const lease = list.find((l) => l.id === leaseId)
    setSelectedLease(lease || null)
    setLineAllocations({})

    if (!lease || !curContext) {
      setOutstandingBills([])
      return
    }

    setLoadingBills(true)
    try {

      const { data: billsData, error: bErr } = await supabase
        .from('financial_transactions')
        .select(`
          id,
          reference_no,
          transaction_date,
          month,
          year,
          debit_amount,
          credit_amount,
          charge_type_id,
          comments,
          charge_types!ft_company_charge_fk (
            id,
            code,
            name
          )
        `)
        .eq('company_id', curContext.companyId)
        .eq('lease_id', lease.id)
        .eq('entry_type', 'invoice_charge')
        .order('transaction_date', { ascending: false })

      if (bErr) throw bErr
      setOutstandingBills(billsData || [])
    } catch (err) {
      console.error('Failed to load bills:', err)
    } finally {
      setLoadingBills(false)
    }
  }

  const payableRows = useMemo(() => {
    if (!selectedLease) return []

    const rows = []
    const invoicedChargeTypeIds = new Set()

    for (const bill of outstandingBills) {
      const chargeTypeId = bill.charge_type_id || bill.charge_types?.id
      if (chargeTypeId) {
        invoicedChargeTypeIds.add(chargeTypeId)
      }
      rows.push({
        key: bill.id,
        billId: bill.id,
        chargeTypeId,
        chargeTypeName: bill.charge_types?.name || 'General Charge',
        chargeCode: bill.charge_types?.code || '',
        refNo: bill.reference_no,
        date: bill.transaction_date,
        period: `${bill.month ? String(bill.month).padStart(2, '0') : '--'}/${bill.year || '2026'}`,
        outstandingAmount: Number(bill.debit_amount || 0),
        isInvoice: true,
        comments: bill.comments,
      })
    }

    for (const ct of chargeTypes) {
      if (!invoicedChargeTypeIds.has(ct.id)) {
        rows.push({
          key: `ct-${ct.id}`,
          billId: null,
          chargeTypeId: ct.id,
          chargeTypeName: ct.name,
          chargeCode: ct.code,
          refNo: 'DIRECT',
          date: 'Current',
          period: 'Current',
          outstandingAmount: 0.0,
          isInvoice: false,
          comments: ct.description || ct.name,
        })
      }
    }

    return rows
  }, [selectedLease, outstandingBills, chargeTypes])

  const handleLineAmountChange = (key, value) => {
    setLineAllocations((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleAllocateFull = (key, outstandingAmount) => {
    setLineAllocations((prev) => ({
      ...prev,
      [key]: outstandingAmount > 0 ? String(outstandingAmount) : '',
    }))
  }

  const dynamicTotal = useMemo(() => {
    return Object.values(lineAllocations).reduce((sum, val) => {
      const num = parseFloat(val)
      return sum + (isNaN(num) || num < 0 ? 0 : num)
    }, 0)
  }, [lineAllocations])

  const activeAllocationsCount = useMemo(() => {
    return Object.values(lineAllocations).filter((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }).length
  }, [lineAllocations])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitReceipt = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context missing.')
      if (!selectedLease) throw new Error('Please select an active Tenant / Tenancy Account.')

      const allocationsToPost = []
      for (const row of payableRows) {
        const rawVal = lineAllocations[row.key]
        const amt = parseFloat(rawVal)
        if (!isNaN(amt) && amt > 0) {
          allocationsToPost.push({
            row,
            amount: amt,
          })
        }
      }

      if (allocationsToPost.length === 0) {
        throw new Error('Please enter a payment amount in the Amount column for at least one payable item.')
      }

      const receiptNo = `RC${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`
      const txDate = formData.payment_date || formData.posting_date || todayStr
      const pDate = new Date(txDate)
      const txMonth = pDate.getMonth() + 1
      const txYear = pDate.getFullYear()

      const payloads = allocationsToPost.map(({ row, amount }) => ({
        company_id: context.companyId,
        branch_id: context.branchId,
        property_id: selectedLease.property_id,
        unit_id: selectedLease.unit_id,
        tenant_id: selectedLease.tenant_id,
        lease_id: selectedLease.id,
        charge_type_id: row.chargeTypeId,
        period_id: currentPeriodId || null,
        entry_type: 'payment_receipt',
        reference_no: receiptNo,
        transaction_date: txDate,
        month: txMonth,
        year: txYear,
        debit_amount: 0.0,
        credit_amount: amount,
        payment_mode: formData.payment_type,
        payment_reference: formData.ref_no ? formData.ref_no.trim().toUpperCase() : null,
        bank_account_name: formData.bank_name ? formData.bank_name.trim() : null,
        comments: formData.comments?.trim()
          ? `${formData.comments.trim()} [${row.chargeTypeName}]`
          : `Receipt for ${row.chargeTypeName} - ${selectedLease.tenants?.full_name}`,
        is_confirmed: true,
      }))

      const { data: insertedData, error: txErr } = await supabase
        .from('financial_transactions')
        .insert(payloads)
        .select()

      if (txErr) throw txErr

      const totalAmount = allocationsToPost.reduce((s, a) => s + a.amount, 0)
      const receiptVoucher = {
        reference_no: receiptNo,
        transaction_date: txDate,
        posting_date: formData.posting_date,
        payment_mode: formData.payment_type,
        payment_reference: formData.ref_no?.trim().toUpperCase() || 'N/A',
        bank_account_name: formData.bank_name?.trim() || 'N/A',
        comments: formData.comments?.trim() || '',
        tenant: selectedLease.tenants,
        property: selectedLease.properties,
        unit: selectedLease.units,
        items: allocationsToPost.map(({ row, amount }) => ({
          chargeTypeName: row.chargeTypeName,
          chargeCode: row.chargeCode,
          refNo: row.refNo,
          amount,
        })),
        totalAmount,
      }

      setPrintedReceipt(receiptVoucher)
      setSuccessMsg(
        `Receipt ${receiptNo} posted successfully! Created ${allocationsToPost.length} distinct credit row(s) totaling KES ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      )

      setLineAllocations({})
      setFormData((prev) => ({
        ...prev,
        ref_no: '',
        bank_name: '',
        comments: '',
      }))

      await loadInitialData()
      if (selectedLeaseId) {
        await handleSelectLease(selectedLeaseId)
      }
    } catch (err) {
      console.error('Payment receipt failed:', err)
      setErrorMsg(err.message || 'Failed to record receipt.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalOutstandingDue = outstandingBills.reduce((acc, b) => acc + (Number(b.debit_amount) || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 5</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Financial Ledger & Cash Office</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Receipting Window</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Receipt className="h-7 w-7 text-indigo-400" />
              <span>Cashier Receipting & Manual Allocation</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manual line-item allocation across rent, utilities, and service charges with strict multi-tenant ledger integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadInitialData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Receipting Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/90 mt-0.5">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-2">
              1. Select Active Tenant / Tenancy Account
            </label>
            <div className="relative">
              <select
                value={selectedLeaseId}
                onChange={(e) => handleSelectLease(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">-- Choose Tenant & Unit Account --</option>
                {leasesList.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    [{lease.tenants?.tenant_no}] {lease.tenants?.full_name} — Unit {lease.units?.unit_number} ({lease.properties?.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLease && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Tenant Name</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {selectedLease.tenants?.full_name}
                </span>
                <span className="text-[11px] font-mono text-indigo-400">
                  {selectedLease.tenants?.tenant_no}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Property & Unit</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {selectedLease.properties?.name}
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  Unit {selectedLease.units?.unit_number} ({selectedLease.units?.unit_category})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Agreed Rent</span>
                <span className="font-bold text-emerald-400 mt-0.5 block font-mono text-sm">
                  KES {Number(selectedLease.agreed_rent).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Base Contract</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Unsettled Due</span>
                <span className="font-bold text-rose-400 mt-0.5 block font-mono text-sm">
                  KES {totalOutstandingDue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Invoiced Arrears</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                2. Outstanding Balances & Line-Item Allocation Grid
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400 hidden sm:inline">
                Invoiced Due: <strong className="text-rose-400">KES {totalOutstandingDue.toLocaleString()}</strong>
              </span>
              <span className="text-slate-400">
                Allocated Lines: <strong className="text-indigo-400">{activeAllocationsCount}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Payable Item</th>
                  <th className="py-3 px-4">Invoice Ref</th>
                  <th className="py-3 px-4">Period / Date</th>
                  <th className="py-3 px-4 text-right">Balance Due (KES)</th>
                  <th className="py-3 px-4 text-right w-48">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loadingBills ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading payable items & bills...</span>
                      </div>
                    </td>
                  </tr>
                ) : !selectedLease ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      Please select an active tenant account above to display payable items.
                    </td>
                  </tr>
                ) : payableRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      No payable items found for this account.
                    </td>
                  </tr>
                ) : (
                  payableRows.map((row) => {
                    const currentVal = lineAllocations[row.key] || ''
                    const hasAllocation = parseFloat(currentVal) > 0

                    return (
                      <tr
                        key={row.key}
                        className={`transition-colors ${
                          hasAllocation
                            ? 'bg-emerald-950/20 text-slate-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{row.chargeTypeName}</span>
                            {row.chargeCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {row.chargeCode}
                              </span>
                            )}
                          </div>
                          {row.comments && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {row.comments}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {row.isInvoice ? (
                            <span className="font-semibold text-indigo-400">{row.refNo}</span>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Advance / Direct</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400">
                          {row.date || row.period}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-right text-rose-300">
                          {row.outstandingAmount > 0
                            ? Number(row.outstandingAmount).toLocaleString('en-KE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.outstandingAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAllocateFull(row.key, row.outstandingAmount)}
                                title="Allocate full balance due"
                                className="px-2 py-1 text-[10px] font-mono font-semibold uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                              >
                                Full
                              </button>
                            )}
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={currentVal}
                                onChange={(e) => handleLineAmountChange(row.key, e.target.value)}
                                className={`w-32 bg-slate-950 border rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-xs focus:outline-none transition-all ${
                                  hasAllocation
                                    ? 'border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/20'
                                    : 'border-slate-700 text-white focus:border-indigo-500'
                                }`}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/90 font-mono">
                  <td colSpan="4" className="py-3.5 px-4 text-right uppercase tracking-wider font-bold text-slate-300">
                    Total:
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      KES{' '}
                      {dynamicTotal.toLocaleString('en-KE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <form onSubmit={handleSubmitReceipt} className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    3. Payment & Settlement Details
                  </h3>
                  <p className="text-xs text-slate-400">Capture financial transaction metadata</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
                <span className="text-slate-400">Total To Credit:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  KES{' '}
                  {dynamicTotal.toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Posting Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  name="posting_date"
                  required
                  value={formData.posting_date}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  name="payment_date"
                  required
                  value={formData.payment_date}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Type <span className="text-rose-400">*</span>
                </label>
                <select
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="mpesa">M-Pesa Paybill</option>
                  <option value="bank">Bank Deposit / EFT</option>
                  <option value="cash">Cash Office</option>
                  <option value="cheque">Banker's Cheque</option>
                </select>
              </div>

              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ref No (M-Pesa / Cheque)
                </label>
                <input
                  type="text"
                  name="ref_no"
                  placeholder="e.g. QKH829104"
                  value={formData.ref_no}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bank Name / Account
                </label>
                <input
                  type="text"
                  name="bank_name"
                  placeholder="e.g. Equity Bank"
                  value={formData.bank_name}
                  onChange={handleFormChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Isolation Context
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2 truncate">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {context?.companyName} • {context?.branchCode}
                  </span>
                </div>
              </div>
            </div>

            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Comments / Narrative
              </label>
              <textarea
                rows="2"
                name="comments"
                placeholder="e.g. Settlement for rent and water bills via M-Pesa"
                value={formData.comments}
                onChange={handleFormChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-slate-400">
                {activeAllocationsCount > 0
                  ? `Will post ${activeAllocationsCount} distinct ledger transaction(s) for KES ${dynamicTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                  : 'Enter amounts in the grid above to activate payment posting.'}
              </p>
              <button
                type="submit"
                disabled={submitting || !selectedLease || dynamicTotal <= 0}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting Allocations...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save (KES {dynamicTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-400" />
            <span>Recent Cash Office Receipts (Branch Audit Stream)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentReceipts.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/70 flex flex-col justify-between text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400">{r.reference_no}</span>
                  <span className="uppercase text-[10px] font-mono py-0.5 px-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {r.payment_mode}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-medium text-slate-200 truncate">{r.tenants?.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Unit {r.units?.unit_number} • {r.charge_types?.name || 'Payment'}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
                  <span className="text-[10px] text-slate-500">{r.transaction_date}</span>
                  <span className="font-bold text-white text-xs">
                    KES {Number(r.credit_amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        
        {printedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Official Payment Receipt</h3>
                </div>
                <button
                  onClick={() => setPrintedReceipt(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-center pb-2 border-b border-slate-800">
                  <p className="font-bold text-sm text-white uppercase">{context?.companyName}</p>
                  <p className="text-[11px] text-slate-400">{context?.branchName} • {context?.branchCode}</p>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>RECEIPT NO:</span>
                  <span className="font-bold text-emerald-400">{printedReceipt.reference_no}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>POSTING DATE:</span>
                  <span>{printedReceipt.posting_date}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PAYMENT DATE:</span>
                  <span>{printedReceipt.transaction_date}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>TENANT:</span>
                  <span className="font-semibold text-white">{printedReceipt.tenant?.full_name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PROPERTY:</span>
                  <span>{printedReceipt.property?.name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>UNIT:</span>
                  <span>Unit {printedReceipt.unit?.unit_number}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PAYMENT TYPE:</span>
                  <span className="uppercase">{printedReceipt.payment_mode}</span>
                </div>
                {printedReceipt.payment_reference && printedReceipt.payment_reference !== 'N/A' && (
                  <div className="flex justify-between text-slate-300">
                    <span>REF NO:</span>
                    <span>{printedReceipt.payment_reference}</span>
                  </div>
                )}
                {printedReceipt.bank_account_name && printedReceipt.bank_account_name !== 'N/A' && (
                  <div className="flex justify-between text-slate-300">
                    <span>BANK NAME:</span>
                    <span>{printedReceipt.bank_account_name}</span>
                  </div>
                )}

                
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                    <span>ALLOCATED ITEM</span>
                    <span>AMOUNT (KES)</span>
                  </div>
                  {printedReceipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300 py-0.5">
                      <span>{item.chargeTypeName}</span>
                      <span className="text-white font-bold">
                        {item.amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-slate-200">TOTAL PAID:</span>
                  <span className="text-emerald-400">
                    KES {Number(printedReceipt.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setPrintedReceipt(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
