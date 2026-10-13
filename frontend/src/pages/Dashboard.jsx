import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  LogOut,
  ShieldCheck,
  User,
  Users,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Database
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          navigate('/auth')
          return
        }
        setUser(user)
      } catch (err) {
        console.error('Failed to get user session:', err)
        navigate('/auth')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [navigate])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/auth')
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Authenticating ProMatrix session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight font-mono text-white">
                ProMatrix
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs py-0.5 px-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 py-1.5 px-3 rounded-lg border border-slate-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>RLS Isolation: Active</span>
            </div>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-none">
                  {user?.user_metadata?.full_name || 'System User'}
                </p>
                <p className="text-[11px] text-slate-500 leading-none mt-1 truncate max-w-[150px]">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/50 border border-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Operational Session Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-indigo-400">{user?.email}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Your session is connected to the ProMatrix platform foundation. The multi-company,
              multi-branch security layer is active, strictly isolating data by company and branch
              memberships.
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">USER ID:</span>
                <span className="text-slate-300 truncate max-w-[220px]">{user?.id}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">AUTH PROVIDER:</span>
                <span className="text-slate-300">{user?.app_metadata?.provider || 'email'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-md border border-slate-800">
                <span className="text-slate-500">DATABASE:</span>
                <span className="text-emerald-400">Cloud Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Slice Status & Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Companies & Branches</h3>
            <p className="mt-1 text-xs text-slate-400">
              Organisational hierarchy with strict boundary separation and scoped memberships.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-indigo-400 font-medium">
              <span>Public schema synced</span>
              <Database className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Role & Access Control</h3>
            <p className="mt-1 text-xs text-slate-400">
              Default deny policies preventing cross-company access and privilege elevation.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-emerald-400 font-medium">
              <span>RLS Policies Enforced</span>
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Authoritative Audit Trail</h3>
            <p className="mt-1 text-xs text-slate-400">
              Immutable logging on `audit_events`. Deletion and mutation strictly blocked.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-amber-400 font-medium">
              <span>INSERT-Only Protected</span>
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Phase 1 Verification Checklist */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>Phase 1 Vertical Slice Verification</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">Supabase Auth integrated with `user_profiles`</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">Compound FK constraint & database schema live in cloud</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">JWT session handling & auto-token refresh active</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs">Protected routing configured with automatic redirects</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
