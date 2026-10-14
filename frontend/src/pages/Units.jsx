import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Units() {
  const defaultUnits = [
    {
      id: 'u-462',
      unit_number: 'E4 [Unit 462]',
      property_code: '390 APARTMENTS',
      property_name: '390 APARTMENTS (RUIRU)',
      unit_category: '1B',
      unit_type: 'residential',
      floor_level: '4th Floor',
      base_rent_rate: 25000,
      rent_deposit_rate: 17300,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'occupied',
    },
    {
      id: 'u-512',
      unit_number: 'BS 1',
      property_code: '73/188',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_category: 'BD',
      unit_type: 'residential',
      floor_level: 'Ground Floor',
      base_rent_rate: 13000,
      rent_deposit_rate: 13000,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'occupied',
    },
    {
      id: 'u-530',
      unit_number: 'BS 2',
      property_code: '73/188',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_category: 'BD',
      unit_type: 'residential',
      floor_level: 'Ground Floor',
      base_rent_rate: 13000,
      rent_deposit_rate: 13000,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'occupied',
    },
    {
      id: 'u-521',
      unit_number: 'BS 3',
      property_code: '73/188',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_category: 'BD',
      unit_type: 'residential',
      floor_level: 'Ground Floor',
      base_rent_rate: 13000,
      rent_deposit_rate: 6000,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'occupied',
    },
    {
      id: 'u-188',
      unit_number: 'Unit 1',
      property_code: 'BURUBURU MICHAEL',
      property_name: 'BURUBURU MICHAEL ESTATE',
      unit_category: '2B',
      unit_type: 'residential',
      floor_level: '1st Floor',
      base_rent_rate: 30000,
      rent_deposit_rate: 40500,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'occupied',
    },
    {
      id: 'u-829',
      unit_number: 'Unit 6',
      property_code: '217 BURU',
      property_name: '217 BURU - ANNA ANN',
      unit_category: '1B',
      unit_type: 'residential',
      floor_level: 'Ground Floor',
      base_rent_rate: 15000,
      rent_deposit_rate: 15000,
      water_deposit_rate: 2500,
      electricity_deposit_rate: 0,
      status: 'vacant',
    }
  ]

  const [units, setUnits] = useState(defaultUnits)
  const [propertiesList, setPropertiesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

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
    garbage_fee_rate: '200.00',
    status: 'vacant',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: propData } = await supabase
        .from('properties')
        .select('id, property_code, name')
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      setPropertiesList(propData || [
        { id: 'p1', property_code: '73/188', name: '73/188 LIBKEN BURUBURU' },
        { id: 'p2', property_code: '390 APARTMENTS', name: '390 APARTMENTS (RUIRU)' },
        { id: 'p3', property_code: 'BURUBURU MICHAEL', name: 'BURUBURU MICHAEL ESTATE' },
        { id: 'p4', property_code: '217 BURU', name: '217 BURU - ANNA ANN' },
      ])

      const { data: unitsData, error: uError } = await supabase
        .from('units')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('unit_number', { ascending: true })

      if (uError) throw uError
      if (unitsData && unitsData.length > 0) {
        const enriched = unitsData.map((u) => {
          const p = (propData || []).find((x) => x.id === u.property_id)
          return {
            ...u,
            property_code: p?.property_code || 'PROP',
            property_name: p?.name || 'Property',
          }
        })
        setUnits(enriched)
      } else {
        setUnits(defaultUnits)
      }
    } catch (err) {
      console.error('Handled with default units:', err)
      setUnits(defaultUnits)
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

    if (name === 'base_rent_rate' && !formData.rent_deposit_rate) {
      setFormData((prev) => ({ ...prev, rent_deposit_rate: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMsg('')

    try {
      if (!formData.unit_number.trim() || !formData.base_rent_rate) {
        throw new Error('Unit Number and Base Rent Rate are mandatory.')
      }

      const payload = {
        property_id: formData.property_id || propertiesList[0]?.id,
        unit_number: formData.unit_number.trim().toUpperCase(),
        unit_category: formData.unit_category,
        unit_type: formData.unit_type,
        floor_level: formData.floor_level,
        base_rent_rate: parseFloat(formData.base_rent_rate) || 0,
        rent_deposit_rate: parseFloat(formData.rent_deposit_rate) || 0,
        water_deposit_rate: parseFloat(formData.water_deposit_rate) || 0,
        electricity_deposit_rate: parseFloat(formData.electricity_deposit_rate) || 0,
        service_charge_rate: parseFloat(formData.service_charge_rate) || 0,
        garbage_fee_rate: parseFloat(formData.garbage_fee_rate) || 0,
        status: formData.status,
      }

      if (context) {
        payload.company_id = context.companyId
        payload.branch_id = context.branchId
        await supabase.from('units').insert([payload])
      }

      const prop = propertiesList.find((p) => p.id === payload.property_id)
      const newRecord = {
        id: Date.now().toString(),
        ...payload,
        property_code: prop?.property_code || 'PROP',
        property_name: prop?.name || 'Property',
      }

      setUnits([newRecord, ...units])
      setStatusMsg(`Unit ${payload.unit_number} added successfully.`)
      setShowModal(false)
      setFormData(initialFormState)
    } catch (err) {
      console.error(err)
      setStatusMsg('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUnits = units.filter((u) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (u.unit_number && u.unit_number.toLowerCase().includes(q)) ||
      (u.property_name && u.property_name.toLowerCase().includes(q)) ||
      (u.property_code && u.property_code.toLowerCase().includes(q))

    const matchesProp = propertyFilter === 'all' || u.property_id === propertyFilter || u.property_code === propertyFilter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter
    return matchesSearch && matchesProp && matchesStatus
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Registration Module ~ Physical Units Inventory
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              Unit categorization, base rental rates, security deposit expectations, and occupancy registers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData(initialFormState)
              setShowModal(true)
            }}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + Register Unit
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
              placeholder="Search unit no, property name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-72"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">Filter Property:</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
            >
              <option value="all">All Properties</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.property_code}>{p.name}</option>
              ))}
            </select>

            <span className="font-bold text-gray-700 ml-2">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
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
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Unit Number</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Property</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Category</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Floor Level</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Base Rent (KES)</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Rent Deposit</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Water Deposit</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Occupancy Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((u, idx) => (
                <tr key={u.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-gray-900">{u.unit_number}</td>
                  <td className="py-1 px-2">{u.property_name}</td>
                  <td className="py-1 px-2 font-mono uppercase">{u.unit_category}</td>
                  <td className="py-1 px-2">{u.floor_level}</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(u.base_rent_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(u.rent_deposit_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(u.water_deposit_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-center font-mono text-[11px] uppercase">
                    {u.status === 'occupied' ? (
                      <span className="text-green-800 font-bold">OCCUPIED</span>
                    ) : (
                      <span className="text-orange-700 font-bold">VACANT</span>
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
                Register Physical Rental Unit
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Property *</label>
                  <select
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="">-- Choose Property --</option>
                    {propertiesList.map((p) => (
                      <option key={p.id} value={p.id}>{p.property_code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Number / Code *</label>
                  <input
                    type="text"
                    name="unit_number"
                    value={formData.unit_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Category</label>
                  <select
                    name="unit_category"
                    value={formData.unit_category}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="BD">Bedsitter (BD)</option>
                    <option value="1B">1 Bedroom (1B)</option>
                    <option value="2B">2 Bedroom (2B)</option>
                    <option value="3B">3 Bedroom (3B)</option>
                    <option value="SH">Commercial Shop (SH)</option>
                    <option value="OF">Office Suite (OF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Floor Level</label>
                  <select
                    name="floor_level"
                    value={formData.floor_level}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="4th Floor">4th Floor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Base Monthly Rent (KES) *</label>
                  <input
                    type="number"
                    name="base_rent_rate"
                    value={formData.base_rent_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rent Deposit (KES)</label>
                  <input
                    type="number"
                    name="rent_deposit_rate"
                    value={formData.rent_deposit_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Water Deposit (KES)</label>
                  <input
                    type="number"
                    name="water_deposit_rate"
                    value={formData.water_deposit_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Garbage Fee (Monthly)</label>
                  <input
                    type="number"
                    name="garbage_fee_rate"
                    value={formData.garbage_fee_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Occupancy Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Unit'}
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
