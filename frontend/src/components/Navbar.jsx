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
  Droplets,
  MessageSquare
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
    { name: 'Communications', path: '/communications', icon: MessageSquare },
  ]

  return (
    <header className="border-b border-surface-800/60 bg-surface-900/80 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Main Nav */}
          <div className="flex items-center gap-6 xl:gap-8 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft shadow-brand-500/20 group-hover:scale-105 transition-all duration-200">
                <Building2 className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-sans">
                  ProMatrix
                </span>
                <span className="text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-semibold font-mono hidden sm:inline-block">
                  Enterprise
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              {navLinks.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-surface-800 text-white shadow-card border border-surface-700/60 font-semibold'
                        : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/50'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 transition-colors ${isActive ? 'text-brand-400' : 'text-surface-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action Bar: Branch Indicator, User Profile & Logout */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Active Tenant Context Pill */}
            {activeContext ? (
              <div className="hidden md:flex items-center gap-2 text-xs bg-surface-950/70 py-1.5 px-3 rounded-xl border border-surface-800/80">
                <div className="h-2 w-2 rounded-full bg-mint-400 animate-pulse" />
                <span className="font-medium text-surface-200 truncate max-w-[140px] text-xs">
                  {activeContext.companyName}
                </span>
                <span className="text-surface-600 font-light">•</span>
                <span className="text-surface-400 font-mono text-[11px] truncate max-w-[100px]">
                  {activeContext.branchName}
                </span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-mint-400 bg-mint-950/30 py-1 px-2.5 rounded-xl border border-mint-500/20 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>RLS Active</span>
              </div>
            )}

            {/* User Profile Details */}
            <div className="flex items-center gap-2 pl-2 border-l border-surface-800">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-surface-800 to-surface-700 border border-surface-700/80 flex items-center justify-center text-surface-200 font-semibold text-xs shadow-card">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-surface-200 leading-tight truncate max-w-[130px]">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-surface-500 leading-tight font-mono">
                  Super Admin
                </p>
              </div>
            </div>

            {/* Sign Out Action Button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-medium bg-surface-850 hover:bg-coral-950/30 hover:text-coral-400 hover:border-coral-500/30 border border-surface-700/60 text-surface-300 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{signingOut ? 'Exiting...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Medium Screen / Tablet Navigation Bar */}
        <div className="flex xl:hidden items-center gap-1.5 py-2.5 border-t border-surface-800/60 overflow-x-auto scrollbar-none">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-surface-800 text-white font-medium border border-surface-700'
                    : 'text-surface-400 hover:text-surface-200'
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
