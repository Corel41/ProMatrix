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
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import DataImport from './pages/DataImport'
import PlaceholderModule from './pages/PlaceholderModule'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

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
      <div className="h-screen w-full bg-[#182234] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold font-mono text-slate-200 uppercase tracking-widest">
            Loading Propwings Enterprise...
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={session ? <Navigate to="/dashboard" replace /> : <Auth />}
        />

        <Route element={session ? <Layout session={session} /> : <Navigate to="/auth" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/properties" element={<Properties />} />
          <Route path="/units" element={<Units />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/landlords" element={<Landlords />} />
          <Route path="/payables-setup" element={<Settings />} />

          <Route path="/receipting" element={<Receipting />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/statements" element={<TenantStatements />} />
          <Route path="/tenant-statements" element={<TenantStatements />} />
          <Route path="/rent-roll" element={<Reports />} />

          <Route path="/landlord-deductions" element={<Reports />} />
          <Route path="/landlord-statements" element={<Reports />} />
          <Route path="/reports" element={<Reports />} />

          <Route path="/employees" element={<Employees />} />
          <Route path="/leave-management" element={<Employees />} />
          <Route path="/payroll" element={<Payroll />} />

          <Route path="/settings" element={<Settings />} />
          <Route path="/administration" element={<Settings />} />
          <Route path="/audit-trail" element={<Settings />} />

          <Route path="/bulk-sms" element={<PlaceholderModule moduleName="6. Bulk SMS & Reminders" description="Scheduled payment due reminders and tenant broadcast SMS dispatch" />} />
          <Route path="/bulk-sms/logs" element={<PlaceholderModule moduleName="6. Bulk SMS Delivery Logs" description="Audit log of dispatched Safaricom and Airtel SMS messages" />} />

          <Route path="/suppliers" element={<PlaceholderModule moduleName="7. Supplier & Vendor Management" description="Property service contractors, suppliers, and purchase orders" />} />
          <Route path="/suppliers/invoices" element={<PlaceholderModule moduleName="7. Supplier Invoices" description="Contractor expense vouchers and service invoices" />} />

          <Route path="/debt-collection" element={<PlaceholderModule moduleName="8. Debt Collection Subsystem" description="Defaulting tenant tracking, auctioneer warrants, and demand notices" />} />
          <Route path="/debt-collection/notices" element={<PlaceholderModule moduleName="8. Debt Collection Notices" description="Eviction notices and statutory demand registers" />} />

          <Route path="/valuation" element={<PlaceholderModule moduleName="9. Property Valuation" description="Mortgage valuation, asset appraisal, and site inspection schedules" />} />
          <Route path="/valuation/reports" element={<PlaceholderModule moduleName="9. Valuation Reports" description="Appraisal certs and land registry title searches" />} />

          <Route path="/property-sales" element={<PlaceholderModule moduleName="10. Property Sales & Agency" description="Commercial and residential property listings, buyer escrow ledger" />} />
          <Route path="/property-sales/escrow" element={<PlaceholderModule moduleName="10. Sales Escrow Accounts" description="Client trust deposits and conveyance progress registers" />} />

          <Route path="/finance" element={<PlaceholderModule moduleName="11. Finance & Cash Office" description="Cash vouchers, petty cash management, and disbursements" />} />
          <Route path="/finance/reconciliation" element={<PlaceholderModule moduleName="11. Bank Reconciliation" description="M-Pesa paybill and bank statement automated reconciliation" />} />

          <Route path="/meter-readings" element={<MeterReadings />} />
          <Route path="/maintenance" element={<MeterReadings />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/data-import" element={<DataImport />} />
        </Route>

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
