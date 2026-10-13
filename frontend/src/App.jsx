import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Landlords from './pages/Landlords'
import Properties from './pages/Properties'
import Units from './pages/Units'
import Tenants from './pages/Tenants'
import Leases from './pages/Leases'
import Receipting from './pages/Receipting'
import TenantStatements from './pages/TenantStatements'
import MeterReadings from './pages/MeterReadings'
import Communications from './pages/Communications'
import Employees from './pages/Employees'
import Payroll from './pages/Payroll'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0b1329] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium font-mono text-slate-300">Loading ProMatrix Enterprise...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route
          path="/auth"
          element={session ? <Navigate to="/dashboard" replace /> : <Auth />}
        />

        {/* Protected App Routes wrapped in Full-Bleed Layout */}
        <Route element={session ? <Layout session={session} /> : <Navigate to="/auth" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/landlords" element={<Landlords />} />
          <Route path="/units" element={<Units />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/receipting" element={<Receipting />} />
          <Route path="/meter-readings" element={<MeterReadings />} />
          <Route path="/statements" element={<TenantStatements />} />
          <Route path="/communications" element={<Communications />} />

          {/* Domain 7: HR & Payroll Routes */}
          <Route path="/employees" element={<Employees />} />
          <Route path="/payroll" element={<Payroll />} />

          {/* Nav aliases to ensure all sidebar items resolve cleanly */}
          <Route path="/maintenance" element={<MeterReadings />} />
          <Route path="/service-charges" element={<TenantStatements />} />
          <Route path="/reports" element={<TenantStatements />} />
          <Route path="/contacts" element={<Landlords />} />
          <Route path="/settings" element={<Dashboard />} />
        </Route>

        {/* Redirect Root and Catch-all */}
        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="*"
          element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
