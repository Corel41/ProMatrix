import { useState, useEffect } from 'react'
import {
  UserCheck,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  Filter,
  Briefcase,
  User,
  HeartHandshake,
  Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const initialFormState = {
    tenant_no: '',
    first_name: '',
    last_name: '',
    id_or_passport_no: '',
    phone: '',
    email: '',
    postal_address: '',
    postal_code: '',
    workplace: '',
    work_contact: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relation: '',
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('date_registered', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (err) {
      console.error('Failed to load tenants:', err)
      setErrorMsg(err.message || 'Error loading tenants.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('First Name and Last Name are required.')
      }
      if (!formData.id_or_passport_no.trim() || !formData.phone.trim()) {
        throw new Error('National ID/Passport and Primary Phone are required.')
      }

      // Compute full name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`
      
      // Auto-generate tenant_no if empty
      let tenantNumber = formData.tenant_no.trim().toUpperCase()
      if (!tenantNumber) {
        tenantNumber = `T${Math.floor(10000 + Math.random() * 90000)}`
      }

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        tenant_no: tenantNumber,
        full_name: fullName,
        id_or_passport_no: formData.id_or_passport_no.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        postal_address: formData.postal_address.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        workplace: formData.workplace.trim() || null,
        work_contact: formData.work_contact.trim() || null,
        next_of_kin_name: formData.next_of_kin_name.trim() || null,
        next_of_kin_phone: formData.next_of_kin_phone.trim() || null,
        next_of_kin_relation: formData.next_of_kin_relation.trim() || null,
        status: formData.status,
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert([payload])
        .select()

      if (error) throw error

      setSuccessMsg(`Tenant "${fullName}" (${tenantNumber}) registered successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Failed to register tenant:', err)
      setErrorMsg(err.message || 'Failed to register tenant.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.tenant_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id_or_passport_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.workplace?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 3</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Occupancy & Tenancy</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Tenants</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <UserCheck className="h-7 w-7 text-indigo-400" />
              <span>Tenants & Occupants Registry</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage resident profiles, KYC identification, employer details, and emergency contacts.
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
              <span>Register Tenant</span>
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
              placeholder="Search tenant no, name, ID, phone, workplace..."
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
              <option value="exited">Exited</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>

        {/* Tenants Data Grid */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">National ID / Passport</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Workplace / Employer</th>
                  <th className="py-3 px-4">Next of Kin</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Querying tenants from cloud DB...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      No tenants found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-slate-800/40 transition-colors group text-slate-300"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {tenant.tenant_no}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span>{tenant.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {tenant.id_or_passport_no}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{tenant.phone}</span>
                        </div>
                        {tenant.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span>{tenant.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tenant.workplace ? (
                          <div>
                            <div className="text-slate-200 font-medium flex items-center gap-1">
                              <Briefcase className="h-3 w-3 text-slate-500" />
                              <span>{tenant.workplace}</span>
                            </div>
                            {tenant.work_contact && (
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Tel: {tenant.work_contact}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tenant.next_of_kin_name ? (
                          <div>
                            <div className="text-slate-200 font-medium">
                              {tenant.next_of_kin_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {tenant.next_of_kin_relation && `${tenant.next_of_kin_relation} • `}
                              {tenant.next_of_kin_phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {tenant.date_registered || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            tenant.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tenant.status === 'blacklisted'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {tenant.status}
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
              Showing <strong className="text-slate-200">{filteredTenants.length}</strong> of{' '}
              <strong className="text-slate-200">{tenants.length}</strong> tenants
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Multi-tenant Isolation: {context?.branchCode}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Register Tenant Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Register Tenant / Occupant</h3>
                  <p className="text-xs text-slate-400">
                    Creates an authoritative tenant KYC profile under {context?.branchName}
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
              {/* Section 1: Names and Identification */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  1. Identification & Names
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tenant No (Auto/Manual)
                    </label>
                    <input
                      type="text"
                      name="tenant_no"
                      placeholder="e.g. T00366 (Leave blank for auto)"
                      value={formData.tenant_no}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      First Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      placeholder="e.g. Brian"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Last / Other Names <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      placeholder="e.g. Kiprono Cheruiyot"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      National ID / Passport <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="id_or_passport_no"
                      required
                      placeholder="e.g. 31829471"
                      value={formData.id_or_passport_no}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Primary Phone <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="e.g. +254712345678"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. tenant@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Employment / Workplace */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  2. Employment & Workplace Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Employer / Business Name
                    </label>
                    <input
                      type="text"
                      name="workplace"
                      placeholder="e.g. Bidco Africa Ltd, Safaricom PLC"
                      value={formData.workplace}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Workplace Phone / Contact
                    </label>
                    <input
                      type="text"
                      name="work_contact"
                      placeholder="e.g. +254700111222"
                      value={formData.work_contact}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Next of Kin & Emergency */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono mb-3">
                  3. Next of Kin & Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Next of Kin Full Name
                    </label>
                    <input
                      type="text"
                      name="next_of_kin_name"
                      placeholder="e.g. Mercy Wanjiku"
                      value={formData.next_of_kin_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Next of Kin Phone
                    </label>
                    <input
                      type="text"
                      name="next_of_kin_phone"
                      placeholder="e.g. +254722555666"
                      value={formData.next_of_kin_phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="next_of_kin_relation"
                      placeholder="e.g. Spouse, Sister, Father"
                      value={formData.next_of_kin_relation}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Postal Address
                    </label>
                    <input
                      type="text"
                      name="postal_address"
                      placeholder="e.g. P.O. Box 450"
                      value={formData.postal_address}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Postal Code / Town
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      placeholder="e.g. 01000 Thika"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                      <option value="exited">Exited</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-Tenant Audit Notice */}
              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  Tenant record will be isolated to <strong>{context?.companyName}</strong> (Branch: <strong>{context?.branchCode}</strong>).
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
                      <span>Saving Tenant...</span>
                    </>
                  ) : (
                    <span>Register Tenant</span>
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
