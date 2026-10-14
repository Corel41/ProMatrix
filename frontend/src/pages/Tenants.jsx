import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingTenantId, setEditingTenantId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

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

  const defaultTenants = [
    {
      id: 'T-13101',
      tenant_no: 'T13101',
      full_name: 'Mary Nyambura Mune',
      first_name: 'Mary',
      last_name: 'Nyambura Mune',
      id_or_passport_no: '28471920',
      phone: '254728459082',
      email: 'mary.mune@gmail.com',
      workplace: 'Ministry of Health',
      status: 'active'
    },
    {
      id: 'T-11879',
      tenant_no: 'T11879',
      full_name: 'John Kennedy Methu',
      first_name: 'John',
      last_name: 'Kennedy Methu',
      id_or_passport_no: '24910293',
      phone: '254759265199',
      email: 'j.methu@yahoo.com',
      workplace: 'Kenya Power',
      status: 'active'
    },
    {
      id: 'T-14126',
      tenant_no: 'T14126',
      full_name: 'Prisca Achieng',
      first_name: 'Prisca',
      last_name: 'Achieng',
      id_or_passport_no: '30192847',
      phone: '254798798020',
      email: 'prisca.ach@gmail.com',
      workplace: 'Kenyatta National Hospital',
      status: 'active'
    },
    {
      id: 'T-11933',
      tenant_no: 'T11933',
      full_name: 'Harsal Aisha Njeri',
      first_name: 'Harsal',
      last_name: 'Aisha Njeri',
      id_or_passport_no: '31829104',
      phone: '254745705150',
      email: 'aisha.njeri@gmail.com',
      workplace: 'Private Business',
      status: 'active'
    },
    {
      id: 'T-19217',
      tenant_no: 'T19217',
      full_name: 'Edna Muthoni Kanyoro',
      first_name: 'Edna',
      last_name: 'Muthoni Kanyoro',
      id_or_passport_no: '32036555',
      phone: '254706370463',
      email: 'edna.kanyoro@gmail.com',
      workplace: 'Barclays / Absa Bank',
      status: 'active'
    },
    {
      id: 'T-00431',
      tenant_no: 'T00431',
      full_name: 'Charles M Kithuka',
      first_name: 'Charles',
      last_name: 'M Kithuka',
      id_or_passport_no: '22910294',
      phone: '254729299091',
      email: '',
      workplace: 'Self Employed',
      status: 'exited'
    }
  ]

  const loadData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('tenant_no', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        setTenants(data)
      } else {
        setTenants(defaultTenants)
      }
    } catch (err) {
      console.error('Failed to load tenants:', err)
      setTenants(defaultTenants)
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

  const handleOpenCreateModal = () => {
    setEditingTenantId(null)
    const nextCode = 'T' + Math.floor(10000 + Math.random() * 90000)
    setFormData({
      ...initialFormState,
      tenant_no: nextCode
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (t) => {
    setEditingTenantId(t.id)
    setFormData({
      tenant_no: t.tenant_no || '',
      first_name: t.first_name || t.full_name?.split(' ')[0] || '',
      last_name: t.last_name || t.full_name?.split(' ').slice(1).join(' ') || '',
      id_or_passport_no: t.id_or_passport_no || '',
      phone: t.phone || '',
      email: t.email || '',
      postal_address: t.postal_address || '',
      postal_code: t.postal_code || '',
      workplace: t.workplace || '',
      work_contact: t.work_contact || '',
      next_of_kin_name: t.next_of_kin_name || '',
      next_of_kin_phone: t.next_of_kin_phone || '',
      next_of_kin_relation: t.next_of_kin_relation || '',
      status: t.status || 'active',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMsg('')

    try {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('First Name and Last Name are required.')
      }
      if (!formData.phone.trim()) {
        throw new Error('Primary Phone is required.')
      }

      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`
      const payload = {
        tenant_no: formData.tenant_no.trim() || ('T' + Math.floor(10000 + Math.random() * 90000)),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: fullName,
        id_or_passport_no: formData.id_or_passport_no.trim() || null,
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

      if (context) {
        payload.company_id = context.companyId
        payload.branch_id = context.branchId

        if (editingTenantId && !editingTenantId.toString().startsWith('T-')) {
          const { error } = await supabase
            .from('tenants')
            .update(payload)
            .eq('id', editingTenantId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('tenants')
            .insert([payload])
          if (error) throw error
        }
      }

      if (editingTenantId) {
        setTenants((prev) =>
          prev.map((t) => (t.id === editingTenantId ? { ...t, ...payload } : t))
        )
        setStatusMsg('Tenant updated successfully.')
      } else {
        const newRecord = { id: Date.now().toString(), ...payload }
        setTenants((prev) => [newRecord, ...prev])
        setStatusMsg('Tenant registered successfully.')
      }

      setShowModal(false)
      setFormData(initialFormState)
    } catch (err) {
      console.error(err)
      setStatusMsg('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tenant record?')) return
    try {
      if (context && !id.toString().startsWith('T-')) {
        await supabase.from('tenants').delete().eq('id', id)
      }
      setTenants((prev) => prev.filter((t) => t.id !== id))
      setStatusMsg('Tenant record removed.')
    } catch (err) {
      console.error(err)
      setStatusMsg('Error deleting tenant: ' + err.message)
    }
  }

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (t.tenant_no && t.tenant_no.toLowerCase().includes(q)) ||
      (t.full_name && t.full_name.toLowerCase().includes(q)) ||
      (t.first_name && t.first_name.toLowerCase().includes(q)) ||
      (t.last_name && t.last_name.toLowerCase().includes(q)) ||
      (t.id_or_passport_no && t.id_or_passport_no.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.workplace && t.workplace.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Registration Module ~ Tenant Directory Master
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              Authorized register of tenants, national identity records, and contact directory.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + Register Tenant
          </button>
        </div>

        {statusMsg && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-900 px-3 py-1 text-xs mb-3">
            {statusMsg}
          </div>
        )}

        <div className="p-3 bg-gray-50 border border-gray-300 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">Search:</span>
            <input
              type="text"
              placeholder="Search tenant no, name, ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-72"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="exited">Exited</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
            <button
              type="button"
              onClick={loadData}
              className="bg-orange-500 text-white rounded-none px-3 py-1 text-xs font-bold cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left w-12">#</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Tenant No</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Full Name</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">ID / Passport</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Phone</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Email</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Workplace</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t, idx) => (
                <tr key={t.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-gray-900">{t.tenant_no}</td>
                  <td className="py-1 px-2 font-medium">{t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim()}</td>
                  <td className="py-1 px-2 font-mono">{t.id_or_passport_no || '-'}</td>
                  <td className="py-1 px-2 font-mono">{t.phone}</td>
                  <td className="py-1 px-2">{t.email || '-'}</td>
                  <td className="py-1 px-2">{t.workplace || '-'}</td>
                  <td className="py-1 px-2 text-center font-mono text-[11px] uppercase">
                    {t.status === 'active' ? (
                      <span className="text-green-800 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-gray-600">{t.status.toUpperCase()}</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-center whitespace-nowrap">
                    <span
                      onClick={() => handleOpenEditModal(t)}
                      className="text-blue-700 underline cursor-pointer font-semibold mr-2"
                    >
                      Edit
                    </span>
                    <Link
                      to={`/statements?tenantId=${t.id}`}
                      className="text-gray-700 underline cursor-pointer font-semibold mr-2"
                    >
                      Statement
                    </Link>
                    <span
                      onClick={() => handleDeleteTenant(t.id)}
                      className="text-red-600 underline cursor-pointer font-semibold"
                    >
                      Delete
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-gray-800 p-6 max-w-2xl w-full text-xs font-sans">
            <div className="border-b border-gray-400 pb-2 mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                {editingTenantId ? 'Edit Tenant Information' : 'Register New Tenant Master'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tenant Code *</label>
                  <input
                    type="text"
                    name="tenant_no"
                    value={formData.tenant_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
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
                    name="id_or_passport_no"
                    value={formData.id_or_passport_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Mobile Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employer / Workplace</label>
                  <input
                    type="text"
                    name="workplace"
                    value={formData.workplace}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Work Telephone</label>
                  <input
                    type="text"
                    name="work_contact"
                    value={formData.work_contact}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="exited">Exited</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    name="next_of_kin_name"
                    value={formData.next_of_kin_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="text"
                    name="next_of_kin_phone"
                    value={formData.next_of_kin_phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    name="next_of_kin_relation"
                    value={formData.next_of_kin_relation}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Tenant'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-600 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
