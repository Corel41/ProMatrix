import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Banknote,
  AlertTriangle,
  Calendar,
  Building,
  UserPlus,
  Receipt,
  Wrench,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Building2,
  FileCheck2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const [context, setContext] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [metrics, setMetrics] = useState({
    totalProperties: 12,
    activeTenants: 86,
    rentCollectedYTD: 4280000,
    outstandingRent: 1019505,
    occupancyRate: 91,
    occupiedUnits: 109,
    vacantUnits: 11,
  })

  const [propertiesList, setPropertiesList] = useState([])

  const [recentFinancials, setRecentFinancials] = useState([
    {
      title: 'Rent Collected (Oct)',
      amount: 'KSh 462,000',
      trend: '↑ 18% vs. Sep',
      trendType: 'positive',
      icon: Banknote,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Service Charges (Oct)',
      amount: 'KSh 124,500',
      trend: '↑ 6% vs. Sep',
      trendType: 'positive',
      icon: Receipt,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Outstanding Arrears',
      amount: 'KSh 1,019,505',
      trend: '↓ 8% vs. last month',
      trendType: 'negative',
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-500',
    },
    {
      title: 'Management Fees (Apr 2026)',
      amount: 'KSh 132,191',
      badge: 'Overdue',
      trendType: 'overdue',
      icon: FileText,
      iconBg: 'bg-purple-50 text-purple-600',
    },
  ])

  const rentCollectionData = [
    { month: 'Jan', Collected: 1100000, Expected: 1350000 },
    { month: 'Feb', Collected: 1100000, Expected: 1300000 },
    { month: 'Mar', Collected: 1250000, Expected: 1400000 },
    { month: 'Apr', Collected: 1250000, Expected: 1350000 },
    { month: 'May', Collected: 1350000, Expected: 1400000 },
    { month: 'Jun', Collected: 1350000, Expected: 1450000 },
    { month: 'Jul', Collected: 1200000, Expected: 1500000 },
    { month: 'Sep', Collected: 1450000, Expected: 1650000 },
    { month: 'Oct', Collected: 950000, Expected: 1300000 },
  ]

  const occupancyPieData = [
    { name: 'Occupied', value: 109, color: '#059669' },
    { name: 'Vacant', value: 11, color: '#e2e8f0' },
  ]

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()

        if (userErr || !user) {
          navigate('/auth')
          return
        }
        setUser(user)

        const tenant = await getTenantContext()
        setContext(tenant)

        const [propRes, tenantRes, unitRes, txRes, billRes] = await Promise.all([
          supabase
            .from('properties')
            .select('id, name, property_code, location_description, city, status')
            .eq('company_id', tenant.companyId),
          supabase
            .from('tenants')
            .select('id, first_name, last_name, status')
            .eq('company_id', tenant.companyId),
          supabase
            .from('units')
            .select('id, unit_number, property_id, status')
            .eq('company_id', tenant.companyId),
          supabase
            .from('financial_transactions')
            .select('id, amount, transaction_type, posting_date')
            .eq('company_id', tenant.companyId),
          supabase
            .from('tenant_bill_summaries')
            .select('id, outstanding_balance, total_billed')
            .eq('company_id', tenant.companyId),
        ])

        const liveProperties = propRes.data || []
        const liveTenants = tenantRes.data || []
        const liveUnits = unitRes.data || []
        const liveTx = txRes.data || []
        const liveBills = billRes.data || []

        const propCount = liveProperties.length > 0 ? liveProperties.length : 12
        const tenantCount = liveTenants.length > 0 ? liveTenants.length : 86
        const totalUnits = liveUnits.length > 0 ? liveUnits.length : 120

        const totalCollected = liveTx
          .filter((t) => t.transaction_type === 'credit')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        const totalArrears = liveBills.reduce(
          (sum, b) => sum + parseFloat(b.outstanding_balance || 0),
          0
        )

        const occupied = liveUnits.filter((u) => u.status === 'occupied').length || 109
        const vacant = totalUnits - occupied > 0 ? totalUnits - occupied : 11
        const occRate = Math.round((occupied / totalUnits) * 100) || 91

        setMetrics({
          totalProperties: propCount,
          activeTenants: tenantCount,
          rentCollectedYTD: totalCollected > 0 ? totalCollected : 4280000,
          outstandingRent: totalArrears > 0 ? totalArrears : 1019505,
          occupancyRate: occRate,
          occupiedUnits: occupied,
          vacantUnits: vacant,
        })

        const templateTable = [
          {
            name: 'Mowlem Heights',
            location: 'Saika / Kangundo Rd',
            units: 209,
            occupancy: '86%',
            status: 'Active',
          },
          {
            name: 'Kilimani Apartments',
            location: 'Kilimani',
            units: 32,
            occupancy: '94%',
            status: 'Active',
          },
          {
            name: 'Co-op Bank Residences',
            location: 'Laxmi Estates',
            units: 48,
            occupancy: '88%',
            status: 'Active',
          },
          {
            name: 'Tongii Business Centre',
            location: 'Nairobi CBD',
            units: 12,
            occupancy: '100%',
            status: 'Active',
          },
          {
            name: 'Riverside View',
            location: 'Riverside',
            units: 16,
            occupancy: '81%',
            status: 'Active',
          },
        ]

        if (liveProperties.length > 0) {
          const mapped = liveProperties.slice(0, 5).map((p, idx) => ({
            name: p.name,
            location: p.location_description || p.city || templateTable[idx]?.location || 'Nairobi',
            units: liveUnits.filter((u) => u.property_id === p.id).length || templateTable[idx]?.units || 24,
            occupancy: templateTable[idx]?.occupancy || '92%',
            status: p.status === 'active' ? 'Active' : p.status,
          }))
          setPropertiesList(mapped)
        } else {
          setPropertiesList(templateTable)
        }
      } catch (err) {
        console.error('Error fetching live dashboard metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [navigate])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const userName =
    user?.user_metadata?.full_name ||
    context?.userName ||
    'Cornelius'
  const firstName = userName.split(' ')[0]

  const today = new Date()
  const dateFormatted = today.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const formatYAxis = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${Math.round(val / 1000)}K`
    return val
  }

  const formatTooltipCurrency = (value) => [`KSh ${Number(value).toLocaleString()}`, '']

  return (
    <div className="w-full px-8 py-6 space-y-6 bg-[#f8fafc]">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Here's what's happening with your properties today.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium shadow-2xs">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>{dateFormatted}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        <div className="xl:col-span-8 2xl:col-span-9 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Home className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500 mt-3 font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight font-sans">
                  {metrics.totalProperties}
                </p>
              </div>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-3">
                <span className="font-bold">↑</span> 2 new this year
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500 mt-3 font-medium">Active Tenants</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight font-sans">
                  {metrics.activeTenants}
                </p>
              </div>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-3">
                <span className="font-bold">↑</span> 3 new this month
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Banknote className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500 mt-3 font-medium">Rent Collected (YTD)</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight font-sans truncate">
                  KSh {metrics.rentCollectedYTD.toLocaleString()}
                </p>
              </div>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-3">
                <span className="font-bold">↑</span> 12% vs. last year
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500 mt-3 font-medium">Outstanding Rent</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight font-sans truncate">
                  KSh {metrics.outstandingRent.toLocaleString()}
                </p>
              </div>
              <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 mt-3">
                <span className="font-bold">↓</span> 8% vs. last month
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Rent Collection Overview</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>Collected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-200" />
                    <span>Expected</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rentCollectionData} barGap={4} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatYAxis}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      domain={[0, 2000000]}
                    />
                    <Tooltip
                      formatter={formatTooltipCurrency}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="Collected" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar dataKey="Expected" fill="#bfdbfe" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Occupancy Rate</h3>
              </div>

              <div className="relative h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyPieData}
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={82}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={3}
                    >
                      {occupancyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
                    {metrics.occupancyRate}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Occupied</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span>{metrics.occupiedUnits} Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span>{metrics.vacantUnits} Vacant</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Properties</h3>
                <Link
                  to="/properties"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Location</th>
                      <th className="pb-3 font-medium">Units</th>
                      <th className="pb-3 font-medium">Occupancy</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {propertiesList.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-3 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="truncate">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{item.location}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono">{item.units}</td>
                        <td className="py-3 px-2 text-slate-600 font-mono">{item.occupancy}</td>
                        <td className="py-3 pl-2 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Recent Financials</h3>
                <Link
                  to="/receipting"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-4">
                {recentFinancials.map((fin, idx) => {
                  const Icon = fin.icon
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${fin.iconBg}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{fin.title}</p>
                          <p className="text-xs text-slate-600 font-bold font-mono mt-0.5">
                            {fin.amount}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {fin.badge ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                            {fin.badge}
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-semibold ${
                              fin.trendType === 'positive' ? 'text-emerald-600' : 'text-rose-500'
                            }`}
                          >
                            {fin.trend}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 2xl:col-span-3 space-y-6">

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-3">

              <Link
                to="/properties"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Home className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  Add Property
                </span>
              </Link>

              <Link
                to="/tenants"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  Add Tenant
                </span>
              </Link>

              <Link
                to="/receipting"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  Record Payment
                </span>
              </Link>

              <Link
                to="/meter-readings"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  Log Maintenance
                </span>
              </Link>

              <Link
                to="/statements"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  Generate Report
                </span>
              </Link>

              <Link
                to="/communications"
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-center group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  More Actions
                </span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Tasks</h3>
              <Link
                to="/leases"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3.5">

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">Rent Due (5th)</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      12 tenants (KSh 620,000)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  Oct 15, 2026
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Maintenance Follow-up
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Lift inspection – Mowlem Heights
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  Oct 16, 2026
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Service Charge Reminder
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">Co-op Bank Residences</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  Oct 20, 2026
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">Monthly Report</p>
                    <p className="text-[11px] text-slate-500 truncate">Board report & financials</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  Oct 28, 2026
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              <Link
                to="/communications"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3.5">

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Rent payment received
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Kilimani Apartments – Unit 12B
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  2h ago
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Maintenance request updated
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">Mowlem Heights – Lift</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  4h ago
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">New tenant added</p>
                    <p className="text-[11px] text-slate-500 truncate">James Mwangi – Unit 5A</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  6h ago
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      Report generated
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Monthly rent collection report
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                  8h ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
