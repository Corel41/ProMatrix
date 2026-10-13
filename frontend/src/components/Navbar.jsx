import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Home,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Building,
  UserCheck,
  Layers,
  FileText,
  MapPin,
  Receipt,
  FileSpreadsheet,
  Droplets
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Navbar({ activeContext }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/auth')
    } catch (err) {
      console.error('Sign out failed:', err)
    } finally {
      setSigningOut(false)
    }
  }

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Landlords', path: '/landlords', icon: Users },
    { name: 'Properties', path: '/properties', icon: Home },
    { name: 'Units', path: '/units', icon: Layers },
    { name: 'Tenants', path: '/tenants', icon: UserCheck },
    { name: 'Leases', path: '/leases', icon: FileText },
    { name: 'Water Meters', path: '/meter-readings', icon: Droplets },
    { name: 'Receipting', path: '/receipting', icon: Receipt },
    { name: 'Statements', path: '/statements', icon: FileSpreadsheet },
  ]

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link to="/dashboard" className="flex items-center gap-3 group shrink-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight font-mono text-white">
                    ProMatrix
                  </span>
                  <span className="text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold font-mono hidden sm:inline-block">
                    Phase 2 Live
                  </span>
                </div>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action Bar / Context / User Profile */}
          <div className="flex items-center gap-3">
            {/* Multi-Tenant Context Indicator */}
            {activeContext ? (
              <div className="hidden xl:flex items-center gap-2 text-xs bg-slate-950/80 py-1.5 px-3 rounded-lg border border-slate-800">
                <Building className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-medium text-slate-200 truncate max-w-[150px]">{activeContext.companyName}</span>
                <span className="text-slate-600">•</span>
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span className="text-slate-400 font-mono text-[11px]">{activeContext.branchName}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 py-1 px-2.5 rounded-lg border border-emerald-500/20 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>RLS Context Enforced</span>
              </div>
            )}

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                {user?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-slate-200 leading-tight">
                  {user?.user_metadata?.full_name || 'System User'}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/50 border border-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{signingOut ? 'Exiting...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation bar */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'text-indigo-400' : 'text-slate-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
