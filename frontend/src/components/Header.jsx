import { useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Header({ activeContext, session }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const fullName =
    session?.user?.user_metadata?.full_name ||
    activeContext?.userName ||
    'Cornelius Kibet'
  const userRole = 'Property Manager'
  const email = session?.user?.email || 'cornelius.kibet@promatrix.co.ke'

  return (
    <header className="w-full h-16 border-b border-slate-200 bg-white flex-shrink-0 px-8 flex items-center justify-between z-20">
      {/* Global Search Input */}
      <div className="relative w-80 md:w-96">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search properties, tenants, invoices..."
          className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
        />
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with Badge */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
            3
          </span>
        </button>

        {/* User Dynamic Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-3 pl-2 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {/* Avatar thumbnail */}
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center text-xs font-semibold ring-2 ring-slate-100 shrink-0">
              <span className="font-mono">
                {fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            </div>

            {/* User Name & Role */}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {fullName}
              </p>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">
                {userRole}
              </p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{email}</p>
                {activeContext && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <ShieldCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">{activeContext.branchName} ({activeContext.branchCode})</span>
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
