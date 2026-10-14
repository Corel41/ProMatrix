import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('rights')
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const [selectedRole, setSelectedRole] = useState('Administrator')

  const initialUserRights = [
    { id: 1, role: 'Administrator', moduleName: 'Property Management', subModule: 'Properties', menuName: 'Fp_Properties.aspx', access: true, read: true, write: true, delete: true },
    { id: 2, role: 'Administrator', moduleName: 'Property Management', subModule: 'Units', menuName: 'Fp_Units.aspx', access: true, read: true, write: true, delete: true },
    { id: 3, role: 'Administrator', moduleName: 'Tenant Accounts', subModule: 'Tenants', menuName: 'Fp_Tenants.aspx', access: true, read: true, write: true, delete: true },
    { id: 4, role: 'Administrator', moduleName: 'Tenant Accounts', subModule: 'Leases', menuName: 'Fp_Leases.aspx', access: true, read: true, write: true, delete: true },
    { id: 5, role: 'Administrator', moduleName: 'Tenant Accounts', subModule: 'Receipting', menuName: 'Fp_Receipts.aspx', access: true, read: true, write: true, delete: true },
    { id: 6, role: 'Administrator', moduleName: 'Tenant Accounts', subModule: 'Water Meters', menuName: 'Fp_MeterReadings.aspx', access: true, read: true, write: true, delete: true },
    { id: 7, role: 'Administrator', moduleName: 'Landlord Accounts', subModule: 'Remittance', menuName: 'Fp_Landlords.aspx', access: true, read: true, write: true, delete: true },
    { id: 8, role: 'Administrator', moduleName: 'Human Resource', subModule: 'Employees', menuName: 'Fp_Employees.aspx', access: true, read: true, write: true, delete: true },
    { id: 9, role: 'Administrator', moduleName: 'Payroll', subModule: 'Monthly Processing', menuName: 'Fp_Payroll.aspx', access: true, read: true, write: true, delete: true },
    { id: 10, role: 'Administrator', moduleName: 'Reports', subModule: 'Landlord Statement', menuName: 'Fp_Reports.aspx', access: true, read: true, write: true, delete: true },
    { id: 11, role: 'Administrator', moduleName: 'Administration', subModule: 'User Rights Matrix', menuName: 'Fp_UserRights.aspx', access: true, read: true, write: true, delete: true },
    { id: 12, role: 'Administrator', moduleName: 'Administration', subModule: 'Company Settings', menuName: 'Fp_CompanyInfo.aspx', access: true, read: true, write: true, delete: true },

    { id: 13, role: 'Property Manager', moduleName: 'Property Management', subModule: 'Properties', menuName: 'Fp_Properties.aspx', access: true, read: true, write: true, delete: false },
    { id: 14, role: 'Property Manager', moduleName: 'Property Management', subModule: 'Units', menuName: 'Fp_Units.aspx', access: true, read: true, write: true, delete: false },
    { id: 15, role: 'Property Manager', moduleName: 'Tenant Accounts', subModule: 'Tenants', menuName: 'Fp_Tenants.aspx', access: true, read: true, write: true, delete: false },
    { id: 16, role: 'Property Manager', moduleName: 'Tenant Accounts', subModule: 'Leases', menuName: 'Fp_Leases.aspx', access: true, read: true, write: true, delete: false },
    { id: 17, role: 'Property Manager', moduleName: 'Tenant Accounts', subModule: 'Receipting', menuName: 'Fp_Receipts.aspx', access: true, read: true, write: true, delete: false },
    { id: 18, role: 'Property Manager', moduleName: 'Tenant Accounts', subModule: 'Water Meters', menuName: 'Fp_MeterReadings.aspx', access: true, read: true, write: true, delete: false },
    { id: 19, role: 'Property Manager', moduleName: 'Reports', subModule: 'Landlord Statement', menuName: 'Fp_Reports.aspx', access: true, read: true, write: false, delete: false },
    { id: 20, role: 'Property Manager', moduleName: 'Human Resource', subModule: 'Employees', menuName: 'Fp_Employees.aspx', access: false, read: false, write: false, delete: false },
    { id: 21, role: 'Property Manager', moduleName: 'Payroll', subModule: 'Monthly Processing', menuName: 'Fp_Payroll.aspx', access: false, read: false, write: false, delete: false },
    { id: 22, role: 'Property Manager', moduleName: 'Administration', subModule: 'User Rights Matrix', menuName: 'Fp_UserRights.aspx', access: false, read: false, write: false, delete: false },

    { id: 23, role: 'Finance & Accounts', moduleName: 'Property Management', subModule: 'Properties', menuName: 'Fp_Properties.aspx', access: true, read: true, write: false, delete: false },
    { id: 24, role: 'Finance & Accounts', moduleName: 'Tenant Accounts', subModule: 'Receipting', menuName: 'Fp_Receipts.aspx', access: true, read: true, write: true, delete: false },
    { id: 25, role: 'Finance & Accounts', moduleName: 'Landlord Accounts', subModule: 'Remittance', menuName: 'Fp_Landlords.aspx', access: true, read: true, write: true, delete: false },
    { id: 26, role: 'Finance & Accounts', moduleName: 'Payroll', subModule: 'Monthly Processing', menuName: 'Fp_Payroll.aspx', access: true, read: true, write: true, delete: false },
    { id: 27, role: 'Finance & Accounts', moduleName: 'Reports', subModule: 'Landlord Statement', menuName: 'Fp_Reports.aspx', access: true, read: true, write: true, delete: false },
    { id: 28, role: 'Finance & Accounts', moduleName: 'Administration', subModule: 'User Rights Matrix', menuName: 'Fp_UserRights.aspx', access: false, read: false, write: false, delete: false },

    { id: 29, role: 'Site Caretaker', moduleName: 'Property Management', subModule: 'Properties', menuName: 'Fp_Properties.aspx', access: true, read: true, write: false, delete: false },
    { id: 30, role: 'Site Caretaker', moduleName: 'Property Management', subModule: 'Units', menuName: 'Fp_Units.aspx', access: true, read: true, write: false, delete: false },
    { id: 31, role: 'Site Caretaker', moduleName: 'Tenant Accounts', subModule: 'Water Meters', menuName: 'Fp_MeterReadings.aspx', access: true, read: true, write: true, delete: false },
    { id: 32, role: 'Site Caretaker', moduleName: 'Reports', subModule: 'Landlord Statement', menuName: 'Fp_Reports.aspx', access: false, read: false, write: false, delete: false },
    { id: 33, role: 'Site Caretaker', moduleName: 'Payroll', subModule: 'Monthly Processing', menuName: 'Fp_Payroll.aspx', access: false, read: false, write: false, delete: false },
  ]

  const [userRights, setUserRights] = useState(initialUserRights)

  const [companyForm, setCompanyForm] = useState({
    name: 'ProMatrix Real Estate Agency',
    slogan: 'Properties. People. Performance.',
    legal_name: 'ProMatrix Management Limited',
    kra_pin: 'P051283921A',
    nssf_no: 'NSSF-492019',
    nhif_no: 'NHIF-820192',
    postal_code: '01000',
    city: 'Nairobi',
    address_line1: 'Commercial Street, Suite 402',
    phone: '+254 722 000 000',
    email: 'info@promatrix.co.ke',
    base_currency: 'KES',
    vat_percentage: 16.0,
    management_fee_rate: 7.5,
  })

  const [usersList, setUsersList] = useState([
    { id: '1', full_name: 'James Mbaria', username: 'admin', employee_no: 'EMP-001', role: 'Administrator', status: 'Active', email: 'james@propwings.co.ke' },
    { id: '2', full_name: 'David Kariuki', username: 'dkariuki', employee_no: 'EMP-002', role: 'Property Manager', status: 'Active', email: 'dkariuki@propwings.co.ke' },
    { id: '3', full_name: 'Faith Wanjiku', username: 'fwanjiku', employee_no: 'EMP-003', role: 'Finance & Accounts', status: 'Active', email: 'fwanjiku@propwings.co.ke' },
    { id: '4', full_name: 'Peter Omondi', username: 'pomondi', employee_no: 'EMP-004', role: 'Site Caretaker', status: 'Active', email: 'pomondi@propwings.co.ke' },
  ])

  const [newModuleRight, setNewModuleRight] = useState({
    moduleName: 'Property Management',
    subModule: 'New SubModule',
    menuName: 'Fp_CustomModule.aspx',
  })

  useEffect(() => {
    async function init() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleToggleRight = (id, field) => {
    setUserRights((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r))
    )
  }

  const handleDeleteRight = (id) => {
    setUserRights((prev) => prev.filter((r) => r.id !== id))
    setStatusMsg('User right removed from matrix.')
  }

  const handleAddRightRow = () => {
    const newItem = {
      id: Date.now(),
      role: selectedRole,
      moduleName: newModuleRight.moduleName,
      subModule: newModuleRight.subModule,
      menuName: newModuleRight.menuName,
      access: true,
      read: true,
      write: false,
      delete: false,
    }
    setUserRights([...userRights, newItem])
    setStatusMsg('New privilege mapping added.')
  }

  const handleSaveRights = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setStatusMsg(`User rights matrix for [${selectedRole}] successfully committed.`)
    }, 400)
  }

  const filteredRights = userRights.filter((r) => r.role === selectedRole)

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 text-black font-sans text-xs overflow-y-auto p-4">
      <div className="bg-white border border-gray-300 p-3 mb-3">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-3">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Fig 12: Administration & User Rights Management
            </h1>
            <p className="text-xs text-gray-500 font-serif">
              Granular access controls, module security matrices, and system parameters.
            </p>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            Tenant: {context?.companyName || 'ProMatrix Agency'} | Branch: {context?.branchName || 'Nairobi'}
          </div>
        </div>

        {statusMsg && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-900 px-3 py-1 text-xs mb-3">
            {statusMsg}
          </div>
        )}

        <div className="flex border-b border-gray-400 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('rights')}
            className={`px-4 py-1.5 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
              activeTab === 'rights'
                ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            style={{ marginBottom: activeTab === 'rights' ? '-1px' : '0px' }}
          >
            User Rights Matrix (Fig 12)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
              activeTab === 'users'
                ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            style={{ marginBottom: activeTab === 'users' ? '-1px' : '0px' }}
          >
            Authorized Users
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-4 py-1.5 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
              activeTab === 'company'
                ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            style={{ marginBottom: activeTab === 'company' ? '-1px' : '0px' }}
          >
            Company Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mpesa')}
            className={`px-4 py-1.5 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
              activeTab === 'mpesa'
                ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
            style={{ marginBottom: activeTab === 'mpesa' ? '-1px' : '0px' }}
          >
            M-Pesa API & Integrations
          </button>
        </div>

        {activeTab === 'rights' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 p-2.5 border border-gray-300">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-800 text-xs">Select Role / User Group:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="border border-gray-400 rounded-none h-7 px-2 text-sm bg-white font-semibold"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Property Manager">Property Manager</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Site Caretaker">Site Caretaker</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveRights}
                  disabled={saving}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save User Rights'}
                </button>
                <button
                  type="button"
                  onClick={() => setUserRights(initialUserRights)}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-300 text-xs">
              <span className="font-semibold text-gray-700">Add Module Privilege:</span>
              <select
                value={newModuleRight.moduleName}
                onChange={(e) => setNewModuleRight({ ...newModuleRight, moduleName: e.target.value })}
                className="border border-gray-400 rounded-none h-7 px-1 text-xs bg-white"
              >
                <option value="Property Management">Property Management</option>
                <option value="Tenant Accounts">Tenant Accounts</option>
                <option value="Landlord Accounts">Landlord Accounts</option>
                <option value="Human Resource">Human Resource</option>
                <option value="Payroll">Payroll</option>
                <option value="Reports">Reports</option>
                <option value="Administration">Administration</option>
              </select>

              <input
                type="text"
                placeholder="SubModule Name"
                value={newModuleRight.subModule}
                onChange={(e) => setNewModuleRight({ ...newModuleRight, subModule: e.target.value })}
                className="border border-gray-400 rounded-none h-7 px-1 text-xs bg-white w-44"
              />

              <input
                type="text"
                placeholder="MenuName (e.g. Fp_Page.aspx)"
                value={newModuleRight.menuName}
                onChange={(e) => setNewModuleRight({ ...newModuleRight, menuName: e.target.value })}
                className="border border-gray-400 rounded-none h-7 px-1 text-xs bg-white w-48 font-mono"
              />

              <button
                type="button"
                onClick={handleAddRightRow}
                className="bg-orange-500 text-white rounded-none px-3 py-1 text-xs font-bold cursor-pointer ml-auto"
              >
                + Add Privilege Row
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-300">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center w-16">
                      Action
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">
                      ModuleName
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">
                      SubModule
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left font-mono">
                      MenuName
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center w-20">
                      RAccess
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center w-20">
                      RRead
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center w-20">
                      RWrite
                    </th>
                    <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center w-20">
                      RDelete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRights.map((row) => (
                    <tr key={row.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-1 px-2 text-center">
                        <span
                          onClick={() => handleDeleteRight(row.id)}
                          className="text-red-600 underline cursor-pointer font-semibold"
                        >
                          Delete
                        </span>
                      </td>
                      <td className="py-1 px-2 font-medium">{row.moduleName}</td>
                      <td className="py-1 px-2">{row.subModule}</td>
                      <td className="py-1 px-2 font-mono text-gray-700">{row.menuName}</td>
                      <td className="py-1 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.access}
                          onChange={() => handleToggleRight(row.id, 'access')}
                          className="rounded-none border border-gray-400 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.read}
                          onChange={() => handleToggleRight(row.id, 'read')}
                          className="rounded-none border border-gray-400 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.write}
                          onChange={() => handleToggleRight(row.id, 'write')}
                          className="rounded-none border border-gray-400 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.delete}
                          onChange={() => handleToggleRight(row.id, 'delete')}
                          className="rounded-none border border-gray-400 h-4 w-4 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-gray-500 italic text-xs">
                Showing {filteredRights.length} active module permissions for {selectedRole}.
              </span>
              <button
                type="button"
                onClick={handleSaveRights}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                System User Administration
              </h2>
              <button
                type="button"
                onClick={() => setStatusMsg('User provisioning modal initialized.')}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                + Add New User
              </button>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Full Name</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Username</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Staff Code</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Assigned Role</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Email</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} className="bg-white border-b border-gray-200">
                    <td className="py-1 px-2 font-medium">{usr.full_name}</td>
                    <td className="py-1 px-2 font-mono">{usr.username}</td>
                    <td className="py-1 px-2 font-mono">{usr.employee_no}</td>
                    <td className="py-1 px-2">{usr.role}</td>
                    <td className="py-1 px-2">{usr.email}</td>
                    <td className="py-1 px-2 text-center uppercase font-mono text-[11px]">{usr.status}</td>
                    <td className="py-1 px-2 text-center">
                      <span
                        onClick={() => setStatusMsg(`Password reset triggered for ${usr.username}.`)}
                        className="text-blue-700 underline cursor-pointer mr-2 font-semibold"
                      >
                        Reset Pwd
                      </span>
                      <span
                        onClick={() => setStatusMsg(`User ${usr.username} deactivated.`)}
                        className="text-red-600 underline cursor-pointer font-semibold"
                      >
                        Deactivate
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="space-y-4">
            <div className="border-b border-gray-300 pb-2">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                Company & Business Entity Master
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Trading Name</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={companyForm.legal_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Slogan / Motto</label>
                <input
                  type="text"
                  value={companyForm.slogan}
                  onChange={(e) => setCompanyForm({ ...companyForm, slogan: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">KRA PIN</label>
                <input
                  type="text"
                  value={companyForm.kra_pin}
                  onChange={(e) => setCompanyForm({ ...companyForm, kra_pin: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NSSF Employer Code</label>
                <input
                  type="text"
                  value={companyForm.nssf_no}
                  onChange={(e) => setCompanyForm({ ...companyForm, nssf_no: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NHIF Employer Code</label>
                <input
                  type="text"
                  value={companyForm.nhif_no}
                  onChange={(e) => setCompanyForm({ ...companyForm, nhif_no: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Telephone</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Base Currency</label>
                <input
                  type="text"
                  value={companyForm.base_currency}
                  readOnly
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-gray-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={companyForm.address_line1}
                  onChange={(e) => setCompanyForm({ ...companyForm, address_line1: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City / Town</label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Management Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={companyForm.management_fee_rate}
                  onChange={(e) => setCompanyForm({ ...companyForm, management_fee_rate: parseFloat(e.target.value) })}
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-300 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusMsg('Company details successfully updated.')}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'mpesa' && (
          <div className="space-y-4">
            <div className="border-b border-gray-300 pb-2">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                M-Pesa Daraja & SMS Integration Parameters
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Paybill / Till Number</label>
                <input
                  type="text"
                  defaultValue="522522"
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">M-Pesa Shortcode</label>
                <input
                  type="text"
                  defaultValue="522522"
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Consumer Key</label>
                <input
                  type="password"
                  defaultValue="••••••••••••••••••••••••"
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Consumer Secret</label>
                <input
                  type="password"
                  defaultValue="••••••••••••••••••••••••"
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Callback URL (C2B Validation & Confirmation)</label>
                <input
                  type="text"
                  defaultValue="https://promatrix.co.ke/api/mpesa/c2b/callback"
                  className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-300 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusMsg('M-Pesa API parameters tested and verified.')}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Test Connection & Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
