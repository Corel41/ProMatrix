import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Properties() {
  const defaultProperties = [
    {
      id: 'p-73-188',
      property_code: '73/188',
      name: '73/188 LIBKEN BURUBURU',
      lr_number: 'NAIROBI/BLOCK 73/188',
      property_type: 'residential',
      city: 'Nairobi',
      zone: 'Buruburu Phase 1',
      owner_name: 'LIBKEN INVESTMENTS LTD',
      commission_rate: 7.5,
      total_floors: 3,
      status: 'active'
    },
    {
      id: 'p-390',
      property_code: '390 APARTMENTS',
      name: '390 APARTMENTS (RUIRU)',
      lr_number: 'RUIRU/BLOCK 2/390',
      property_type: 'residential',
      city: 'Ruiru',
      zone: 'Ruiru Town',
      owner_name: 'MARY NYAMBURA MUNE',
      commission_rate: 7.5,
      total_floors: 4,
      status: 'active'
    },
    {
      id: 'p-buru-michael',
      property_code: 'BURUBURU MICHAEL',
      name: 'BURUBURU MICHAEL ESTATE',
      lr_number: 'NAIROBI/BLOCK 73/MICHAEL',
      property_type: 'residential',
      city: 'Nairobi',
      zone: 'Buruburu Estate',
      owner_name: 'MICHAEL NDUNGU KANYORO',
      commission_rate: 7.5,
      total_floors: 2,
      status: 'active'
    },
    {
      id: 'p-217-buru',
      property_code: '217 BURU',
      name: '217 BURU - ANNA ANN',
      lr_number: 'NAIROBI/BLOCK 217/ANNA',
      property_type: 'residential',
      city: 'Nairobi',
      zone: 'Buruburu',
      owner_name: 'ANNA ANN',
      commission_rate: 7.5,
      total_floors: 2,
      status: 'active'
    }
  ]

  const [properties, setProperties] = useState(defaultProperties)
  const [landlordsList, setLandlordsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const initialFormState = {
    property_code: '',
    name: '',
    lr_number: '',
    property_type: 'residential',
    landlord_id: '',
    city: 'Nairobi',
    zone: '',
    commission_rate: 7.5,
    commission_type: 'percentage',
    is_vatable: true,
    remittance_day: 10,
    total_floors: 1,
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: landlordsData } = await supabase
        .from('landlords')
        .select('id, landlord_no, surname, other_names')
        .eq('company_id', tenant.companyId)

      setLandlordsList(landlordsData || [
        { id: 'l1', landlord_no: 'L035', surname: 'LIBKEN', other_names: 'INVESTMENTS' },
        { id: 'l2', landlord_no: 'L036', surname: 'MUNE', other_names: 'MARY' }
      ])

      const { data: propData, error: pError } = await supabase
        .from('properties')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      if (pError) throw pError
      if (propData && propData.length > 0) {
        const enriched = propData.map((p) => {
          const l = (landlordsData || []).find((x) => x.id === p.landlord_id)
          return {
            ...p,
            owner_name: l ? `${l.surname} ${l.other_names || ''}`.trim() : 'Beneficial Owner'
          }
        })
        setProperties(enriched)
      } else {
        setProperties(defaultProperties)
      }
    } catch (err) {
      console.error('Handled with default properties:', err)
      setProperties(defaultProperties)
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
    setStatusMsg('')

    try {
      if (!formData.name.trim() || !formData.property_code.trim()) {
        throw new Error('Property Code and Property Name are mandatory.')
      }

      const payload = {
        property_code: formData.property_code.trim().toUpperCase(),
        name: formData.name.trim(),
        lr_number: formData.lr_number.trim() || null,
        property_type: formData.property_type,
        landlord_id: formData.landlord_id || null,
        city: formData.city.trim() || 'Nairobi',
        zone: formData.zone.trim() || null,
        commission_rate: parseFloat(formData.commission_rate) || 7.5,
        commission_type: formData.commission_type,
        is_vatable: formData.is_vatable,
        remittance_day: parseInt(formData.remittance_day, 10) || 10,
        total_floors: parseInt(formData.total_floors, 10) || 1,
        status: formData.status,
      }

      if (context) {
        payload.company_id = context.companyId
        payload.branch_id = context.branchId
        await supabase.from('properties').insert([payload])
      }

      const landlord = landlordsList.find((l) => l.id === payload.landlord_id)
      const newRecord = {
        id: Date.now().toString(),
        ...payload,
        owner_name: landlord ? `${landlord.surname} ${landlord.other_names || ''}`.trim() : 'Landlord L035'
      }

      setProperties([newRecord, ...properties])
      setStatusMsg(`Property ${payload.property_code} registered successfully.`)
      setShowModal(false)
      setFormData(initialFormState)
    } catch (err) {
      console.error(err)
      setStatusMsg('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (p.property_code && p.property_code.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.lr_number && p.lr_number.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.owner_name && p.owner_name.toLowerCase().includes(q))

    const matchesType = typeFilter === 'all' || p.property_type === typeFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Registration Module ~ Property & Estate Master
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              Residential & commercial property register, LR titles, and commission schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...initialFormState,
                property_code: 'PROP-' + Math.floor(100 + Math.random() * 900)
              })
              setShowModal(true)
            }}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + Register Property
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
              placeholder="Search code, name, LR no, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-72"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
            >
              <option value="all">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="mixed_use">Mixed Use</option>
            </select>

            <span className="font-bold text-gray-700 ml-2">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Code</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Property Name</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">L.R. Number</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Beneficial Owner</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Type</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">City / Zone</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Commission %</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((p, idx) => (
                <tr key={p.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-gray-900">{p.property_code}</td>
                  <td className="py-1 px-2 font-medium">{p.name}</td>
                  <td className="py-1 px-2 font-mono">{p.lr_number || '-'}</td>
                  <td className="py-1 px-2">{p.owner_name}</td>
                  <td className="py-1 px-2 uppercase text-[11px] font-mono">{p.property_type}</td>
                  <td className="py-1 px-2">{p.city} {p.zone ? `(${p.zone})` : ''}</td>
                  <td className="py-1 px-2 text-right font-mono">{p.commission_rate || 7.5}%</td>
                  <td className="py-1 px-2 text-center font-mono text-[11px] uppercase">
                    {p.status === 'active' ? (
                      <span className="text-green-800 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-gray-600">{p.status.toUpperCase()}</span>
                    )}
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
                Register Property / Estate Entity
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Property Code *</label>
                  <input
                    type="text"
                    name="property_code"
                    value={formData.property_code}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">L.R. Number</label>
                  <input
                    type="text"
                    name="lr_number"
                    value={formData.lr_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Property Type</label>
                  <select
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed_use">Mixed Use</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Landlord / Owner</label>
                  <select
                    name="landlord_id"
                    value={formData.landlord_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="">-- Choose Owner --</option>
                    {landlordsList.map((l) => (
                      <option key={l.id} value={l.id}>{l.landlord_no} - {l.surname} {l.other_names || ''}</option>
                    ))}
                  </select>
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estate / Zone Location</label>
                  <input
                    type="text"
                    name="zone"
                    value={formData.zone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="commission_rate"
                    value={formData.commission_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Property'}
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
