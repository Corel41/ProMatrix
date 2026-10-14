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
  Landmark,
  Eye,
  HeartHandshake,
  Calendar,
  Building
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedStaffDossier, setSelectedStaffDossier] = useState(null)
  const [activeFormTab, setActiveFormTab] = useState('identity')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const initialFormState = {
    employee_no: '',
    title: 'Mr.',
    first_name: '',
    middle_name: '',
    last_name: '',
    id_number: '',
    gender: 'Male',
    marital_status: 'Single',
    date_of_birth: '',
    department: 'Operations',
    employment_type: 'Permanent',
    job_title: 'Property Caretaker',
    kra_pin: '',
    nssf_no: '',
    nhif_no: '',
    phone: '',
    email: '',
    basic_salary: '',
    bank_name: '',
    bank_branch: '',
    bank_account_no: '',
    bank_code: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relation: '',
    annual_leave_days: 21,
    sick_leave_days: 30,
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
      const annualLeaveNum = parseInt(formData.annual_leave_days, 10) || 21
      const sickLeaveNum = parseInt(formData.sick_leave_days, 10) || 30

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        employee_no: formData.employee_no.trim().toUpperCase(),
        title: formData.title || 'Mr.',
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        id_number: formData.id_number.trim() || null,
        gender: formData.gender || 'Male',
        marital_status: formData.marital_status || 'Single',
        date_of_birth: formData.date_of_birth || null,
        department: formData.department || 'Operations',
        employment_type: formData.employment_type || 'Permanent',
        job_title: formData.job_title.trim() || 'Property Caretaker',
        kra_pin: formData.kra_pin.trim().toUpperCase() || null,
        nssf_no: formData.nssf_no.trim().toUpperCase() || null,
        nhif_no: formData.nhif_no.trim().toUpperCase() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        basic_salary: basicSalaryNum,
        bank_name: formData.bank_name.trim() || null,
        bank_branch: formData.bank_branch.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        bank_code: formData.bank_code.trim() || null,
        next_of_kin: formData.next_of_kin_name.trim() || null,
        next_of_kin_name: formData.next_of_kin_name.trim() || null,
        next_of_kin_phone: formData.next_of_kin_phone.trim() || null,
        relationship: formData.next_of_kin_relation.trim() || null,
        next_of_kin_relation: formData.next_of_kin_relation.trim() || null,
        allocated_leave_days: annualLeaveNum,
        annual_leave_days: annualLeaveNum,
        sick_leave_days: sickLeaveNum,
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        status: formData.status,
      }

      const { error } = await supabase
        .from('employees')
        .insert([payload])

      if (error) throw error

      setSuccessMsg(`Staff member ${formData.first_name} ${formData.last_name} (${formData.employee_no}) registered successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
      setActiveFormTab('identity')
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
      emp.middle_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.kra_pin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter
    return matchesSearch && matchesStatus && matchesDept
  })

  const totalBasicSalary = employees.reduce((sum, e) => sum + parseFloat(e.basic_salary || 0), 0)

  return (
    <div className="w-full px-8 py-6 space-y-6 bg-surface-950 text-surface-100 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-1">
            <span>Domain 7</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span>Human Capital & Staffing</span>
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
              setActiveFormTab('identity')
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
          <p className="text-[11px] text-surface-500 mt-1">Registered staff on branch payroll</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Active Staff</span>
            <CheckCircle2 className="h-4 w-4 text-mint-400" />
          </div>
          <p className="text-2xl font-bold text-mint-400 mt-1 font-sans">
            {employees.filter((e) => e.status === 'active').length}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">Eligible for monthly remuneration run</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Total Base Remuneration</span>
            <DollarSign className="h-4 w-4 text-honey-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            KES {totalBasicSalary.toLocaleString()}
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
            placeholder="Search by code, name, department, KRA PIN, bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-9 pr-3 py-2 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <Filter className="h-3.5 w-3.5 text-surface-500" />
            <span>Dept:</span>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-surface-950 border border-surface-800 text-xs text-surface-300 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500/80 font-medium"
          >
            <option value="all">All Departments</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Management">Management</option>
            <option value="Security">Security</option>
            <option value="Administration">Administration</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-950 border border-surface-800 text-xs text-surface-300 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500/80 font-medium"
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
                <th className="py-3.5 px-4">Full Name & Dept</th>
                <th className="py-3.5 px-4">National ID & KRA PIN</th>
                <th className="py-3.5 px-4">Statutory (NSSF/NHIF)</th>
                <th className="py-3.5 px-4">Disbursement Bank</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Basic Salary</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-850/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-mono">Loading staff records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-surface-500">
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
                        <span>
                          {emp.title ? `${emp.title} ` : ''}{emp.first_name} {emp.middle_name ? `${emp.middle_name} ` : ''}{emp.last_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-surface-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 text-surface-500" />
                        <span>{emp.job_title} • <span className="text-brand-300">{emp.department || 'Operations'}</span></span>
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
                      <div className="text-surface-200 flex items-center gap-1 font-medium">
                        <Landmark className="h-3 w-3 text-surface-500" />
                        <span>{emp.bank_name || 'Cash / Cheque'}</span>
                      </div>
                      {emp.bank_account_no && (
                        <div className="text-[11px] font-mono text-surface-400 mt-0.5">
                          Acc: {emp.bank_account_no} {emp.bank_branch ? `(${emp.bank_branch})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-surface-300 font-mono text-xs">
                        <Phone className="h-3 w-3 text-surface-500" />
                        <span>{emp.phone}</span>
                      </div>
                      {emp.email && (
                        <div className="flex items-center gap-1 text-[11px] text-surface-400 mt-0.5">
                          <Mail className="h-3 w-3 text-surface-500" />
                          <span className="truncate max-w-[130px]">{emp.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-mint-400 whitespace-nowrap">
                      KES {parseFloat(emp.basic_salary || 0).toLocaleString()}
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
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStaffDossier(emp)}
                        className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors cursor-pointer"
                        title="View Full Dossier"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
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

            <div className="flex border-b border-surface-800 bg-surface-950/40 px-6">
              <button
                type="button"
                onClick={() => setActiveFormTab('identity')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'identity'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-surface-400 hover:text-surface-200'
                }`}
              >
                1. Bio & Personal
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('employment')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'employment'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-surface-400 hover:text-surface-200'
                }`}
              >
                2. Role & Banking
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('statutory')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeFormTab === 'statutory'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-surface-400 hover:text-surface-200'
                }`}
              >
                3. Statutory & Kin
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[75vh]">
              {activeFormTab === 'identity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Title
                      </label>
                      <select
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Eng.">Eng.</option>
                      </select>
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        name="middle_name"
                        placeholder="e.g. Mwangi"
                        value={formData.middle_name}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Marital Status
                      </label>
                      <select
                        name="marital_status"
                        value={formData.marital_status}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('employment')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white transition-all cursor-pointer"
                    >
                      Next: Role & Banking →
                    </button>
                  </div>
                </div>
              )}

              {activeFormTab === 'employment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Management">Management</option>
                        <option value="Security">Security</option>
                        <option value="Administration">Administration</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Employment Type
                      </label>
                      <select
                        name="employment_type"
                        value={formData.employment_type}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Casual">Casual</option>
                        <option value="Probation">Probation</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                      Bank Settlement Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          name="bank_name"
                          placeholder="e.g. Equity Bank, KCB, Co-op Bank"
                          value={formData.bank_name}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Branch Name
                        </label>
                        <input
                          type="text"
                          name="bank_branch"
                          placeholder="e.g. Thika Main Branch"
                          value={formData.bank_branch}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          name="bank_account_no"
                          placeholder="e.g. 0180293847291"
                          value={formData.bank_account_no}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Bank / Clearing Code
                        </label>
                        <input
                          type="text"
                          name="bank_code"
                          placeholder="e.g. 68001"
                          value={formData.bank_code}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('identity')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-all cursor-pointer"
                    >
                      ← Back: Bio
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('statutory')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white transition-all cursor-pointer"
                    >
                      Next: Statutory & Kin →
                    </button>
                  </div>
                </div>
              )}

              {activeFormTab === 'statutory' && (
                <div className="space-y-4">
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 transition-all"
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 transition-all"
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                  </div>

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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
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
                        className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                      Next of Kin & Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Kin Full Name
                        </label>
                        <input
                          type="text"
                          name="next_of_kin_name"
                          placeholder="e.g. Jane Wanjiku Kamau"
                          value={formData.next_of_kin_name}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Kin Phone Number
                        </label>
                        <input
                          type="text"
                          name="next_of_kin_phone"
                          placeholder="e.g. +254722000000"
                          value={formData.next_of_kin_phone}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Relationship
                        </label>
                        <input
                          type="text"
                          name="next_of_kin_relation"
                          placeholder="e.g. Spouse / Sibling / Parent"
                          value={formData.next_of_kin_relation}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-400 font-mono mb-3">
                      Annual Leave Entitlement (Days)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Annual Leave Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="annual_leave_days"
                          value={formData.annual_leave_days}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-300 mb-1">
                          Sick Leave Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="sick_leave_days"
                          value={formData.sick_leave_days}
                          onChange={handleInputChange}
                          className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/20 text-xs text-brand-300 flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-brand-400 shrink-0" />
                    <span>
                      Multi-tenant compound foreign key enforced: <strong>{context?.companyName}</strong> (Branch: <strong>{context?.branchCode}</strong>).
                    </span>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('employment')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-all cursor-pointer"
                    >
                      ← Back: Role & Banking
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft shadow-brand-600/25 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Staff Member...</span>
                        </>
                      ) : (
                        <span>Register Staff Member</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {selectedStaffDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-xl my-8 overflow-hidden shadow-elevated flex flex-col">
            <div className="px-6 py-4.5 border-b border-surface-800 flex items-center justify-between bg-surface-950/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-sm">
                  {selectedStaffDossier.employee_no?.substring(0, 3)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedStaffDossier.title ? `${selectedStaffDossier.title} ` : ''}
                    {selectedStaffDossier.first_name} {selectedStaffDossier.middle_name ? `${selectedStaffDossier.middle_name} ` : ''}{selectedStaffDossier.last_name}
                  </h3>
                  <p className="text-xs text-surface-400 font-mono">
                    {selectedStaffDossier.employee_no} • {selectedStaffDossier.job_title} ({selectedStaffDossier.department || 'Operations'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffDossier(null)}
                className="text-surface-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-950/50 p-4 rounded-2xl border border-surface-800/60">
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">National ID</span>
                  <p className="font-semibold text-white font-mono mt-0.5">{selectedStaffDossier.id_number || '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">Gender / Marital</span>
                  <p className="font-semibold text-white mt-0.5">{selectedStaffDossier.gender || '—'} / {selectedStaffDossier.marital_status || '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">Date of Birth</span>
                  <p className="font-semibold text-white font-mono mt-0.5">{selectedStaffDossier.date_of_birth || '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">Employment Type</span>
                  <p className="font-semibold text-brand-300 mt-0.5">{selectedStaffDossier.employment_type || 'Permanent'}</p>
                </div>
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">Hire Date</span>
                  <p className="font-semibold text-white font-mono mt-0.5">{selectedStaffDossier.hire_date || '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500 text-[10px] uppercase font-mono">Basic Salary</span>
                  <p className="font-bold text-mint-400 font-mono mt-0.5">KES {parseFloat(selectedStaffDossier.basic_salary || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-surface-950/50 p-4 rounded-2xl border border-surface-800/60 space-y-2">
                <span className="text-surface-500 text-[10px] uppercase font-mono font-bold text-brand-400">Statutory Tax & Social Security</span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-surface-500 text-[10px]">KRA PIN:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.kra_pin || '—'}</p>
                  </div>
                  <div>
                    <span className="text-surface-500 text-[10px]">NSSF NO:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.nssf_no || '—'}</p>
                  </div>
                  <div>
                    <span className="text-surface-500 text-[10px]">NHIF NO:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.nhif_no || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-950/50 p-4 rounded-2xl border border-surface-800/60 space-y-2">
                <span className="text-surface-500 text-[10px] uppercase font-mono font-bold text-brand-400">Bank Disbursement Account</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-surface-500 text-[10px]">Bank & Branch:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.bank_name || 'Cash'} {selectedStaffDossier.bank_branch ? `(${selectedStaffDossier.bank_branch})` : ''}</p>
                  </div>
                  <div>
                    <span className="text-surface-500 text-[10px]">Account No & Code:</span>
                    <p className="text-surface-200 font-mono font-semibold">{selectedStaffDossier.bank_account_no || '—'} {selectedStaffDossier.bank_code ? `[${selectedStaffDossier.bank_code}]` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-950/50 p-4 rounded-2xl border border-surface-800/60 space-y-2">
                <span className="text-surface-500 text-[10px] uppercase font-mono font-bold text-brand-400">Next of Kin / Emergency Contact</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-surface-500 text-[10px]">Kin Name:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.next_of_kin_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-surface-500 text-[10px]">Kin Phone:</span>
                    <p className="text-surface-200 font-mono">{selectedStaffDossier.next_of_kin_phone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-surface-500 text-[10px]">Relationship:</span>
                    <p className="text-surface-200 font-semibold">{selectedStaffDossier.next_of_kin_relation || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-950/50 p-4 rounded-2xl border border-surface-800/60 flex items-center justify-between text-surface-400 font-mono text-[11px]">
                <span>Annual Leave: <strong className="text-white">{selectedStaffDossier.annual_leave_days || 21} days</strong></span>
                <span>Sick Leave: <strong className="text-white">{selectedStaffDossier.sick_leave_days || 30} days</strong></span>
              </div>
            </div>

            <div className="p-4 border-t border-surface-800 bg-surface-950/40 flex justify-end">
              <button
                onClick={() => setSelectedStaffDossier(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
