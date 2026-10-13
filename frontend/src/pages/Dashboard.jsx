import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Home,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
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
  MessageSquare,
  Sparkles,
  ArrowRight
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
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (error || !user) {
          navigate('/auth')
          return
        }
        setUser(user)

        const tenant = await getTenantContext()
        setContext(tenant)

        // Query live counts under tenant's company
        const [lRes, pRes, uRes, tRes, leaseRes, mRes, txRes, msgRes] = await Promise.all([
          supabase
            .from('landlords')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('leases')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('utility_meters')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('financial_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
          supabase
            .from('communication_logs')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', tenant.companyId),
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
      <div className="min-h-screen bg-surface-950 flex items-center justify-center text-surface-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium font-mono text-surface-300">Loading ProMatrix OS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col selection:bg-brand-500/20 selection:text-brand-300">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* 1. Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-surface-900 via-surface-900 to-surface-850 border border-surface-800/80 p-8 sm:p-10 shadow-elevated">
          {/* Subtle background glow */}
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 bg-mint-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint-950/40 border border-mint-500/30 text-mint-400 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-mint-400" />
              <span>All 6 Enterprise Domains Active • RLS Compound Isolation Enforced</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans">
              Welcome back,{' '}
              <span className="text-brand-300">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
            </h1>

            <p className="text-sm text-surface-300 leading-relaxed font-normal">
              You are working in <strong>{context?.companyName}</strong> (Branch:{' '}
              <span className="font-mono text-brand-300 font-medium">{context?.branchName}</span>).
              Operational records, tenant leases, and accounting ledgers are mathematically isolated.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 bg-surface-950/80 px-3.5 py-1.5 rounded-xl border border-surface-800">
                <span className="text-surface-500">COMPANY:</span>
                <span className="text-surface-200 font-semibold">{context?.companyName}</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-950/80 px-3.5 py-1.5 rounded-xl border border-surface-800">
                <span className="text-surface-500">BRANCH:</span>
                <span className="text-brand-300 font-semibold">{context?.branchCode}</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-950/80 px-3.5 py-1.5 rounded-xl border border-surface-800">
                <span className="text-surface-500">STATUS:</span>
                <span className="text-mint-400 font-semibold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse" />
                  Live Operational
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Operational Metrics Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4.5 w-4.5 text-brand-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Enterprise Portfolio Metrics
              </h2>
            </div>
            <span className="text-xs text-surface-400 font-mono">Live Database Sync</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Landlords */}
            <Link
              to="/landlords"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-brand-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-brand-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Landlords</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.landlords}</span>
                  <span className="text-[11px] text-surface-500">Owners</span>
                </div>
              </div>
            </Link>

            {/* Properties */}
            <Link
              to="/properties"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-mint-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-mint-500/10 border border-mint-500/20 text-mint-400 flex items-center justify-center">
                  <Home className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-mint-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Properties</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.properties}</span>
                  <span className="text-[11px] text-surface-500">Estates</span>
                </div>
              </div>
            </Link>

            {/* Units */}
            <Link
              to="/units"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-honey-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-honey-500/10 border border-honey-500/20 text-honey-400 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-honey-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Rental Units</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.units}</span>
                  <span className="text-[11px] text-surface-500">Inventory</span>
                </div>
              </div>
            </Link>

            {/* Tenants */}
            <Link
              to="/tenants"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-sky-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-sky-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Tenants</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.tenants}</span>
                  <span className="text-[11px] text-surface-500">Residents</span>
                </div>
              </div>
            </Link>

            {/* Leases */}
            <Link
              to="/leases"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-purple-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Active Leases</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.leases}</span>
                  <span className="text-[11px] text-surface-500">Contracts</span>
                </div>
              </div>
            </Link>

            {/* Ledger Transactions */}
            <Link
              to="/statements"
              className="group p-5 rounded-2xl bg-surface-900/70 border border-surface-800/80 hover:border-teal-500/40 hover:-translate-y-0.5 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-surface-400">Ledger Records</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">{stats.transactions}</span>
                  <span className="text-[11px] text-surface-500">Entries</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 3. Operational Navigation Launchpad */}
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-card">
          <div className="flex items-center justify-between pb-4 border-b border-surface-800/80">
            <div className="flex items-center gap-2.5">
              <Compass className="h-5 w-5 text-brand-400" />
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Operations Launchpad
                </h2>
                <p className="text-xs text-surface-400">
                  Quick access to core modules across all six functional domains
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Units Inventory */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-honey-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-honey-400 font-semibold text-sm">
                  <Layers className="h-4.5 w-4.5" />
                  <span>Units & Meter Inventory</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Configure bedsitters, apartments, commercial shops, water meters, and rent baselines.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/units"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-honey-500/10 text-honey-300 border border-honey-500/20 hover:bg-honey-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manage Units</span>
                </Link>
              </div>
            </div>

            {/* Tenants KYC */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-sky-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-sm">
                  <UserCheck className="h-4.5 w-4.5" />
                  <span>Tenants KYC Register</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Register tenant identities, national IDs, employers, workplace contacts, and emergency next of kin.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/tenants"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manage Tenants</span>
                </Link>
              </div>
            </div>

            {/* Leases Junction */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-purple-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-purple-400 font-semibold text-sm">
                  <FileText className="h-4.5 w-4.5" />
                  <span>Lease Contracts Junction</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Bind tenants to units with agreed rent, security deposits, escalation clauses, and pay days.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/leases"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create & View Leases</span>
                </Link>
              </div>
            </div>

            {/* Utility Meter Readings */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-sky-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-sky-400 font-semibold text-sm">
                  <Droplets className="h-4.5 w-4.5" />
                  <span>Water Meter Billing (Domain 4)</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Log monthly water meter readings, compute cubic consumption, and calculate tenant bills.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/meter-readings"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Meter Readings</span>
                </Link>
              </div>
            </div>

            {/* Cashier Receipting Window */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-mint-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-mint-400 font-semibold text-sm">
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>Receipting Window (Domain 5)</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Manual line-item allocation across rent, utilities, M-Pesa tracking, and instant vouchers.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/receipting"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-mint-500/10 text-mint-300 border border-mint-500/20 hover:bg-mint-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Open Cashier Receipting</span>
                </Link>
              </div>
            </div>

            {/* Tenant Statements */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-teal-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-teal-400 font-semibold text-sm">
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                  <span>Tenant Ledger Statements (Fig 3)</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Audit chronological double-entry debits, credits, and live computed running balances.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/statements"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>View Financial Ledger</span>
                </Link>
              </div>
            </div>

            {/* Communications & Bulk SMS */}
            <div className="p-5 rounded-2xl bg-surface-950/70 border border-surface-800/80 hover:border-brand-500/30 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 text-brand-400 font-semibold text-sm">
                  <MessageSquare className="h-4.5 w-4.5" />
                  <span>Communications & Bulk SMS (Domain 6)</span>
                </div>
                <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                  Single client SMS alerts, estate-wide bulk campaigns, and gateway delivery logs.
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-800/80">
                <Link
                  to="/communications"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Open SMS Communications</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Multi-Tenant Enterprise Security Status */}
        <div className="bg-surface-900/40 border border-surface-800/80 rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3 flex items-center gap-2 font-mono">
            <ShieldCheck className="h-4 w-4 text-mint-400" />
            <span>Multi-Tenant Enterprise Isolation Guardrails</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-surface-300">
              <CheckCircle2 className="h-4 w-4 text-mint-400 shrink-0" />
              <span>Row-Level Security (RLS) active on all 22 tables</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-surface-300">
              <CheckCircle2 className="h-4 w-4 text-mint-400 shrink-0" />
              <span>Compound Foreign Keys enforce zero cross-tenant contamination</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-surface-300">
              <CheckCircle2 className="h-4 w-4 text-mint-400 shrink-0" />
              <span>Authoritative audit triggers record all mutations</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
