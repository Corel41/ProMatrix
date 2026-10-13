import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Phone,
  Mail,
  Briefcase,
  FileBadge
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const initialFormState = {
    employee_no: '',
    first_name: '',
    last_name: '',
    id_number: '',
    kra_pin: '',
    nssf_no: '',
    nhif_no: '',
    phone: '',
    email: '',
    job_title: 'Property Caretaker',
    basic_salary: '',
    hire_date: new Date().toISOString().split('T')[0],
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
        .from('employees')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('employee_no', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
      setErrorMsg(err.message || 'Failed to load employee records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) {
        throw new Error('Tenant context missing. Please refresh the page.')
      }

      if (!formData.employee_no.trim() || !formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim()) {
        throw new Error('Employee No, First Name, Last Name, and Phone are mandatory.')
      }

      const basicSalaryNum = parseFloat(formData.basic_salary) || 0

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        employee_no: formData.employee_no.trim().toUpperCase(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        id_number: formData.id_number.trim() || null,
        kra_pin: formData.kra_pin.trim().toUpperCase() || null,
        nssf_no: formData.nssf_no.trim().toUpperCase() || null,
        nhif_no: formData.nhif_no.trim().toUpperCase() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        job_title: formData.job_title.trim() || 'Property Caretaker',
        basic_salary: basicSalaryNum,
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        status: formData.status,
      }

      const { error } = await supabase
        .from('employees')
        .insert([payload])

      if (error) throw error

      setSuccessMsg(`Employee ${formData.first_name} ${formData.last_name} (${formData.employee_no}) registered successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
      await loadData()
    } catch (err) {
      console.error('Employee registration error:', err)
      setErrorMsg(err.message || 'Failed to save employee.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.kra_pin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalBasicSalary = employees.reduce((sum, e) => sum + parseFloat(e.basic_salary || 0), 0)

  return (
    <div className="w-full px-8 py-6 space-y-6 bg-surface-950 text-surface-100 min-h-full">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-1">
            <span>Domain 7</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span>HR & Staffing</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span className="text-surface-300">Staff Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-brand-400" />
            <span>Staff & Employee Registry</span>
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Authoritative registry of caretakers, estate supervisors, and payroll beneficiaries with statutory KYC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-surface-900/80 hover:bg-surface-850 text-surface-300 border border-surface-800 shadow-soft transition-all cursor-pointer"
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
            <span>Register Employee</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Total Headcount</span>
            <UserCheck className="h-4 w-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-sans">{employees.length}</p>
          <p className="text-[11px] text-surface-500 mt-1">Registered staff on payroll</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Active Staff</span>
            <CheckCircle2 className="h-4 w-4 text-mint-400" />
          </div>
          <p className="text-2xl font-bold text-mint-400 mt-1 font-sans">
            {employees.filter((e) => e.status === 'active').length}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">Eligible for monthly payroll run</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Total Base Remuneration</span>
            <DollarSign className="h-4 w-4 text-honey-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            KSh {totalBasicSalary.toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">Gross base commitment / month</p>
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
            placeholder="Search by code, name, job title, KRA PIN, phone..."
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
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-800/80 bg-surface-950/70 text-surface-400 font-medium uppercase tracking-wider font-mono text-[11px]">
                <th className="py-3.5 px-4">Emp No</th>
                <th className="py-3.5 px-4">Full Name & Title</th>
                <th className="py-3.5 px-4">ID & KRA PIN</th>
                <th className="py-3.5 px-4">Statutory (NSSF / NHIF)</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Basic Salary</th>
                <th className="py-3.5 px-4">Hire Date</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-850/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-mono">Loading staff records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-surface-500">
                    No employee records found matching your query.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/50 transition-colors text-surface-300"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-300 whitespace-nowrap">
                      {emp.employee_no}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-surface-100 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-brand-400" />
                        <span>{emp.first_name} {emp.last_name}</span>
                      </div>
                      <div className="text-[11px] text-surface-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 text-surface-500" />
                        <span>{emp.job_title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <div className="text-surface-200">ID: {emp.id_number || '—'}</div>
                      <div className="text-[11px] text-surface-400">PIN: {emp.kra_pin || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                      <div className="text-surface-300">NSSF: {emp.nssf_no || '—'}</div>
                      <div className="text-surface-400">NHIF: {emp.nhif_no || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-surface-300 font-mono text-xs">
                        <Phone className="h-3 w-3 text-surface-500" />
                        <span>{emp.phone}</span>
                      </div>
                      {emp.email && (
                        <div className="flex items-center gap-1 text-[11px] text-surface-400 mt-0.5">
                          <Mail className="h-3 w-3 text-surface-500" />
                          <span className="truncate max-w-[150px]">{emp.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-mint-400 whitespace-nowrap">
                      KES {parseFloat(emp.basic_salary || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-surface-400 whitespace-nowrap">
                      {emp.hire_date || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono ${
                          emp.status === 'active'
                            ? 'bg-mint-950/40 text-mint-400 border border-mint-500/20'
                            : 'bg-honey-950/40 text-honey-400 border border-honey-500/20'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                        <span>{emp.status}</span>
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
            Showing <strong className="text-surface-200">{filteredEmployees.length}</strong> of{' '}
            <strong className="text-surface-200">{employees.length}</strong> registered staff
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] text-surface-500">
            <ShieldCheck className="h-3.5 w-3.5 text-mint-400" />
            <span>Multi-tenant Isolation: {context?.branchCode}</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-elevated flex flex-col">
            <div className="px-6 py-4.5 border-b border-surface-800 flex items-center justify-between bg-surface-900/90">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-card">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">Register Staff Member</h3>
                  <p className="text-xs text-surface-400">
                    Creates authoritative payroll beneficiary in {context?.branchName}
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
                  1. Identity & Employment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Employee No <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="employee_no"
                      required
                      placeholder="e.g. EMP-004"
                      value={formData.employee_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      First Name <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      placeholder="e.g. Kelvin"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Last Name <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      placeholder="e.g. Kamau"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      National ID / Passport
                    </label>
                    <input
                      type="text"
                      name="id_number"
                      placeholder="e.g. 29384721"
                      value={formData.id_number}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                  2. Statutory Identifiers (Kenya)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      KRA Tax PIN
                    </label>
                    <input
                      type="text"
                      name="kra_pin"
                      placeholder="e.g. A019283746Z"
                      value={formData.kra_pin}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      NSSF Number
                    </label>
                    <input
                      type="text"
                      name="nssf_no"
                      placeholder="e.g. NSSF-829102"
                      value={formData.nssf_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      NHIF Number
                    </label>
                    <input
                      type="text"
                      name="nhif_no"
                      placeholder="e.g. NHIF-918273"
                      value={formData.nhif_no}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                  3. Contact, Role & Compensation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Mobile Phone <span className="text-coral-400">*</span>
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
                      placeholder="e.g. employee@promatrix.co.ke"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Job Designation
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      placeholder="e.g. Property Caretaker"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Basic Salary (KES) <span className="text-coral-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="basic_salary"
                      required
                      placeholder="e.g. 45000"
                      value={formData.basic_salary}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Employment Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/20 text-xs text-brand-300 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-brand-400 shrink-0" />
                <span>
                  Compound constraint verified: Employee pinned to <strong>{context?.companyName}</strong> (Branch: <strong>{context?.branchCode}</strong>).
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
                      <span>Saving Employee...</span>
                    </>
                  ) : (
                    <span>Register Employee</span>
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
