import { useState, useEffect } from 'react'
import {
  Home,
  Plus,
  Search,
  Building,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  MapPin
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Properties() {
  const [properties, setProperties] = useState([])
  const [landlordsList, setLandlordsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const initialFormState = {
    property_code: '',
    name: '',
    landlord_id: '',
    lr_number: '',
    property_type: 'residential',
    location_description: '',
    city: 'Thika',
    postal_address: '',
    commission_rate: '10.00',
    commission_type: 'percentage',
    commission_basis: 'collected',
    is_vatable: true,
    remittance_day: '10',
    caretaker_name: '',
    caretaker_phone: '',
    parking_spaces: '0',
    parking_fee: '0.00',
    total_floors: '1',
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      // Fetch landlords list for dropdown
      const { data: landlordsData, error: lError } = await supabase
        .from('landlords')
        .select('id, landlord_no, surname, other_names')
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('surname', { ascending: true })

      if (lError) throw lError
      setLandlordsList(landlordsData || [])

      // Fetch properties with landlord relation
      const { data: propData, error: pError } = await supabase
        .from('properties')
        .select(`
          *,
          landlords!properties_company_landlord_fk (
            id,
            landlord_no,
            surname,
            other_names
          )
        `)
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      if (pError) throw pError
      setProperties(propData || [])
    } catch (err) {
      console.error('Error fetching property data:', err)
      setErrorMsg(err.message || 'Failed to load properties.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) {
        throw new Error('Tenant context missing. Please refresh.')
      }

      if (!formData.name.trim() || !formData.property_code.trim() || !formData.landlord_id) {
        throw new Error('Property Code, Name, and Landlord Selection are mandatory.')
      }

      const remittanceDayNum = parseInt(formData.remittance_day, 10)
      if (isNaN(remittanceDayNum) || remittanceDayNum < 1 || remittanceDayNum > 31) {
        throw new Error('Remittance day must be between 1 and 31.')
      }

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        landlord_id: formData.landlord_id,
        property_code: formData.property_code.trim().toUpperCase(),
        name: formData.name.trim(),
        lr_number: formData.lr_number.trim() || null,
        property_type: formData.property_type,
        location_description: formData.location_description.trim() || null,
        city: formData.city.trim() || 'Thika',
        postal_address: formData.postal_address.trim() || null,
        commission_rate: parseFloat(formData.commission_rate) || 10.0,
        commission_type: formData.commission_type,
        commission_basis: formData.commission_basis,
        is_vatable: !!formData.is_vatable,
        remittance_day: remittanceDayNum,
        caretaker_name: formData.caretaker_name.trim() || null,
        caretaker_phone: formData.caretaker_phone.trim() || null,
        parking_spaces: parseInt(formData.parking_spaces, 10) || 0,
        parking_fee: parseFloat(formData.parking_fee) || 0.0,
        total_floors: parseInt(formData.total_floors, 10) || 1,
        status: formData.status,
      }

      const { data, error } = await supabase
        .from('properties')
        .insert([payload])
        .select()

      if (error) throw error

      setSuccessMsg(`Property "${formData.name}" (${formData.property_code}) created successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Property registration error:', err)
      setErrorMsg(err.message || 'Failed to save property.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.property_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lr_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.landlords?.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.caretaker_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'all' || p.property_type === typeFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 1</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Core Registration</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Properties</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Home className="h-7 w-7 text-indigo-400" />
              <span>Properties & Estates</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage residential and commercial properties, LR titles, commission structures, and caretaking contacts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
              title="Refresh list"
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
              <span>Register Property</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
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

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search property code, name, LR, landlord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Type:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="industrial">Industrial</option>
              <option value="land">Land</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Properties Data Grid */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Property Name</th>
                  <th className="py-3 px-4">Beneficial Landlord</th>
                  <th className="py-3 px-4">LR Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Remittance</th>
                  <th className="py-3 px-4">Caretaker</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Querying properties from cloud DB...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No properties found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property) => (
                    <tr
                      key={property.id}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {property.property_code}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-500" />
                          <span>{property.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-600" />
                          <span>{property.location_description || property.city || 'Thika'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">
                          {property.landlords?.surname || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {property.landlords?.landlord_no}
                          {property.landlords?.other_names && ` • ${property.landlords.other_names}`}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {property.lr_number || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {property.property_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="font-semibold text-emerald-400">
                          {property.commission_rate}%
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">
                          {property.commission_basis}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                        <span>Day {property.remittance_day}</span>
                        <div className="text-[10px] text-slate-500">Monthly</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {property.caretaker_name || '—'}
                        </div>
                        {property.caretaker_phone && (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-500" />
                            <span>{property.caretaker_phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            property.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {property.status}
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
              Showing <strong className="text-slate-200">{filteredProperties.length}</strong> of{' '}
              <strong className="text-slate-200">{properties.length}</strong> properties
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Multi-tenant Isolation: {context?.branchCode}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Home className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Real Estate Property</h3>
                  <p className="text-xs text-slate-400">
                    Enforces compound multi-tenant isolation under {context?.branchName}
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
              {/* Section 1: Core Property Details */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  1. Property Identity & Ownership
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Property Code <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="property_code"
                      required
                      placeholder="e.g. SKYLINE-COURT"
                      value={formData.property_code}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Property Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Skyline Court Apartments"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Beneficial Landlord <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="landlord_id"
                      required
                      value={formData.landlord_id}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Landlord --</option>
                      {landlordsList.map((l) => (
                        <option key={l.id} value={l.id}>
                          [{l.landlord_no}] {l.surname} {l.other_names}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      LR Title Number
                    </label>
                    <input
                      type="text"
                      name="lr_number"
                      placeholder="e.g. LR NO 4953/12"
                      value={formData.lr_number}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Property Type
                    </label>
                    <select
                      name="property_type"
                      value={formData.property_type}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="mixed_use">Mixed Use</option>
                      <option value="industrial">Industrial</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      City / Municipality
                    </label>
                    <input
                      type="text"
                      name="city"
                      placeholder="e.g. Thika"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Location / Landmark
                    </label>
                    <input
                      type="text"
                      name="location_description"
                      placeholder="e.g. Ngoingwa, near Flyover"
                      value={formData.location_description}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Financial Terms & Commission */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  2. Commission & Remittance Rules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Commission Rate (%) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="commission_rate"
                      required
                      placeholder="e.g. 10.00"
                      value={formData.commission_rate}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Commission Basis
                    </label>
                    <select
                      name="commission_basis"
                      value={formData.commission_basis}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="collected">Collected (Cash Basis)</option>
                      <option value="invoiced">Invoiced (Accrual Basis)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Remittance Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      name="remittance_day"
                      required
                      placeholder="e.g. 10"
                      value={formData.remittance_day}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_vatable"
                    name="is_vatable"
                    checked={formData.is_vatable}
                    onChange={handleInputChange}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 h-4 w-4"
                  />
                  <label htmlFor="is_vatable" className="text-xs text-slate-300 cursor-pointer">
                    Subject to VAT (16% statutory tax applied on management commissions)
                  </label>
                </div>
              </div>

              {/* Section 3: Operations & Caretaker */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  3. Caretaker, Floors & Parking
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Caretaker Full Name
                    </label>
                    <input
                      type="text"
                      name="caretaker_name"
                      placeholder="e.g. Samuel Ndung'u"
                      value={formData.caretaker_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Caretaker Mobile Phone
                    </label>
                    <input
                      type="text"
                      name="caretaker_phone"
                      placeholder="e.g. +254722123456"
                      value={formData.caretaker_phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Parking Slots
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="parking_spaces"
                      value={formData.parking_spaces}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Monthly Parking Fee (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="parking_fee"
                      value={formData.parking_fee}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-Tenant Audit Notice */}
              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  Compound constraint verified: Property will be pinned to <strong>{context?.companyName}</strong> and branch <strong>{context?.branchCode}</strong>.
                </span>
              </div>

              {/* Submit Buttons */}
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
                      <span>Saving Property...</span>
                    </>
                  ) : (
                    <span>Register Property</span>
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
