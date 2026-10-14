import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Users,
  Building,
  CreditCard,
  UserCheck,
  Shield,
  MessageSquare,
  Truck,
  AlertTriangle,
  Scale,
  BadgeDollarSign,
  Landmark
} from 'lucide-react'

export default function Sidebar({ activeContext }) {
  const location = useLocation()
  const currentPath = location.pathname

  const [openSections, setOpenSections] = useState({
    registration: true,
    tenantsAccount: true,
    landlordsAccount: true,
    hrPayroll: true,
    administration: true,
    bulkSms: false,
    suppliers: false,
    debtCollection: false,
    valuation: false,
    sales: false,
    finance: false
  })

  const toggleSection = (sec) => {
    setOpenSections((prev) => ({
      ...prev,
      [sec]: !prev[sec]
    }))
  }

  const isLinkActive = (path) => {
    if (path === '/dashboard') return currentPath === '/dashboard' || currentPath === '/'
    return currentPath === path
  }

  const modules = [
    {
      id: 'registration',
      title: '1. REGISTRATION MODULE',
      icon: Folder,
      links: [
        { label: 'Properties', path: '/properties' },
        { label: 'Units', path: '/units' },
        { label: 'Tenants', path: '/tenants' },
        { label: 'Landlords', path: '/landlords' },
        { label: 'Payables Setup', path: '/payables-setup' }
      ]
    },
    {
      id: 'tenantsAccount',
      title: '2. TENANTS ACCOUNT',
      icon: Users,
      links: [
        { label: 'Receipting', path: '/receipting' },
        { label: 'Leases', path: '/leases' },
        { label: 'Tenant Statements', path: '/statements' },
        { label: 'Rent Roll', path: '/rent-roll' }
      ]
    },
    {
      id: 'landlordsAccount',
      title: '3. LANDLORDS ACCOUNT',
      icon: Building,
      links: [
        { label: 'Deductions', path: '/landlord-deductions' },
        { label: 'Landlord Statements', path: '/reports' }
      ]
    },
    {
      id: 'hrPayroll',
      title: '4. HR & PAYROLL',
      icon: UserCheck,
      links: [
        { label: 'Staff Registry', path: '/employees' },
        { label: 'Leave Management', path: '/leave-management' },
        { label: 'Payroll Processing', path: '/payroll' }
      ]
    },
    {
      id: 'administration',
      title: '5. ADMINISTRATION',
      icon: Shield,
      links: [
        { label: 'System Users', path: '/settings?tab=users' },
        { label: 'User Rights Matrix', path: '/settings' },
        { label: 'Audit Trail', path: '/audit-trail' }
      ]
    },
    {
      id: 'bulkSms',
      title: '6. BULK SMS',
      icon: MessageSquare,
      links: [
        { label: 'Send SMS & Reminders', path: '/bulk-sms' },
        { label: 'SMS Delivery Logs', path: '/bulk-sms/logs' }
      ]
    },
    {
      id: 'suppliers',
      title: '7. SUPPLIER MANAGEMENT',
      icon: Truck,
      links: [
        { label: 'Vendors & Contractors', path: '/suppliers' },
        { label: 'Purchase Invoices', path: '/suppliers/invoices' }
      ]
    },
    {
      id: 'debtCollection',
      title: '8. DEBT COLLECTION',
      icon: AlertTriangle,
      links: [
        { label: 'Defaulting Accounts', path: '/debt-collection' },
        { label: 'Auctioneers & Notice Logs', path: '/debt-collection/notices' }
      ]
    },
    {
      id: 'valuation',
      title: '9. VALUATION',
      icon: Scale,
      links: [
        { label: 'Property Valuations', path: '/valuation' },
        { label: 'Valuation Inspection Reports', path: '/valuation/reports' }
      ]
    },
    {
      id: 'sales',
      title: '10. PROPERTY SALES',
      icon: BadgeDollarSign,
      links: [
        { label: 'Sales Listings', path: '/property-sales' },
        { label: 'Buyer Escrow Accounts', path: '/property-sales/escrow' }
      ]
    },
    {
      id: 'finance',
      title: '11. FINANCE & CASH OFFICE',
      icon: Landmark,
      links: [
        { label: 'Cash Office Vouchers', path: '/finance' },
        { label: 'Bank Reconciliation', path: '/finance/reconciliation' }
      ]
    }
  ]

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-[#182234] text-slate-200 flex flex-col border-r border-[#243248] select-none z-30 font-sans text-xs">
      <div className="p-3 bg-[#111927] border-b border-[#243248] flex items-center justify-between">
        <div>
          <div className="font-bold text-white text-sm tracking-wide uppercase">
            Propwings Enterprise
          </div>
          <div className="text-[10px] text-teal-400 font-mono mt-0.5">
            {activeContext?.branchName || 'Nairobi Central Agency'}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto divide-y divide-[#243248]/60">
        <div className="p-1.5">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold ${
              isLinkActive('/dashboard')
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-[#243248] hover:text-white'
            }`}
          >
            <span>Dashboard Overview</span>
          </Link>
        </div>

        {modules.map((mod) => {
          const isOpen = openSections[mod.id]
          const hasActiveLink = mod.links.some((l) => isLinkActive(l.path))

          return (
            <div key={mod.id} className="py-0.5">
              <button
                type="button"
                onClick={() => toggleSection(mod.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left font-bold text-[11px] uppercase tracking-tight transition-colors cursor-pointer ${
                  hasActiveLink ? 'text-teal-300 bg-[#1e2c42]' : 'text-slate-300 hover:bg-[#1e2c42] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <mod.icon className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                  <span className="truncate">{mod.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
              </button>

              {isOpen && (
                <div className="bg-[#121a28] py-0.5 pl-3 border-l-2 border-teal-500/40 ml-2">
                  {mod.links.map((link) => {
                    const active = isLinkActive(link.path)
                    return (
                      <Link
                        key={link.label}
                        to={link.path}
                        className={`block px-2.5 py-1 text-xs transition-colors ${
                          active
                            ? 'bg-teal-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-teal-700/40 hover:text-white'
                        }`}
                      >
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-2 bg-[#111927] border-t border-[#243248] text-[10px] text-slate-400 flex items-center justify-between">
        <span className="font-mono">User: {activeContext?.roleName || 'Administrator'}</span>
        <span className="text-teal-400">Online</span>
      </div>
    </aside>
  )
}
