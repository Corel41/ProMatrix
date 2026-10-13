import { useState, useEffect } from 'react'
import {
  Layers,
  Plus,
  Search,
  Building,
  Home,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  Filter,
  ShieldCheck,
  Zap,
  Droplets,
  DollarSign
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

const CATEGORY_LABELS = {
  BD: 'Bedsitter (BD)',
  '1B': '1 Bedroom (1B)',
  '2B': '2 Bedroom (2B)',
  '3B': '3 Bedroom (3B)',
  '4B': '4 Bedroom (4B)',
  SH: 'Shop (SH)',
  ST: 'Stall (ST)',
  OFF: 'Office (OFF)',
  DS: 'Downstairs / Store (DS)',
  WH: 'Warehouse (WH)',
}

export default function Units() {
  const [units, setUnits] = useState([])
  const [propertiesList, setPropertiesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const initialFormState = {
    property_id: '',
    unit_number: '',
    unit_category: '1B',
    unit_type: 'residential',
    floor_level: 'Ground Floor',
    base_rent_rate: '',
    rent_deposit_rate: '',
    water_deposit_rate: '2500.00',
    electricity_deposit_rate: '0.00',
    service_charge_rate: '0.00',
    garbage_fee_rate: '100.00',
    water_meter_no: '',
    electricity_meter_no: '',
    bedrooms: '1',
    bathrooms: '1',
    square_footage: '',
    particulars: '',
    status: 'vacant',
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

      const { data: unitsData, error: unitsErr } = await supabase
        .from('units')
        .select(`
          *,
          properties!units_company_property_fk (
            id,
            property_code,
            name,
            city
          )
        `)
        .eq('company_id', tenant.companyId)
        .order('unit_number', { ascending: true })

      if (unitsErr) throw unitsErr
      setUnits(unitsData || [])
    } catch (err) {
      console.error('Failed to load units data:', err)
      setErrorMsg(err.message || 'Error loading units.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }

      if (name === 'base_rent_rate' && (!prev.rent_deposit_rate || prev.rent_deposit_rate === prev.base_rent_rate)) {
        updated.rent_deposit_rate = value
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context not loaded. Please refresh.')
      if (!formData.property_id) throw new Error('Please select a target property.')
      if (!formData.unit_number.trim()) throw new Error('Unit number is required.')

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        property_id: formData.property_id,
        unit_number: formData.unit_number.trim().toUpperCase(),
        unit_category: formData.unit_category,
        unit_type: formData.unit_type,
        floor_level: formData.floor_level.trim() || 'Ground Floor',
        base_rent_rate: parseFloat(formData.base_rent_rate) || 0.0,
        rent_deposit_rate: parseFloat(formData.rent_deposit_rate) || 0.0,
        water_deposit_rate: parseFloat(formData.water_deposit_rate) || 0.0,
        electricity_deposit_rate: parseFloat(formData.electricity_deposit_rate) || 0.0,
        service_charge_rate: parseFloat(formData.service_charge_rate) || 0.0,
        garbage_fee_rate: parseFloat(formData.garbage_fee_rate) || 0.0,
        water_meter_no: formData.water_meter_no.trim() || null,
        electricity_meter_no: formData.electricity_meter_no.trim() || null,
        bedrooms: formData.bedrooms ? parseFloat(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
        particulars: formData.particulars.trim() || null,
        is_occupied: formData.status === 'occupied',
        status: formData.status,
      }

      const { data, error } = await supabase
        .from('units')
        .insert([payload])
        .select()

      if (error) throw error

      setSuccessMsg(`Unit "${formData.unit_number.toUpperCase()}" registered successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Failed to register unit:', err)
      setErrorMsg(err.message || 'Failed to save unit.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.properties?.property_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.water_meter_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.electricity_meter_no?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProperty = propertyFilter === 'all' || u.property_id === propertyFilter
    const matchesCategory = categoryFilter === 'all' || u.unit_category === categoryFilter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter

    return matchesSearch && matchesProperty && matchesCategory && matchesStatus
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
              <span className="text-slate-300">Units & Spaces</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Layers className="h-7 w-7 text-indigo-400" />
              <span>Rental Units & Inventory</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage residential apartments, commercial stores, utility meter numbers, and rent rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
              title="Refresh inventory"
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
              <span>Add Unit</span>
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

        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search unit no, property, meter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Properties</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.property_code})
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="under_maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Unit No</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Floor Level</th>
                  <th className="py-3 px-4">Base Rent Rate</th>
                  <th className="py-3 px-4">Water Meter</th>
                  <th className="py-3 px-4">Power Meter</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Querying units from cloud database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      No units found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => (
                    <tr
                      key={unit.id}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {unit.unit_number}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-500" />
                          <span>{unit.properties?.name || '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {unit.properties?.property_code}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                          {unit.unit_category}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-400">
                          {CATEGORY_LABELS[unit.unit_category]?.split(' ')[0] || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {unit.floor_level || 'Ground Floor'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-400 whitespace-nowrap">
                        KES {Number(unit.base_rent_rate).toLocaleString()}
                        <span className="text-[10px] text-slate-500 font-normal"> /mo</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {unit.water_meter_no ? (
                          <div className="flex items-center gap-1 text-sky-400">
                            <Droplets className="h-3 w-3" />
                            <span>{unit.water_meter_no}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {unit.electricity_meter_no ? (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Zap className="h-3 w-3" />
                            <span>{unit.electricity_meter_no}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            unit.status === 'occupied'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : unit.status === 'vacant'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950/60 px-4 py-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Showing <strong className="text-slate-200">{filteredUnits.length}</strong> of{' '}
              <strong className="text-slate-200">{units.length}</strong> units
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
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Rental Unit</h3>
                  <p className="text-xs text-slate-400">
                    Registers a space under {context?.branchName}
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
                  1. Property & Unit Identification
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
                      onChange={handleInputChange}
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
                      Unit Number / Label <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="unit_number"
                      required
                      placeholder="e.g. A1, B12, SHOP-01"
                      value={formData.unit_number}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="unit_category"
                      value={formData.unit_category}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Unit Type
                    </label>
                    <select
                      name="unit_type"
                      value={formData.unit_type}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Floor Level
                    </label>
                    <input
                      type="text"
                      name="floor_level"
                      placeholder="e.g. Ground Floor, 1st Floor"
                      value={formData.floor_level}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  2. Pricing & Deposit Rates (KES)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Base Rent Rate (Monthly) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="base_rent_rate"
                      required
                      placeholder="e.g. 15000.00"
                      value={formData.base_rent_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Rent Deposit Required
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rent_deposit_rate"
                      placeholder="e.g. 15000.00"
                      value={formData.rent_deposit_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Water Deposit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="water_deposit_rate"
                      value={formData.water_deposit_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Power Deposit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="electricity_deposit_rate"
                      value={formData.electricity_deposit_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Service Charge
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="service_charge_rate"
                      value={formData.service_charge_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Garbage Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="garbage_fee_rate"
                      value={formData.garbage_fee_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  3. Utility Meters & Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Water Meter No
                    </label>
                    <input
                      type="text"
                      name="water_meter_no"
                      placeholder="e.g. WM-HZ-016"
                      value={formData.water_meter_no}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Electricity Meter No
                    </label>
                    <input
                      type="text"
                      name="electricity_meter_no"
                      placeholder="e.g. KPLC-890230"
                      value={formData.electricity_meter_no}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Unit Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="under_maintenance">Under Maintenance</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  Compound constraint verified: Unit bound to <strong>{context?.companyName}</strong> (Branch: <strong>{context?.branchCode}</strong>).
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
                      <span>Saving Unit...</span>
                    </>
                  ) : (
                    <span>Register Unit</span>
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
