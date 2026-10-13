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
  Boxes
} from 'lucide-react'

export default function Sidebar({ activeContext }) {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Properties',
      path: '/properties',
      icon: Building2,
    },
    {
      name: 'Tenants',
      path: '/tenants',
      icon: Users,
    },
    {
      name: 'Leases & Renewals',
      path: '/leases',
      icon: FileText,
    },
    {
      name: 'Rent Collection',
      path: '/receipting',
      icon: CreditCard,
    },
    {
      name: 'Maintenance',
      path: '/meter-readings',
      icon: Wrench,
    },
    {
      name: 'Service Charges',
      path: '/statements',
      icon: Receipt,
    },
    {
      name: 'Reports',
      path: '/statements',
      icon: BarChart3,
    },
    {
      name: 'Contacts',
      path: '/landlords',
      icon: Contact,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ]

  const isActive = (itemPath) => {
    if (itemPath === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/'
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
  }

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-[#0b1329] text-slate-300 flex flex-col border-r border-slate-800/80 select-none z-30">
      {/* Brand Header */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-850/50">
        {/* Isometric 3D Cube Icon */}
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white tracking-tight leading-none font-sans">
            ProMatrix
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-1 truncate">
            Properties. People. Performance.
          </p>
        </div>
      </div>

      {/* Navigation Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

      {/* Smarter Property Management Promo Block */}
      <div className="p-3 mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#132042] via-[#0f1a36] to-[#0a1226] border border-blue-900/40 text-white relative overflow-hidden shadow-xl">
          {/* Subtle wave gradient background */}
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="h-8 w-8 rounded-xl bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h4 className="font-bold text-sm text-white mb-1 leading-snug">
            Smarter Property Management
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Manage your properties, tenants and finances — all in one place.
          </p>
        </div>
      </div>
    </aside>
  )
}
