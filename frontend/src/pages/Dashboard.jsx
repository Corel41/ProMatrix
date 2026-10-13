import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Home,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Database,
  Layers,
  Activity,
  Plus,
  Compass,
  FileText,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Droplets,
  MessageSquare
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    landlords: 0,
    properties: 0,
    units: 0,
    tenants: 0,
    leases: 0,
    meters: 0,
    transactions: 0,
    messages: 0,
  })

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          navigate('/auth')
          return
        }
        setUser(user)

        const tenant = await getTenantContext()
        setContext(tenant)

        // Query live counts under tenant's company
        const [lRes, pRes, uRes, tRes, leaseRes, mRes, txRes, msgRes] = await Promise.all([
          supabase.from('landlords').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('units').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('leases').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('utility_meters').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('communication_logs').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
        ])

        setStats({
          landlords: lRes.count || 0,
          properties: pRes.count || 0,
          units: uRes.count || 0,
          tenants: tRes.count || 0,
          leases: leaseRes.count || 0,
          meters: mRes.count || 0,
          transactions: txRes.count || 0,
          messages: msgRes.count || 0,
        })
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium font-mono text-slate-300">Loading ProMatrix Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Domains 1 to 6 Live • Communications, Meter Billing & Ledger Enforced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-indigo-400">{user?.email}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Your session is active in <strong>{context?.companyName}</strong> (Branch:{' '}
              <span className="font-mono text-indigo-400">{context?.branchName}</span>).
              Multi-tenant Row-Level Security (RLS) is strictly isolating operational data across all 22 Phase 2 tables.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">COMPANY:</span>
                <span className="text-slate-200">{context?.companyName}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">BRANCH:</span>
                <span className="text-indigo-400">{context?.branchCode}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">SECURITY:</span>
                <span className="text-emerald-400">Compound FK RLS Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Operational Metrics from Cloud Database */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Real Estate Operational Metrics</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live Cloud DB Sync</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Landlords Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <Link
                  to="/landlords"
                  className="text-slate-500 group-hover:text-indigo-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Landlords</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.landlords}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Owners</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/landlords"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                >
                  <span>View Register</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Properties Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Home className="h-4 w-4" />
                </div>
                <Link
                  to="/properties"
                  className="text-slate-500 group-hover:text-emerald-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Properties</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.properties}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Estates</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/properties"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Manage Estates</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Units Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <Link
                  to="/units"
                  className="text-slate-500 group-hover:text-amber-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Rental Units</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.units}</span>
                  <span className="text-[10px] text-amber-400 font-mono">Spaces</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/units"
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Units Inventory</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Tenants Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <UserCheck className="h-4 w-4" />
                </div>
                <Link
                  to="/tenants"
                  className="text-slate-500 group-hover:text-sky-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Tenants</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.tenants}</span>
                  <span className="text-[10px] text-sky-400 font-mono">Occupants</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/tenants"
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Tenants KYC</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Leases Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <Link
                  to="/leases"
                  className="text-slate-500 group-hover:text-purple-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Active Leases</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.leases}</span>
                  <span className="text-[10px] text-purple-400 font-mono">Contracts</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/leases"
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Lease Registry</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Ledger Transactions Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <Link
                  to="/statements"
                  className="text-slate-500 group-hover:text-teal-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-[11px] text-slate-400 font-medium">Ledger Records</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{stats.transactions}</span>
                  <span className="text-[10px] text-teal-400 font-mono">Entries</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                <Link
                  to="/statements"
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Audit Ledger</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations Launchpad */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>Operational Navigation Launchpad</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Units Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Layers className="h-4 w-4" />
                  <span>Rental Units & Meter Inventory</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Configure bedsitters, 1B, 2B, shops, floor levels, water meters, and base rent rates.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/units"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Units Inventory</span>
                </Link>
              </div>
            </div>

            {/* Tenants Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <UserCheck className="h-4 w-4" />
                  <span>Tenants & Occupants KYC</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Register tenant identities, national ID/passports, workplace contacts, and next of kin.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/tenants"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Tenants Registry</span>
                </Link>
              </div>
            </div>

            {/* Leases Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Lease Contracts Junction</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Bind tenants to units with agreed rent, security deposits held, and escalation terms.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/leases"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Manage Leases</span>
                </Link>
              </div>
            </div>

            {/* Utility Meter Readings Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <Droplets className="h-4 w-4" />
                  <span>Water Meter Readings (Domain 4)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Capture monthly water meter readings, compute consumption, and auto-calculate tenant utility bills.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/meter-readings"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Meter Readings</span>
                </Link>
              </div>
            </div>

            {/* Receipting Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span>Receipting Window (Fig 1)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Collect rent and utilities, capture M-Pesa / Bank refs, and generate printable receipt vouchers.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/receipting"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Receipting</span>
                </Link>
              </div>
            </div>

            {/* Tenant Statements Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Tenant Statements (Fig 3)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Audit chronological double-entry debits, credits, and computed running balances per lease.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/statements"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>View Statements</span>
                </Link>
              </div>
            </div>

            {/* Communications & Bulk SMS Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <MessageSquare className="h-4 w-4" />
                  <span>Communications & Bulk SMS (Domain 6)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Send single client SMS alerts, estate-wide bulk broadcasts, and inspect telco gateway delivery logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/communications"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Communications</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Tenant Security & Audit Verification Status */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Multi-Tenant Enterprise Security Guardrails</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Row-Level Security (RLS) active on units, tenants, and leases
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Compound Foreign Keys guarantee a lease cannot link Unit A with Company B
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Unique active unit exclusion prevents double-leasing of the same unit
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Immutable audit log triggers on all occupancy and tenancy mutations
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
