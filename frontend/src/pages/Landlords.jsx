import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Landlords() {
  const [landlords, setLandlords] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const initialFormState = {
    landlord_no: '',
    surname: '',
    other_names: '',
    id_or_registration_no: '',
    tax_pin: '',
    phone: '',
    email: '',
    remittance_mode: 'eft',
    bank_name: '',
    bank_branch: '',
    bank_account_no: '',
    bank_account_name: '',
    mpesa_phone: '',
    postal_address: '',
    postal_code: '',
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
        .from('landlords')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('landlord_no', { ascending: true })

      if (error) throw error
      setLandlords(data || [])
    } catch (err) {
      console.error('Error fetching landlords:', err)
      setErrorMsg(err.message || 'Failed to load landlords.')
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
      if (!context) {
        throw new Error('Tenant context not resolved. Please reload.')
      }

      if (!formData.surname.trim() || !formData.landlord_no.trim() || !formData.phone.trim()) {
        throw new Error('Landlord No, Surname, and Phone are strictly required.')
      }

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        landlord_no: formData.landlord_no.trim().toUpperCase(),
        surname: formData.surname.trim(),
        other_names: formData.other_names.trim(),
        id_or_registration_no: formData.id_or_registration_no.trim() || null,
        tax_pin: formData.tax_pin.trim().toUpperCase() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        remittance_mode: formData.remittance_mode,
        bank_name: formData.bank_name.trim() || null,
        bank_branch: formData.bank_branch.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        bank_account_name: formData.bank_account_name.trim() || null,
        mpesa_phone: formData.mpesa_phone.trim() || null,
        postal_address: formData.postal_address.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        next_of_kin_name: formData.next_of_kin_name.trim() || null,
        next_of_kin_phone: formData.next_of_kin_phone.trim() || null,
        next_of_kin_relation: formData.next_of_kin_relation.trim() || null,
        status: formData.status,
      }

      const { data, error } = await supabase
        .from('landlords')
        .insert([payload])
        .select()

      if (error) throw error

      setSuccessMsg(`Landlord ${formData.landlord_no} successfully registered!`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Registration failed:', err)
      setErrorMsg(err.message || 'Failed to register landlord.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLandlords = landlords.filter((l) => {
    const matchesSearch =
      l.landlord_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.other_names?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tax_pin?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col selection:bg-brand-500/20 selection:text-brand-300">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-1.5">
              <span>Domain 1</span>
              <ChevronRight className="h-3 w-3 text-surface-600" />
              <span>Core Registration</span>
              <ChevronRight className="h-3 w-3 text-surface-600" />
              <span className="text-surface-300 font-medium">Landlords Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 font-sans">
              <Users className="h-7 w-7 text-brand-400" />
              <span>Beneficial Owners & Landlords</span>
            </h1>
            <p className="mt-1 text-sm text-surface-400">
              Manage landlord profiles, banking details, remittance preferences, and tax credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-900 hover:bg-surface-850 text-surface-300 border border-surface-800 transition-all cursor-pointer shadow-card"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft shadow-brand-600/25 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Register Landlord</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-coral-950/30 border border-coral-500/30 text-coral-300 text-xs flex items-start gap-3 shadow-card">
            <AlertCircle className="h-4 w-4 text-coral-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-coral-200">Operation Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-coral-400 hover:text-coral-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-mint-950/30 border border-mint-500/30 text-mint-300 text-xs flex items-start gap-3 shadow-card">
            <CheckCircle2 className="h-4 w-4 text-mint-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-mint-200">Success</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-mint-400 hover:text-mint-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface-900/60 p-4 rounded-2xl border border-surface-800/80 shadow-card">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search by code, surname, phone, KRA PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-9 pr-3 py-2 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-surface-400">
              <Filter className="h-3.5 w-3.5 text-surface-500" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-950 border border-surface-800 text-xs text-surface-300 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-800/80 bg-surface-950/70 text-surface-400 font-medium uppercase tracking-wider font-mono text-[11px]">
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Landlord / Owner Name</th>
                  <th className="py-3.5 px-4">ID / Reg No</th>
                  <th className="py-3.5 px-4">KRA PIN</th>
                  <th className="py-3.5 px-4">Phone & Email</th>
                  <th className="py-3.5 px-4">Bank & Account</th>
                  <th className="py-3.5 px-4">Remittance</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-surface-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono">Querying landlords from cloud DB...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLandlords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-surface-500">
                      No landlords found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredLandlords.map((landlord) => (
                    <tr
                      key={landlord.id}
                      className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/50 transition-colors text-surface-300"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-300 whitespace-nowrap">
                        {landlord.landlord_no}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-surface-100">
                          {landlord.surname}
                        </div>
                        <div className="text-[11px] text-surface-400">
                          {landlord.other_names}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-surface-400 whitespace-nowrap">
                        {landlord.id_or_registration_no || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-surface-300 whitespace-nowrap">
                        {landlord.tax_pin || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-surface-300 font-mono">
                          <Phone className="h-3 w-3 text-surface-500" />
                          <span>{landlord.phone}</span>
                        </div>
                        {landlord.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-surface-400 mt-0.5">
                            <Mail className="h-3 w-3 text-surface-500" />
                            <span>{landlord.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-surface-200">
                          {landlord.bank_name || 'No Bank Set'}
                        </div>
                        <div className="text-[11px] text-surface-400 font-mono">
                          {landlord.bank_account_no
                            ? `A/C: ${landlord.bank_account_no}`
                            : landlord.mpesa_phone
                            ? `M-Pesa: ${landlord.mpesa_phone}`
                            : '—'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono bg-surface-800 text-brand-300 border border-surface-700">
                          {landlord.remittance_mode || 'EFT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono ${
                            landlord.status === 'active'
                              ? 'bg-mint-950/40 text-mint-400 border border-mint-500/20'
                              : 'bg-honey-950/40 text-honey-400 border border-honey-500/20'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                          <span>{landlord.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-950/70 px-5 py-3.5 border-t border-surface-800/80 text-xs text-surface-400 flex items-center justify-between">
            <span>
              Showing <strong className="text-surface-200">{filteredLandlords.length}</strong> of{' '}
              <strong className="text-surface-200">{landlords.length}</strong> total registered owners
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-surface-500">
              <ShieldCheck className="h-3.5 w-3.5 text-mint-400" />
              <span>Multi-tenant Isolation: {context?.branchCode}</span>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-elevated flex flex-col">
            <div className="px-6 py-4.5 border-b border-surface-800 flex items-center justify-between bg-surface-900/90">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-card">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">Register Beneficial Landlord</h3>
                  <p className="text-xs text-surface-400">
                    Creates an authoritative record in {context?.branchName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-surface-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[75vh]">

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                  1. Identification & Names
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Landlord No <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="landlord_no"
                      required
                      placeholder="e.g. L029"
                      value={formData.landlord_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Surname / Company <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="surname"
                      required
                      placeholder="e.g. Wanjiru"
                      value={formData.surname}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Other Names <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="other_names"
                      required
                      placeholder="e.g. Grace Njoki"
                      value={formData.other_names}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      National ID / Reg No
                    </label>
                    <input
                      type="text"
                      name="id_or_registration_no"
                      placeholder="e.g. 23910284"
                      value={formData.id_or_registration_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      KRA Tax PIN
                    </label>
                    <input
                      type="text"
                      name="tax_pin"
                      placeholder="e.g. A001928374B"
                      value={formData.tax_pin}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                  2. Contact & Communications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Primary Phone <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="e.g. +254712345678"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. landlord@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                  3. Remittance & Settlement Setup
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Remittance Mode
                    </label>
                    <select
                      name="remittance_mode"
                      value={formData.remittance_mode}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all font-medium"
                    >
                      <option value="eft">EFT (Electronic Funds Transfer)</option>
                      <option value="rtgs">RTGS (Real Time Gross Settlement)</option>
                      <option value="mpesa">M-Pesa B2C Paybill</option>
                      <option value="cheque">Physical Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      placeholder="e.g. Equity Bank, KCB Bank"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Bank Branch
                    </label>
                    <input
                      type="text"
                      name="bank_branch"
                      placeholder="e.g. Thika Supreme"
                      value={formData.bank_branch}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="bank_account_no"
                      placeholder="e.g. 0110293847"
                      value={formData.bank_account_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="bank_account_name"
                      placeholder="e.g. Grace Wanjiru Njoki"
                      value={formData.bank_account_name}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      M-Pesa Disbursal Phone
                    </label>
                    <input
                      type="text"
                      name="mpesa_phone"
                      placeholder="e.g. +254712345678"
                      value={formData.mpesa_phone}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Account Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/20 text-xs text-brand-300 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-brand-400 shrink-0" />
                <span>
                  This landlord will be bound to <strong>{context?.companyName}</strong> (Branch: <strong>{context?.branchCode}</strong>).
                </span>
              </div>

              <div className="pt-3 border-t border-surface-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft shadow-brand-600/25 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Landlord...</span>
                    </>
                  ) : (
                    <span>Confirm & Register</span>
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
