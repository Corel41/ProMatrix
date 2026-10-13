import { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  Building,
  Home,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  Filter,
  ShieldCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Leases() {
  const [leases, setLeases] = useState([])
  const [propertiesList, setPropertiesList] = useState([])
  const [unitsList, setUnitsList] = useState([])
  const [tenantsList, setTenantsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const initialFormState = {
    lease_no: '',
    property_id: '',
    unit_id: '',
    tenant_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    rent_pay_day: '5',
    agreed_rent: '',
    rent_deposit_held: '',
    water_deposit_held: '0.00',
    elec_deposit_held: '0.00',
    service_charge_agreed: '0.00',
    garbage_fee_agreed: '100.00',
    escalation_rate: '5.00',
    escalation_period_months: '12',
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: propData, error: propErr } = await supabase
        .from('properties')
        .select('id, property_code, name')
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      if (propErr) throw propErr
      setPropertiesList(propData || [])

      const { data: allUnitsData, error: uErr } = await supabase
        .from('units')
        .select('id, property_id, unit_number, unit_category, base_rent_rate, rent_deposit_rate, water_deposit_rate, electricity_deposit_rate, service_charge_rate, garbage_fee_rate, status, is_occupied')
        .eq('company_id', tenant.companyId)
        .order('unit_number', { ascending: true })

      if (uErr) throw uErr
      setUnitsList(allUnitsData || [])

      const { data: tData, error: tErr } = await supabase
        .from('tenants')
        .select('id, tenant_no, full_name, phone, id_or_passport_no')
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (tErr) throw tErr
      setTenantsList(tData || [])

      const { data: leasesData, error: lErr } = await supabase
        .from('leases')
        .select(`
          *,
          properties!leases_company_property_fk (
            id,
            property_code,
            name
          ),
          units!leases_company_unit_fk (
            id,
            unit_number,
            unit_category,
            floor_level
          ),
          tenants!leases_company_tenant_fk (
            id,
            tenant_no,
            full_name,
            phone
          )
        `)
        .eq('company_id', tenant.companyId)
        .order('created_at', { ascending: false })

      if (lErr) throw lErr
      setLeases(leasesData || [])
    } catch (err) {
      console.error('Failed to load leases:', err)
      setErrorMsg(err.message || 'Error loading leases.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const availableUnitsForProperty = unitsList.filter(
    (u) => !formData.property_id || u.property_id === formData.property_id
  )

  const handlePropertyChange = (e) => {
    const selectedPropertyId = e.target.value
    setFormData((prev) => ({
      ...prev,
      property_id: selectedPropertyId,
      unit_id: '',
      agreed_rent: '',
      rent_deposit_held: '',
    }))
  }

  const handleUnitChange = (e) => {
    const selectedUnitId = e.target.value
    const selectedUnit = unitsList.find((u) => u.id === selectedUnitId)

    if (selectedUnit) {
      setFormData((prev) => ({
        ...prev,
        property_id: selectedUnit.property_id,
        unit_id: selectedUnitId,
        agreed_rent: String(selectedUnit.base_rent_rate || '0.00'),
        rent_deposit_held: String(selectedUnit.rent_deposit_rate || selectedUnit.base_rent_rate || '0.00'),
        water_deposit_held: String(selectedUnit.water_deposit_rate || '0.00'),
        elec_deposit_held: String(selectedUnit.electricity_deposit_rate || '0.00'),
        service_charge_agreed: String(selectedUnit.service_charge_rate || '0.00'),
        garbage_fee_agreed: String(selectedUnit.garbage_fee_rate || '0.00'),
      }))
    } else {
      setFormData((prev) => ({ ...prev, unit_id: selectedUnitId }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context missing. Please refresh.')
      if (!formData.property_id || !formData.unit_id || !formData.tenant_id) {
        throw new Error('Property, Unit, and Tenant selections are strictly mandatory.')
      }
      if (!formData.agreed_rent || parseFloat(formData.agreed_rent) < 0) {
        throw new Error('Valid agreed monthly rent is required.')
      }

      let leaseNumber = formData.lease_no.trim().toUpperCase()
      if (!leaseNumber) {
        const randCode = Math.floor(100 + Math.random() * 900)
        leaseNumber = `LS-${new Date().getFullYear()}-${randCode}`
      }

      const rentPayDayNum = parseInt(formData.rent_pay_day, 10)
      if (isNaN(rentPayDayNum) || rentPayDayNum < 1 || rentPayDayNum > 31) {
        throw new Error('Rent payment day must be between 1 and 31.')
      }

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        property_id: formData.property_id,
        unit_id: formData.unit_id,
        tenant_id: formData.tenant_id,
        lease_no: leaseNumber,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        rent_pay_day: rentPayDayNum,
        agreed_rent: parseFloat(formData.agreed_rent) || 0.0,
        rent_deposit_held: parseFloat(formData.rent_deposit_held) || 0.0,
        water_deposit_held: parseFloat(formData.water_deposit_held) || 0.0,
        elec_deposit_held: parseFloat(formData.elec_deposit_held) || 0.0,
        service_charge_agreed: parseFloat(formData.service_charge_agreed) || 0.0,
        garbage_fee_agreed: parseFloat(formData.garbage_fee_agreed) || 0.0,
        escalation_rate: parseFloat(formData.escalation_rate) || 0.0,
        escalation_period_months: parseInt(formData.escalation_period_months, 10) || 12,
        status: formData.status,
      }

      const { data: newLease, error: leaseErr } = await supabase
        .from('leases')
        .insert([payload])
        .select()

      if (leaseErr) throw leaseErr

      if (formData.status === 'active') {
        await supabase
          .from('units')
          .update({ is_occupied: true, status: 'occupied' })
          .eq('id', formData.unit_id)
          .eq('company_id', context.companyId)
      }

      setSuccessMsg(`Lease contract ${leaseNumber} executed successfully! Unit is now occupied.`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Failed to create lease:', err)
      setErrorMsg(err.message || 'Failed to create lease.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLeases = leases.filter((l) => {
    const matchesSearch =
      l.lease_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenants?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenants?.tenant_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.units?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 3</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Occupancy & Tenancy</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Leases</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FileText className="h-7 w-7 text-indigo-400" />
              <span>Lease Contracts & Agreements</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              The core junction binding tenants to units with rent schedules, deposits held, and escalation terms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
              title="Refresh leases"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg('')
                setSuccessMsg('')
                setShowModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Lease</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Operation Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/90 mt-0.5">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search lease no, tenant, unit, property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="terminated">Terminated</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Lease No</th>
                  <th className="py-3 px-4">Tenant / Occupant</th>
                  <th className="py-3 px-4">Property & Unit</th>
                  <th className="py-3 px-4">Agreed Rent</th>
                  <th className="py-3 px-4">Deposits Held</th>
                  <th className="py-3 px-4">Term & Start</th>
                  <th className="py-3 px-4">Pay Day</th>
                  <th className="py-3 px-4">Escalation</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Querying leases from cloud DB...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeases.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No leases found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredLeases.map((lease) => {
                    const totalDeposits =
                      (Number(lease.rent_deposit_held) || 0) +
                      (Number(lease.water_deposit_held) || 0) +
                      (Number(lease.elec_deposit_held) || 0)

                    return (
                      <tr
                        key={lease.id}
                        className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                          {lease.lease_no}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span>{lease.tenants?.full_name || '—'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {lease.tenants?.tenant_no} • {lease.tenants?.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-200 flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-500" />
                            <span>{lease.properties?.name || '—'}</span>
                          </div>
                          <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
                            Unit {lease.units?.unit_number} ({lease.units?.unit_category})
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          KES {Number(lease.agreed_rent).toLocaleString()}
                          <span className="text-[10px] text-slate-500 font-normal"> /mo</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono">
                          <div className="text-slate-200 font-medium">
                            KES {totalDeposits.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Rent: {Number(lease.rent_deposit_held).toLocaleString()} | W: {Number(lease.water_deposit_held).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono">
                          <div>{lease.start_date}</div>
                          <div className="text-[10px] text-slate-500">
                            To: {lease.end_date || 'Open Term'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          Day {lease.rent_pay_day}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          <span className="text-amber-400 font-medium">{lease.escalation_rate}%</span>
                          <span className="text-[10px] text-slate-500"> / {lease.escalation_period_months}m</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              lease.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : lease.status === 'terminated'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {lease.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950/60 px-4 py-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Showing <strong className="text-slate-200">{filteredLeases.length}</strong> of{' '}
              <strong className="text-slate-200">{leases.length}</strong> active & past leases
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Multi-tenant Isolation: {context?.branchCode}</span>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Lease Agreement</h3>
                  <p className="text-xs text-slate-400">
                    Binds tenant to unit with authoritative occupancy under {context?.branchName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[75vh]">

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  1. Tenancy Linkage (Property • Unit • Tenant)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Property <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="property_id"
                      required
                      value={formData.property_id}
                      onChange={handlePropertyChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Property --</option>
                      {propertiesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.property_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Assigned Unit <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="unit_id"
                      required
                      value={formData.unit_id}
                      onChange={handleUnitChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Unit --</option>
                      {availableUnitsForProperty.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unit_number} [{u.unit_category}] — {u.status.toUpperCase()} (Base: KES {Number(u.base_rent_rate).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Selecting Tenant / Occupant <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="tenant_id"
                      required
                      value={formData.tenant_id}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Registered Tenant --</option>
                      {tenantsList.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.tenant_no}] {t.full_name} ({t.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Lease Reference Number
                    </label>
                    <input
                      type="text"
                      name="lease_no"
                      placeholder="e.g. LS-2026-004 (Auto if blank)"
                      value={formData.lease_no}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  2. Agreed Financial Terms & Deposit Holding
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Agreed Monthly Rent (KES) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="agreed_rent"
                      required
                      placeholder="e.g. 16000.00"
                      value={formData.agreed_rent}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Rent Deposit Held (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rent_deposit_held"
                      placeholder="e.g. 16000.00"
                      value={formData.rent_deposit_held}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Water Deposit Held (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="water_deposit_held"
                      value={formData.water_deposit_held}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Electricity Deposit Held
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="elec_deposit_held"
                      value={formData.elec_deposit_held}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Service Charge (Monthly)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="service_charge_agreed"
                      value={formData.service_charge_agreed}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Garbage Fee (Monthly)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="garbage_fee_agreed"
                      value={formData.garbage_fee_agreed}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  3. Term Dates, Escalation & Due Date
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Lease Start Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Rent Pay Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      name="rent_pay_day"
                      required
                      value={formData.rent_pay_day}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Escalation Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="escalation_rate"
                      value={formData.escalation_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Escalation Period (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="escalation_period_months"
                      value={formData.escalation_period_months}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  Compound FK locks: Lease binds Tenant, Unit, and Property strictly within <strong>{context?.companyName}</strong>.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Lease...</span>
                    </>
                  ) : (
                    <span>Execute Lease Agreement</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
