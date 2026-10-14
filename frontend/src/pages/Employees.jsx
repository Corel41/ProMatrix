import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [activeTab, setActiveTab] = useState('Contact Information')
  const [activeSidebarNav, setActiveSidebarNav] = useState('registry')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [paysPaye, setPaysPaye] = useState(true)
  const [paysNhif, setPaysNhif] = useState(true)
  const [paysNssf, setPaysNssf] = useState(true)

  const [earningsList, setEarningsList] = useState([
    { id: 1, type: 'Basic Pay', amount: 35000, taxable: true, recurring: true },
    { id: 2, type: 'House Allowance', amount: 8000, taxable: true, recurring: true },
    { id: 3, type: 'Commuter Allowance', amount: 4000, taxable: false, recurring: true },
  ])

  const [newEarningType, setNewEarningType] = useState('Overtime')
  const [newEarningAmount, setNewEarningAmount] = useState('')
  const [newEarningTaxable, setNewEarningTaxable] = useState(true)

  const defaultFormData = {
    employee_no: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    id_number: '',
    gender: 'Male',
    marital_status: 'Married',
    date_of_birth: '1988-06-14',
    phone: '',
    email: '',
    physical_address: 'Buruburu Phase 4, House 210',
    postal_address: 'P.O Box 49201-00100',
    city: 'Nairobi',
    job_title: 'Property Caretaker',
    department: 'Operations',
    employment_type: 'Permanent',
    hire_date: '2023-01-15',
    supervisor: 'James Mbaria',
    basic_salary: 35000,
    kra_pin: 'A009182746B',
    nssf_no: 'NSSF-920194',
    nhif_no: 'NHIF-551029',
    bank_name: 'Equity Bank',
    bank_branch: 'Harambee Avenue',
    bank_account_no: '0180293847192',
    bank_code: '068',
    contract_start: '2023-01-15',
    contract_end: '2026-12-31',
    probation_period: '3 Months',
    notice_period: '30 Days',
    contract_terms: 'Full Time Standard Employment',
    annual_leave_days: 21,
    sick_leave_days: 30,
    maternity_leave_days: 90,
    leave_balance: 14,
    exit_date: '',
    exit_type: 'N/A',
    exit_reason: '',
    clearance_status: 'Pending',
    qualification_level: 'Diploma in Real Estate Management',
    institution: 'Kenya Institute of Management',
    graduation_year: '2015',
    certifications: 'OSHA Workplace Safety, Fire Safety Level 2',
    kin_name: 'Mary Wangari Mbaria',
    kin_relation: 'Spouse',
    kin_phone: '0712345678',
    kin_alt_phone: '0723456789',
    kin_address: 'Nairobi',
    doc_id_attached: true,
    doc_pin_attached: true,
    doc_nssf_attached: true,
    doc_nhif_attached: true,
    doc_contract_attached: true,
    status: 'active'
  }

  const [formData, setFormData] = useState(defaultFormData)

  const tabs = [
    'Contact Information',
    'Job Information',
    'Payment Information',
    'Contract Details',
    'Leave Details',
    'Exit Details',
    'Qualification',
    'Next Of Kin',
    'Documents'
  ]

  const loadEmployees = async () => {
    setLoading(true)
    setStatusMsg('')
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

      if (data && data.length > 0) {
        populateFormFromRecord(data[0])
      }
    } catch (err) {
      console.error(err)
      setStatusMsg('Error loading employees: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const populateFormFromRecord = (emp) => {
    setSelectedEmployeeId(emp.id)
    setFormData({
      employee_no: emp.employee_no || '',
      first_name: emp.first_name || '',
      middle_name: emp.middle_name || '',
      last_name: emp.last_name || '',
      id_number: emp.id_number || '',
      gender: emp.gender || 'Male',
      marital_status: emp.marital_status || 'Married',
      date_of_birth: emp.date_of_birth || '1988-06-14',
      phone: emp.phone || '',
      email: emp.email || '',
      physical_address: emp.physical_address || 'Buruburu Phase 4, House 210',
      postal_address: emp.postal_address || 'P.O Box 49201-00100',
      city: emp.city || 'Nairobi',
      job_title: emp.job_title || 'Property Caretaker',
      department: emp.department || 'Operations',
      employment_type: emp.employment_type || 'Permanent',
      hire_date: emp.hire_date || '2023-01-15',
      supervisor: emp.supervisor || 'James Mbaria',
      basic_salary: emp.basic_salary || 35000,
      kra_pin: emp.kra_pin || 'A009182746B',
      nssf_no: emp.nssf_no || 'NSSF-920194',
      nhif_no: emp.nhif_no || 'NHIF-551029',
      bank_name: emp.bank_name || 'Equity Bank',
      bank_branch: emp.bank_branch || 'Harambee Avenue',
      bank_account_no: emp.bank_account_no || '0180293847192',
      bank_code: emp.bank_code || '068',
      contract_start: emp.contract_start || emp.hire_date || '2023-01-15',
      contract_end: emp.contract_end || '2026-12-31',
      probation_period: emp.probation_period || '3 Months',
      notice_period: emp.notice_period || '30 Days',
      contract_terms: emp.contract_terms || 'Full Time Standard Employment',
      annual_leave_days: emp.annual_leave_days || 21,
      sick_leave_days: emp.sick_leave_days || 30,
      maternity_leave_days: 90,
      leave_balance: emp.annual_leave_days ? Math.round(emp.annual_leave_days * 0.6) : 14,
      exit_date: emp.exit_date || '',
      exit_type: emp.exit_type || 'N/A',
      exit_reason: emp.exit_reason || '',
      clearance_status: emp.clearance_status || 'Pending',
      qualification_level: emp.qualification_level || 'Diploma in Real Estate Management',
      institution: emp.institution || 'Kenya Institute of Management',
      graduation_year: emp.graduation_year || '2015',
      certifications: emp.certifications || 'OSHA Workplace Safety, Fire Safety Level 2',
      kin_name: emp.next_of_kin_name || 'Mary Wangari Mbaria',
      kin_relation: emp.next_of_kin_relation || 'Spouse',
      kin_phone: emp.next_of_kin_phone || '0712345678',
      kin_alt_phone: '0723456789',
      kin_address: 'Nairobi',
      doc_id_attached: true,
      doc_pin_attached: true,
      doc_nssf_attached: true,
      doc_nhif_attached: true,
      doc_contract_attached: true,
      status: emp.status || 'active'
    })

    const bPay = parseFloat(emp.basic_salary) || 35000
    setEarningsList([
      { id: 1, type: 'Basic Pay', amount: bPay, taxable: true, recurring: true },
      { id: 2, type: 'House Allowance', amount: Math.round(bPay * 0.2), taxable: true, recurring: true },
      { id: 3, type: 'Commuter Allowance', amount: 4000, taxable: false, recurring: true },
    ])
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleClear = () => {
    setSelectedEmployeeId(null)
    setFormData({
      ...defaultFormData,
      employee_no: 'EMP-' + Math.floor(1000 + Math.random() * 9000),
      first_name: '',
      middle_name: '',
      last_name: '',
      id_number: '',
      phone: '',
      email: '',
      basic_salary: ''
    })
    setEarningsList([])
    setStatusMsg('Form reset for new employee.')
  }

  const handleAddEarning = () => {
    if (!newEarningAmount) return
    const newItem = {
      id: Date.now(),
      type: newEarningType,
      amount: parseFloat(newEarningAmount) || 0,
      taxable: newEarningTaxable,
      recurring: true
    }
    setEarningsList([...earningsList, newItem])
    setNewEarningAmount('')
  }

  const handleRemoveEarning = (id) => {
    setEarningsList(earningsList.filter((item) => item.id !== id))
  }

  const handleEditEarning = (item) => {
    setNewEarningType(item.type)
    setNewEarningAmount(item.amount.toString())
    setNewEarningTaxable(item.taxable)
    handleRemoveEarning(item.id)
  }

  const handleSave = async () => {
    setSubmitting(true)
    setStatusMsg('')
    try {
      if (!context) throw new Error('System context not loaded.')
      if (!formData.employee_no.trim() || !formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('Employee No, First Name and Last Name are required.')
      }

      const basicSalaryNum = parseFloat(formData.basic_salary) || 0
      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        employee_no: formData.employee_no.trim().toUpperCase(),
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        id_number: formData.id_number.trim() || null,
        gender: formData.gender,
        marital_status: formData.marital_status,
        department: formData.department,
        employment_type: formData.employment_type,
        job_title: formData.job_title.trim() || 'Staff',
        kra_pin: formData.kra_pin.trim().toUpperCase() || null,
        nssf_no: formData.nssf_no.trim().toUpperCase() || null,
        nhif_no: formData.nhif_no.trim().toUpperCase() || null,
        phone: formData.phone.trim() || '0700000000',
        email: formData.email.trim() || null,
        basic_salary: basicSalaryNum,
        bank_name: formData.bank_name.trim() || null,
        bank_branch: formData.bank_branch.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        bank_code: formData.bank_code.trim() || null,
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        status: formData.status || 'active'
      }

      if (selectedEmployeeId) {
        const { error } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', selectedEmployeeId)
        if (error) throw error
        setStatusMsg('Employee record updated successfully.')
      } else {
        const { data, error } = await supabase
          .from('employees')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        setSelectedEmployeeId(data.id)
        setStatusMsg('Employee record created successfully.')
      }
      loadEmployees()
    } catch (err) {
      console.error(err)
      setStatusMsg('Save failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const q = searchTerm.toLowerCase()
    return (
      emp.employee_no?.toLowerCase().includes(q) ||
      emp.first_name?.toLowerCase().includes(q) ||
      emp.last_name?.toLowerCase().includes(q) ||
      emp.job_title?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex h-full w-full bg-white text-black font-sans text-xs overflow-hidden">
      <aside className="w-56 shrink-0 bg-teal-600 text-white flex flex-col justify-between border-r border-teal-700 select-none">
        <div>
          <div className="p-3 bg-teal-700 font-bold text-sm tracking-wide border-b border-teal-800">
            HR & PAYROLL SYSTEM
          </div>
          <div className="p-2 text-[11px] text-teal-100 uppercase font-semibold">
            Employee Management
          </div>
          <ul className="text-xs">
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('registry')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'registry' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Staff Registry
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarNav('dossier')
                  handleClear()
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'dossier' && !selectedEmployeeId ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                New Employee
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('dossier')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'dossier' && selectedEmployeeId ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Employee Data Window
              </button>
            </li>
          </ul>

          <div className="p-2 text-[11px] text-teal-100 uppercase font-semibold mt-3">
            Leave Management
          </div>
          <ul className="text-xs">
            <li>
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarNav('leave_app')
                  setActiveTab('Leave Details')
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'leave_app' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Leave Application
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('leave_approvals')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'leave_approvals' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Leave Approvals
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('leave_types')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'leave_types' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Leave Types & Balances
              </button>
            </li>
          </ul>

          <div className="p-2 text-[11px] text-teal-100 uppercase font-semibold mt-3">
            Reports
          </div>
          <ul className="text-xs">
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('reports')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'reports' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Employee List & Census
              </button>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-teal-700/80 text-[11px] border-t border-teal-800">
          <div>Logged in: Administrator</div>
          <div className="text-teal-200">Branch: {context?.branchName || 'Nairobi Central'}</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-100 p-4">
        <div className="bg-white border border-gray-300 p-3 mb-3">
          <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Fig 10 & 11: Employee Information Master Window
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Select Employee:</span>
              <select
                value={selectedEmployeeId || ''}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value)
                  if (emp) populateFormFromRecord(emp)
                }}
                className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
              >
                <option value="">-- Choose Staff --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_no} - {emp.first_name} {emp.last_name} ({emp.job_title})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleClear}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                + New Staff
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className="bg-yellow-50 border border-yellow-400 text-yellow-900 px-3 py-1 text-xs mb-2">
              {statusMsg}
            </div>
          )}

          <div className="flex border-b border-gray-400">
            {tabs.map((tab) => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
                    isActive
                      ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  style={{ marginBottom: isActive ? '-1px' : '0px' }}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          <div className="border border-gray-400 border-t-0 bg-white p-4">
            {activeTab === 'Contact Information' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">National ID / Passport *</label>
                  <input
                    type="text"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Marital Status</label>
                  <select
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Residential Address</label>
                  <input
                    type="text"
                    name="physical_address"
                    value={formData.physical_address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Address</label>
                  <input
                    type="text"
                    name="postal_address"
                    value={formData.postal_address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Job Information' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Staff No *</label>
                  <input
                    type="text"
                    name="employee_no"
                    value={formData.employee_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Property Management">Property Management</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="Administration">Administration</option>
                    <option value="Maintenance">Maintenance & Caretaking</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employment Type</label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Casual">Casual / Daily</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hire / Engagement Date</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reports To / Supervisor</label>
                  <input
                    type="text"
                    name="supervisor"
                    value={formData.supervisor}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Station / Property</label>
                  <input
                    type="text"
                    defaultValue="Buruburu Phase 4 Estate"
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employment Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                    <option value="resigned">Resigned</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'Payment Information' && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border border-gray-300">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Basic Pay (Kshs) *
                      </label>
                      <input
                        type="number"
                        name="basic_salary"
                        value={formData.basic_salary}
                        onChange={handleInputChange}
                        className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-48 font-bold text-gray-900"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paysPaye}
                          onChange={(e) => setPaysPaye(e.target.checked)}
                          className="rounded-none border border-gray-400 h-4 w-4"
                        />
                        <span>Pays PAYE</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paysNhif}
                          onChange={(e) => setPaysNhif(e.target.checked)}
                          className="rounded-none border border-gray-400 h-4 w-4"
                        />
                        <span>Pays NHIF</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paysNssf}
                          onChange={(e) => setPaysNssf(e.target.checked)}
                          className="rounded-none border border-gray-400 h-4 w-4"
                        />
                        <span>Pays NSSF</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">KRA PIN Number</label>
                    <input
                      type="text"
                      name="kra_pin"
                      value={formData.kra_pin}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">NSSF Number</label>
                    <input
                      type="text"
                      name="nssf_no"
                      value={formData.nssf_no}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">NHIF Number</label>
                    <input
                      type="text"
                      name="nhif_no"
                      value={formData.nhif_no}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
                    <select className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white">
                      <option value="Bank">Bank Transfer (EFT)</option>
                      <option value="Mpesa">M-Pesa B2C</option>
                      <option value="Cheque">Company Cheque</option>
                      <option value="Cash">Cash Voucher</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Branch</label>
                    <input
                      type="text"
                      name="bank_branch"
                      value={formData.bank_branch}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      name="bank_account_no"
                      value={formData.bank_account_no}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Clearing Code</label>
                    <input
                      type="text"
                      name="bank_code"
                      value={formData.bank_code}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="border border-gray-300 p-3 bg-white mt-4">
                  <div className="font-bold text-gray-800 text-xs uppercase mb-2">
                    Earnings & Allowances Grid
                  </div>

                  <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 border border-gray-300">
                    <span className="text-xs font-semibold">Earning Item:</span>
                    <select
                      value={newEarningType}
                      onChange={(e) => setNewEarningType(e.target.value)}
                      className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                    >
                      <option value="House Allowance">House Allowance</option>
                      <option value="Commuter Allowance">Commuter Allowance</option>
                      <option value="Overtime">Overtime</option>
                      <option value="Responsibility Allowance">Responsibility Allowance</option>
                      <option value="Hardship Allowance">Hardship Allowance</option>
                      <option value="Performance Bonus">Performance Bonus</option>
                    </select>

                    <span className="text-xs font-semibold ml-2">Amount (Kshs):</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newEarningAmount}
                      onChange={(e) => setNewEarningAmount(e.target.value)}
                      className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-28"
                    />

                    <label className="inline-flex items-center gap-1 text-xs ml-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEarningTaxable}
                        onChange={(e) => setNewEarningTaxable(e.target.checked)}
                        className="rounded-none border-gray-400"
                      />
                      <span>Taxable</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddEarning}
                      className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold ml-auto cursor-pointer"
                    >
                      Add Earning
                    </button>
                  </div>

                  <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                      <tr>
                        <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left w-24">
                          Actions
                        </th>
                        <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">
                          Earning Description
                        </th>
                        <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">
                          Amount (KES)
                        </th>
                        <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">
                          Taxable
                        </th>
                        <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">
                          Recurring
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsList.map((item) => (
                        <tr key={item.id} className="bg-white border-b border-gray-200">
                          <td className="py-1 px-2 whitespace-nowrap">
                            <span
                              onClick={() => handleRemoveEarning(item.id)}
                              className="text-red-600 underline cursor-pointer mr-3 font-semibold"
                            >
                              Remove
                            </span>
                            <span
                              onClick={() => handleEditEarning(item)}
                              className="text-gray-600 underline cursor-pointer font-semibold"
                            >
                              Edit
                            </span>
                          </td>
                          <td className="py-1 px-2 font-medium">{item.type}</td>
                          <td className="py-1 px-2 text-right font-mono">
                            {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-2 text-center">
                            {item.taxable ? 'YES' : 'NO'}
                          </td>
                          <td className="py-1 px-2 text-center">
                            {item.recurring ? 'YES' : 'NO'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'Contract Details' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contract Start Date</label>
                  <input
                    type="date"
                    name="contract_start"
                    value={formData.contract_start}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contract End Date</label>
                  <input
                    type="date"
                    name="contract_end"
                    value={formData.contract_end}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Probation Period</label>
                  <input
                    type="text"
                    name="probation_period"
                    value={formData.probation_period}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notice Period (Days)</label>
                  <input
                    type="text"
                    name="notice_period"
                    value={formData.notice_period}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contract Terms Summary</label>
                  <input
                    type="text"
                    name="contract_terms"
                    value={formData.contract_terms}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Leave Details' && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Leave Entitlement (Days)</label>
                  <input
                    type="number"
                    name="annual_leave_days"
                    value={formData.annual_leave_days}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sick Leave Entitlement (Days)</label>
                  <input
                    type="number"
                    name="sick_leave_days"
                    value={formData.sick_leave_days}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Maternity/Paternity (Days)</label>
                  <input
                    type="number"
                    value={formData.maternity_leave_days}
                    readOnly
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Leave Balance (Days)</label>
                  <input
                    type="number"
                    value={formData.leave_balance}
                    readOnly
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-gray-100 font-bold text-blue-700"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Exit Details' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Exit / Termination Date</label>
                  <input
                    type="date"
                    name="exit_date"
                    value={formData.exit_date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Exit Type</label>
                  <select
                    name="exit_type"
                    value={formData.exit_type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="N/A">N/A (Active Employee)</option>
                    <option value="Resignation">Voluntary Resignation</option>
                    <option value="Termination">Termination of Contract</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Dismissal">Summary Dismissal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Clearance Status</label>
                  <select
                    name="clearance_status"
                    value={formData.clearance_status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Pending">Pending Clearance</option>
                    <option value="Cleared">Fully Cleared</option>
                    <option value="Disputed">Disputed / Assets Held</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Exit Remarks / Reason</label>
                  <input
                    type="text"
                    name="exit_reason"
                    value={formData.exit_reason}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Qualification' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Highest Qualification Level</label>
                  <input
                    type="text"
                    name="qualification_level"
                    value={formData.qualification_level}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Educational Institution</label>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year of Graduation</label>
                  <input
                    type="text"
                    name="graduation_year"
                    value={formData.graduation_year}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Professional Certifications</label>
                  <input
                    type="text"
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Next Of Kin' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next of Kin Full Name</label>
                  <input
                    type="text"
                    name="kin_name"
                    value={formData.kin_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    name="kin_relation"
                    value={formData.kin_relation}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Mobile Phone</label>
                  <input
                    type="text"
                    name="kin_phone"
                    value={formData.kin_phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alternative Phone</label>
                  <input
                    type="text"
                    name="kin_alt_phone"
                    value={formData.kin_alt_phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Residential Address</label>
                  <input
                    type="text"
                    name="kin_address"
                    value={formData.kin_address}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'Documents' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-gray-300 bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>National ID Copy (Scanned & Verified)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>KRA PIN Certificate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>NSSF Card / Registration Slip</span>
                  </label>
                </div>
                <div className="p-3 border border-gray-300 bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>NHIF Member Card</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>Signed Employment Contract Copy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                    <input type="checkbox" defaultChecked className="rounded-none border-gray-400" />
                    <span>Police Clearance Certificate (Good Conduct)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-300 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSave()
                  handleClear()
                }}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Save & New
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
              Staff Directory ({filteredEmployees.length} Records)
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search staff no, name, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left w-12">#</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Emp No</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Full Name</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Job Title</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Department</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">National ID</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Phone</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Basic Salary</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    onClick={() => populateFormFromRecord(emp)}
                    className={`border-b border-gray-200 cursor-pointer ${
                      selectedEmployeeId === emp.id ? 'bg-orange-100 font-bold' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-1 px-2">{index + 1}</td>
                    <td className="py-1 px-2 font-mono">{emp.employee_no}</td>
                    <td className="py-1 px-2">{emp.first_name} {emp.last_name}</td>
                    <td className="py-1 px-2">{emp.job_title}</td>
                    <td className="py-1 px-2">{emp.department}</td>
                    <td className="py-1 px-2 font-mono">{emp.id_number || '-'}</td>
                    <td className="py-1 px-2 font-mono">{emp.phone}</td>
                    <td className="py-1 px-2 text-right font-mono">
                      {Number(emp.basic_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-center uppercase font-mono text-[11px]">
                      {emp.status}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          populateFormFromRecord(emp)
                        }}
                        className="text-blue-700 underline font-semibold cursor-pointer"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
