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
  FileSpreadsheet
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
        const [lRes, pRes, uRes] = await Promise.all([
          supabase.from('landlords').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
          supabase.from('units').select('*', { count: 'exact', head: true }).eq('company_id', tenant.companyId),
        ])

        setStats({
          landlords: lRes.count || 0,
          properties: pRes.count || 0,
          units: uRes.count || 0,
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
              <span>Phase 2 Database Live • Thika Dataset Seeded</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-indigo-400">{user?.email}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Your session is active in <strong>{context?.companyName}</strong> (Branch:{' '}
              <span className="font-mono text-indigo-400">{context?.branchName}</span>).
              Multi-tenant Row-Level Security (RLS) is strictly isolating operational data.
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

        {/* Live Operational Metrics from Thika Dataset */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Domain 1: Core Registration Metrics</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live Cloud DB Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Landlords Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <Link
                  to="/landlords"
                  className="text-slate-500 group-hover:text-indigo-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 font-medium">Beneficial Landlords</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono text-white">{stats.landlords}</span>
                  <span className="text-xs text-emerald-400 font-mono">Registered</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Includes Hazina Investment, Muthende, Wachira, Mbuguah, Njoroge
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  to="/landlords"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Manage Landlords</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Properties Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md group">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Home className="h-5 w-5" />
                </div>
                <Link
                  to="/properties"
                  className="text-slate-500 group-hover:text-emerald-400 transition-colors p-1"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 font-medium">Properties & Estates</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono text-white">{stats.properties}</span>
                  <span className="text-xs text-emerald-400 font-mono">Active</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hazina Flats, Fariji House, Immanuel Apartments, Plot 65, etc.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  to="/properties"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Manage Properties</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Units Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono py-0.5 px-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Ready for Domain 2
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 font-medium">Units & Spaces</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono text-white">{stats.units}</span>
                  <span className="text-xs text-amber-400 font-mono">Seeded</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Units across Hazina Flats (HZ01-HZ10) & Immanuel (IM01-IM10)
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Leasing & Tenants next</span>
                <Compass className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations & Navigation Launchpad */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>Operational Navigation Launchpad</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <Users className="h-4 w-4" />
                  <span>Landlords Register & Banking Setup</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  View and register property owners, KRA tax PINs, electronic funds transfer (EFT)
                  routing numbers, and M-Pesa paybill accounts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/landlords"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Landlords Register</span>
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Home className="h-4 w-4" />
                  <span>Property Portfolio & LR Registry</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Manage building codes, LR titles, commission percentage arrangements, monthly
                  remittance schedules, and on-site caretaking contacts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  to="/properties"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Properties Portfolio</span>
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
                Row-Level Security (RLS) active on all 22 Phase 2 tables
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Compound Foreign Keys enforce strict company/branch isolation
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Authoritative Audit Trail trigger active on all operational mutations
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">
                Authenticated session bound to {context?.companyName}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
