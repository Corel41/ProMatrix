import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Receipt,
  BarChart3,
  Contact,
  Settings,
  Boxes,
  UserCheck,
  Calculator,
  Database,
  ShieldCheck
} from 'lucide-react'

export default function Sidebar({ activeContext }) {
  const location = useLocation()
  const currentPath = location.pathname

  const userRole = activeContext?.role || 'company_super_admin'
  const isSuperAdmin = userRole === 'company_super_admin'
  const isAdmin = isSuperAdmin || userRole === 'branch_manager' || userRole === 'administrator'
  const isPropertyManager = isAdmin || userRole === 'property_manager'

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['all'] },
    { name: 'Properties', path: '/properties', icon: Building2, roles: ['manager'] },
    { name: 'Tenants', path: '/tenants', icon: Users, roles: ['manager'] },
    { name: 'Leases & Renewals', path: '/leases', icon: FileText, roles: ['manager'] },
    { name: 'Rent Collection', path: '/receipting', icon: CreditCard, roles: ['all'] },
    { name: 'Maintenance', path: '/meter-readings', icon: Wrench, roles: ['all'] },
    { name: 'Service Charges', path: '/statements', icon: Receipt, roles: ['all'] },
    { name: 'Staff Registry', path: '/employees', icon: UserCheck, roles: ['admin'] },
    { name: 'Payroll', path: '/payroll', icon: Calculator, roles: ['admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['all'] },
    { name: 'Contacts', path: '/landlords', icon: Contact, roles: ['all'] },
    { name: 'Data Import', path: '/data-import', icon: Database, roles: ['super_admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ]

  const navItems = allNavItems.filter((item) => {
    if (item.roles.includes('all')) return true
    if (item.roles.includes('manager') && isPropertyManager) return true
    if (item.roles.includes('admin') && isAdmin) return true
    if (item.roles.includes('super_admin') && isSuperAdmin) return true
    return false
  })

  const isActive = (itemPath) => {
    if (itemPath === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/'
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
  }

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-[#0b1329] text-slate-300 flex flex-col border-r border-slate-800/80 select-none z-30">
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-850/50">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white tracking-tight leading-none font-sans">
            ProMatrix
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-1 truncate">
            {activeContext?.branchName || 'Properties. People. Performance.'}
          </p>
        </div>
      </div>

      <div className="px-4 py-2.5 mx-3 mt-3 rounded-xl bg-surface-900/60 border border-surface-800/60 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        <span className="text-[11px] font-mono text-surface-300 truncate">
          {activeContext?.roleName || 'Super Administrator'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all font-medium ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#132042] via-[#0f1a36] to-[#0a1226] border border-blue-900/40 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="h-8 w-8 rounded-xl bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h4 className="font-bold text-sm text-white mb-1 leading-snug">
            Smarter Property Management
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Manage properties, staff & historical imports with full RLS security.
          </p>
        </div>
      </div>
    </aside>
  )
}
