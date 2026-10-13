import { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
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
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Scale
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function TenantStatements() {
  const [tenantsList, setTenantsList] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [tenantLease, setTenantLease] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [context, setContext] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      // Fetch active tenants who have active leases
      const { data: tData, error: tErr } = await supabase
        .from('tenants')
        .select(`
          id,
          tenant_no,
          full_name,
          phone,
          email,
          id_or_passport_no
        `)
        .eq('company_id', tenant.companyId)
        .order('full_name', { ascending: true })

      if (tErr) throw tErr
      setTenantsList(tData || [])

      if (tData && tData.length > 0) {
        handleSelectTenant(tData[0].id, tData)
      }
    } catch (err) {
      console.error('Failed to load tenants for statement:', err)
      setErrorMsg(err.message || 'Error loading tenant list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const handleSelectTenant = async (tenantId, list = tenantsList) => {
    setSelectedTenantId(tenantId)
    const t = list.find((item) => item.id === tenantId)
    setSelectedTenant(t || null)

    if (!tenantId || !context) {
      setTransactions([])
      setTenantLease(null)
      return
    }

    setLoadingTransactions(true)
    try {
      // 1. Fetch tenant's active lease & property/unit info
      const { data: leaseData, error: lErr } = await supabase
        .from('leases')
        .select(`
          id,
          lease_no,
          agreed_rent,
          start_date,
          properties!leases_company_property_fk (
            id,
            property_code,
            name
          ),
          units!leases_company_unit_fk (
            id,
            unit_number,
            unit_category
          )
        `)
        .eq('company_id', context.companyId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!lErr && leaseData && leaseData.length > 0) {
        setTenantLease(leaseData[0])
      } else {
        setTenantLease(null)
      }

      // 2. Fetch all chronological double-entry financial transactions for this tenant
      const { data: txData, error: txErr } = await supabase
        .from('financial_transactions')
        .select(`
          id,
          reference_no,
          transaction_date,
          month,
          year,
          entry_type,
          debit_amount,
          credit_amount,
          payment_mode,
          payment_reference,
          comments,
          charge_types!ft_company_charge_fk (
            code,
            name
          )
        `)
        .eq('company_id', context.companyId)
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: true })

      if (txErr) throw txErr

      // Calculate running balance chronologically
      let running = 0
      const calculatedTransactions = (txData || []).map((tx) => {
        const debit = Number(tx.debit_amount) || 0
        const credit = Number(tx.credit_amount) || 0
        running = running + debit - credit
        return {
          ...tx,
          runningBalance: running,
        }
      })

      setTransactions(calculatedTransactions)
    } catch (err) {
      console.error('Failed to load statement ledger:', err)
    } finally {
      setLoadingTransactions(false)
    }
  }

  // Summary Metrics
  const totalDebits = transactions.reduce((acc, tx) => acc + (Number(tx.debit_amount) || 0), 0)
  const totalCredits = transactions.reduce((acc, tx) => acc + (Number(tx.credit_amount) || 0), 0)
  const netClosingBalance = totalDebits - totalCredits

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
              <span className="text-slate-300">Tenant Statements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FileSpreadsheet className="h-7 w-7 text-indigo-400" />
              <span>Authoritative Tenant Statement</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Chronological double-entry customer ledger tracking all invoiced debits, paid credits, and running balance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectTenant(selectedTenantId)}
              disabled={loadingTransactions}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTransactions ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Tenant Selector & Account Header (Figure 3 Header) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-96">
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-1.5">
                Select Tenant Account
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleSelectTenant(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">-- Choose Tenant --</option>
                {tenantsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.tenant_no}] {t.full_name} ({t.phone})
                  </option>
                ))}
              </select>
            </div>

            {selectedTenant && (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Account Verified • Branch: {context?.branchCode}</span>
              </div>
            )}
          </div>

          {/* Account Profile Bar */}
          {selectedTenant && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Tenant Name</span>
                <span className="font-bold text-white text-sm mt-0.5 block truncate">
                  {selectedTenant.full_name}
                </span>
                <span className="text-[11px] font-mono text-indigo-400">
                  {selectedTenant.tenant_no} • ID: {selectedTenant.id_or_passport_no}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Property & Unit</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {tenantLease?.properties?.name || 'No Active Property'}
                </span>
                <span className="text-[11px] font-mono text-amber-400">
                  {tenantLease?.units ? `Unit ${tenantLease.units.unit_number} (${tenantLease.units.unit_category})` : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Rent Rate</span>
                <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">
                  KES {tenantLease?.agreed_rent ? Number(tenantLease.agreed_rent).toLocaleString() : '0'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Lease Ref: {tenantLease?.lease_no || '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Tenant Mobile Phone</span>
                <span className="font-mono text-slate-200 mt-0.5 block">
                  {selectedTenant.phone}
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedTenant.email || 'No email registered'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Debits (Billed)</span>
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                KES {totalDebits.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total rent & utility invoice charges</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Credits (Paid)</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                KES {totalCredits.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total cashier payment receipts</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Net Closing Balance</span>
              <Scale className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono ${
                  netClosingBalance > 0
                    ? 'text-rose-400'
                    : netClosingBalance < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                KES {Math.abs(netClosingBalance).toLocaleString()}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold uppercase ${
                  netClosingBalance > 0
                    ? 'text-rose-400'
                    : netClosingBalance < 0
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {netClosingBalance > 0 ? 'Arrears' : netClosingBalance < 0 ? 'Prepaid' : 'Settled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {netClosingBalance > 0 ? 'Outstanding amount owed by tenant' : 'No overdue arrears'}
            </p>
          </div>
        </div>

        {/* Chronological Double-Entry Statement Grid (Figure 3) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                Double-Entry Statement Ledger
              </h3>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {transactions.length} Ledger Line Entries
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payables / Description</th>
                  <th className="py-3 px-4">Ref No</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Debit (KES)</th>
                  <th className="py-3 px-4 text-right">Credit (KES)</th>
                  <th className="py-3 px-4 text-right">Running Balance (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Compiling statement ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      No transaction entries recorded for this tenant account.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300 font-mono"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-100">
                          {tx.charge_types?.name || (tx.entry_type === 'payment_receipt' ? 'Payment Receipt' : 'Invoice Charge')}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-sm font-mono mt-0.5">
                          {tx.comments || '—'}
                          {tx.payment_reference && ` • Ref: ${tx.payment_reference}`}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-indigo-400">
                        {tx.reference_no}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                        {tx.month ? `${tx.month}/${tx.year}` : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-rose-300">
                        {Number(tx.debit_amount) > 0 ? Number(tx.debit_amount).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-emerald-400">
                        {Number(tx.credit_amount) > 0 ? Number(tx.credit_amount).toLocaleString() : '—'}
                      </td>
                      <td
                        className={`py-3 px-4 whitespace-nowrap text-right font-bold ${
                          tx.runningBalance > 0
                            ? 'text-rose-400'
                            : tx.runningBalance < 0
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        KES {Math.abs(tx.runningBalance).toLocaleString()}
                        {tx.runningBalance > 0 ? ' DR' : tx.runningBalance < 0 ? ' CR' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950/70 px-5 py-3.5 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono">
              Net Statement Position: <strong className={netClosingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                KES {Math.abs(netClosingBalance).toLocaleString()} {netClosingBalance > 0 ? 'in Arrears' : 'Prepaid/Clear'}
              </strong>
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Multi-tenant Isolation: {context?.branchCode}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
