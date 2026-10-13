import { useState, useEffect } from 'react'
import {
  Receipt,
  Search,
  Building,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  Filter,
  ShieldCheck,
  DollarSign,
  Calendar,
  FileText,
  Printer,
  Layers,
  Banknote,
  Send,
  Building2,
  Phone
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
  const [loading, setLoading] = useState(true)
  const [loadingBills, setLoadingBills] = useState(false)
  const [context, setContext] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [printedReceipt, setPrintedReceipt] = useState(null)

  // Payment Form State
  const initialFormState = {
    amount: '',
    payment_mode: 'mpesa',
    payment_reference: '',
    bank_name: '',
    transaction_date: new Date().toISOString().split('T')[0],
    charge_type_id: '',
    comments: '',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      // 1. Fetch active leases with tenant, property, and unit
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

      // 2. Fetch charge types
      const { data: ctData, error: ctErr } = await supabase
        .from('charge_types')
        .select('id, code, name')
        .eq('company_id', tenant.companyId)
        .order('code', { ascending: true })

      if (ctErr) throw ctErr
      setChargeTypes(ctData || [])

      // Default charge type: Rent (code '001')
      const rentType = ctData?.find((c) => c.code === '001')
      if (rentType) {
        setFormData((prev) => ({ ...prev, charge_type_id: rentType.id }))
      }

      // 3. Fetch recent payment receipts
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
        .order('transaction_date', { ascending: false })
        .limit(10)

      if (recErr) throw recErr
      setRecentReceipts(recData || [])

      // Auto-select first lease if available
      if (leasesData && leasesData.length > 0) {
        handleSelectLease(leasesData[0].id, leasesData)
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

  const handleSelectLease = async (leaseId, list = leasesList) => {
    setSelectedLeaseId(leaseId)
    const lease = list.find((l) => l.id === leaseId)
    setSelectedLease(lease || null)

    if (!lease || !context) {
      setOutstandingBills([])
      return
    }

    setLoadingBills(true)
    try {
      // Fetch outstanding bills / invoices for this tenant & lease
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
          comments,
          charge_types!ft_company_charge_fk (
            id,
            code,
            name
          )
        `)
        .eq('company_id', context.companyId)
        .eq('lease_id', lease.id)
        .eq('entry_type', 'invoice_charge')
        .order('transaction_date', { ascending: false })

      if (bErr) throw bErr
      setOutstandingBills(billsData || [])

      // Pre-fill amount with lease rent if form amount is empty
      if (!formData.amount && lease.agreed_rent) {
        setFormData((prev) => ({
          ...prev,
          amount: String(lease.agreed_rent),
        }))
      }
    } catch (err) {
      console.error('Failed to load bills:', err)
    } finally {
      setLoadingBills(false)
    }
  }

  const handleInputChange = (e) => {
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
      if (!selectedLease) throw new Error('Please select an active Tenant / Lease.')
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid payment amount.')
      }

      const receiptAmount = parseFloat(formData.amount)
      const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const txDate = new Date(formData.transaction_date)
      const txMonth = txDate.getMonth() + 1
      const txYear = txDate.getFullYear()

      // Charge type ID (default to rent charge type or first available)
      const chargeId = formData.charge_type_id || chargeTypes[0]?.id

      // 1. Prepare Credit entry in financial_transactions
      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        property_id: selectedLease.property_id,
        unit_id: selectedLease.unit_id,
        tenant_id: selectedLease.tenant_id,
        lease_id: selectedLease.id,
        charge_type_id: chargeId,
        entry_type: 'payment_receipt',
        reference_no: receiptNo,
        transaction_date: formData.transaction_date,
        month: txMonth,
        year: txYear,
        debit_amount: 0.00,
        credit_amount: receiptAmount,
        payment_mode: formData.payment_mode,
        payment_reference: formData.payment_reference.trim().toUpperCase() || null,
        bank_account_name: formData.bank_name.trim() || null,
        comments: formData.comments.trim() || `Receipt payment for ${selectedLease.tenants?.full_name}`,
        is_confirmed: true,
      }

      const { data: txData, error: txErr } = await supabase
        .from('financial_transactions')
        .insert([payload])
        .select()

      if (txErr) throw txErr

      const generatedReceipt = {
        ...payload,
        id: txData?.[0]?.id || receiptNo,
        tenant: selectedLease.tenants,
        property: selectedLease.properties,
        unit: selectedLease.units,
        chargeTypeName: chargeTypes.find((c) => c.id === chargeId)?.name || 'Rent',
      }

      setPrintedReceipt(generatedReceipt)
      setSuccessMsg(`Receipt ${receiptNo} recorded successfully for KES ${receiptAmount.toLocaleString()}!`)

      // Reset form
      setFormData((prev) => ({
        ...prev,
        amount: '',
        payment_reference: '',
        comments: '',
      }))

      // Refresh data
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

  // Calculate total unpaid invoices
  const totalBilled = outstandingBills.reduce((acc, b) => acc + (Number(b.debit_amount) || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
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
              <span>Cashier Receipting & Payment Entry</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Collect rent, utility bills, and security deposits with instant ledger credit posting.
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

        {/* Feedback Alerts */}
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

        {/* Main Receipting Window (Figure 1 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tenant Selection & Outstanding Balance Grid (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tenant / Lease Picker Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
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

              {/* Selected Account Summary Pill */}
              {selectedLease && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Rent</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block font-mono text-sm">
                      KES {Number(selectedLease.agreed_rent).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500">Agreed Rate</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Contact Phone</span>
                    <span className="font-mono text-slate-300 mt-0.5 block">
                      {selectedLease.tenants?.phone}
                    </span>
                    <span className="text-[10px] text-slate-500">KYC Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Outstanding Payable Charges Grid */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                    2. Unsettled Invoices & Bill Breakdown
                  </h3>
                </div>
                <div className="font-mono text-xs">
                  <span className="text-slate-400">Total Due: </span>
                  <span className="font-bold text-rose-400">
                    KES {totalBilled.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Invoice Ref</th>
                      <th className="py-2.5 px-4">Payable Item</th>
                      <th className="py-2.5 px-4">Date / Month</th>
                      <th className="py-2.5 px-4 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {loadingBills ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span>Fetching unpaid invoices...</span>
                          </div>
                        </td>
                      </tr>
                    ) : outstandingBills.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500">
                          No pending debit invoices found for this account. Account is up to date!
                        </td>
                      </tr>
                    ) : (
                      outstandingBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-800/40 transition-colors text-slate-300">
                          <td className="py-2.5 px-4 font-mono font-semibold text-indigo-400">
                            {bill.reference_no}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-200">
                              {bill.charge_types?.name || 'General Charge'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {bill.comments}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-400">
                            {bill.transaction_date}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-right text-rose-300">
                            {Number(bill.debit_amount).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Cashier Receipts Audit Stream */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Recent Cash Office Receipts (Branch Audit Stream)</span>
              </h3>
              <div className="space-y-2.5">
                {recentReceipts.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">{r.reference_no}</span>
                        <span className="uppercase text-[10px] font-mono py-0.5 px-1.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {r.payment_mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.tenants?.full_name} • Unit {r.units?.unit_number} ({r.properties?.name})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white text-sm">
                        KES {Number(r.credit_amount).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono">{r.transaction_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Payment Entry Form (Figure 1 Form) (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-20">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Payment Receipt</h3>
                  <p className="text-xs text-slate-400">Post credit to tenant ledger</p>
                </div>
              </div>

              <form onSubmit={handleSubmitReceipt} className="space-y-4">
                {/* Amount Paid */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount Paid (KES) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-500 font-bold">KES</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      name="amount"
                      required
                      placeholder="e.g. 6500.00"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Payment Mode <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="payment_mode"
                      value={formData.payment_mode}
                      onChange={handleInputChange}
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
                      Date of Payment <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="transaction_date"
                      required
                      value={formData.transaction_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Ref No & Bank Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tx Ref / M-Pesa Code
                    </label>
                    <input
                      type="text"
                      name="payment_reference"
                      placeholder="e.g. QKH829104"
                      value={formData.payment_reference}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank / Account
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      placeholder="e.g. Equity Bank"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Charge Category Allocated */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Apply Toward Charge
                  </label>
                  <select
                    name="charge_type_id"
                    value={formData.charge_type_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {chargeTypes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comments / Remarks */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Narrative / Comments
                  </label>
                  <textarea
                    rows="2"
                    name="comments"
                    placeholder="e.g. Full settlement of October 2026 rent"
                    value={formData.comments}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Multi-Tenant Security Guardrail */}
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>
                    Receipt will post strictly within <strong>{context?.companyName}</strong> ({context?.branchCode}).
                  </span>
                </div>

                {/* Save & Print Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !selectedLease}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Posting Receipt...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Save & Post Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Printable Receipt Voucher Modal */}
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

              {/* Receipt Body */}
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
                  <span>DATE:</span>
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
                  <span>PAYMENT MODE:</span>
                  <span className="uppercase">{printedReceipt.payment_mode}</span>
                </div>
                {printedReceipt.payment_reference && (
                  <div className="flex justify-between text-slate-300">
                    <span>TX REFERENCE:</span>
                    <span>{printedReceipt.payment_reference}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-slate-200">AMOUNT PAID:</span>
                  <span className="text-emerald-400">KES {Number(printedReceipt.credit_amount).toLocaleString()}</span>
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
