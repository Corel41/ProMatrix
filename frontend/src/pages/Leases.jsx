import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Leases() {
  const [leases, setLeases] = useState([])
  const [propertiesList, setPropertiesList] = useState([])
  const [unitsList, setUnitsList] = useState([])
  const [tenantsList, setTenantsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const initialFormState = {
    property_id: '',
    unit_id: '',
    tenant_id: '',
    lease_no: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    rent_pay_day: 5,
    agreed_rent: '',
    rent_deposit_held: '',
    water_deposit_held: '2500',
    elec_deposit_held: '0',
    service_charge_agreed: '0',
    garbage_fee_agreed: '200',
    escalation_rate: '10',
    escalation_period_months: 12,
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const defaultLeases = [
    {
      id: 'L-001',
      lease_no: 'LS-2026-462',
      property_name: '390 APARTMENTS (RUIRU)',
      unit_number: 'E4 [Unit 462]',
      tenant_name: 'Mary Nyambura Mune',
      tenant_no: 'T13101',
      agreed_rent: 25000,
      rent_deposit_held: 17300,
      water_deposit_held: 2500,
      start_date: '2025-11-10',
      status: 'active'
    },
    {
      id: 'L-002',
      lease_no: 'LS-2024-512',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 1',
      tenant_name: 'John Kennedy Methu',
      tenant_no: 'T11879',
      agreed_rent: 13000,
      rent_deposit_held: 13000,
      water_deposit_held: 2500,
      start_date: '2024-08-09',
      status: 'active'
    },
    {
      id: 'L-003',
      lease_no: 'LS-2025-530',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 2',
      tenant_name: 'Prisca Achieng',
      tenant_no: 'T14126',
      agreed_rent: 13000,
      rent_deposit_held: 13000,
      water_deposit_held: 2500,
      start_date: '2025-12-16',
      status: 'active'
    },
    {
      id: 'L-004',
      lease_no: 'LS-2024-521',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 3',
      tenant_name: 'Harsal Aisha Njeri',
      tenant_no: 'T11933',
      agreed_rent: 13000,
      rent_deposit_held: 6000,
      water_deposit_held: 2500,
      start_date: '2024-10-09',
      status: 'active'
    },
    {
      id: 'L-005',
      lease_no: 'LS-2026-188',
      property_name: 'BURUBURU MICHAEL ESTATE',
      unit_number: 'Unit 1',
      tenant_name: 'Edna Muthoni Kanyoro',
      tenant_no: 'T19217',
      agreed_rent: 30000,
      rent_deposit_held: 40500,
      water_deposit_held: 2500,
      start_date: '2026-07-28',
      status: 'active'
    },
    {
      id: 'L-006',
      lease_no: 'LS-2024-830',
      property_name: '217 BURU - ANNA ANN',
      unit_number: 'Unit 2',
      tenant_name: 'Yy Tenant',
      tenant_no: 'T09815',
      agreed_rent: 15000,
      rent_deposit_held: 15000,
      water_deposit_held: 2500,
      start_date: '2024-04-13',
      status: 'active'
    }
  ]

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
      ])

      const { data: allUnitsData } = await supabase
        .from('units')
        .select('id, property_id, unit_number, base_rent_rate, rent_deposit_rate, status')
        .eq('company_id', tenant.companyId)

      setUnitsList(allUnitsData || [
        { id: 'u1', property_id: 'p1', unit_number: 'BS 1', base_rent_rate: 13000 },
        { id: 'u2', property_id: 'p1', unit_number: 'BS 2', base_rent_rate: 13000 },
        { id: 'u3', property_id: 'p2', unit_number: 'E4 [Unit 462]', base_rent_rate: 25000 },
      ])

      const { data: tData } = await supabase
        .from('tenants')
        .select('id, tenant_no, full_name, phone')
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')

      setTenantsList(tData || [
        { id: 't1', tenant_no: 'T13101', full_name: 'Mary Nyambura Mune', phone: '254728459082' },
        { id: 't2', tenant_no: 'T11879', full_name: 'John Kennedy Methu', phone: '254759265199' },
      ])

      const { data: leasesData, error: lErr } = await supabase
        .from('leases')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('start_date', { ascending: false })

      if (lErr) throw lErr

      if (leasesData && leasesData.length > 0) {
        const enriched = leasesData.map((l) => {
          const prop = (propData || []).find((p) => p.id === l.property_id)
          const unit = (allUnitsData || []).find((u) => u.id === l.unit_id)
          const t = (tData || []).find((x) => x.id === l.tenant_id)

          return {
            ...l,
            property_name: prop?.name || 'Property',
            unit_number: unit?.unit_number || 'Unit',
            tenant_name: t?.full_name || 'Tenant',
            tenant_no: t?.tenant_no || '-',
          }
        })
        setLeases(enriched)
      } else {
        setLeases(defaultLeases)
      }
    } catch (err) {
      console.error('Failed to load leases:', err)
      setLeases(defaultLeases)
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

    if (name === 'unit_id') {
      const selectedUnit = unitsList.find((u) => u.id === value)
      if (selectedUnit) {
        setFormData((prev) => ({
          ...prev,
          agreed_rent: selectedUnit.base_rent_rate || '',
          rent_deposit_held: selectedUnit.base_rent_rate || '',
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMsg('')

    try {
      if (!formData.agreed_rent || parseFloat(formData.agreed_rent) <= 0) {
        throw new Error('Valid agreed monthly rent is mandatory.')
      }

      let leaseNumber = formData.lease_no.trim().toUpperCase()
      if (!leaseNumber) {
        leaseNumber = `LS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
      }

      const payload = {
        lease_no: leaseNumber,
        property_id: formData.property_id || propertiesList[0]?.id,
        unit_id: formData.unit_id || unitsList[0]?.id,
        tenant_id: formData.tenant_id || tenantsList[0]?.id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        rent_pay_day: parseInt(formData.rent_pay_day, 10) || 5,
        agreed_rent: parseFloat(formData.agreed_rent) || 0,
        rent_deposit_held: parseFloat(formData.rent_deposit_held) || 0,
        water_deposit_held: parseFloat(formData.water_deposit_held) || 0,
        elec_deposit_held: parseFloat(formData.elec_deposit_held) || 0,
        service_charge_agreed: parseFloat(formData.service_charge_agreed) || 0,
        garbage_fee_agreed: parseFloat(formData.garbage_fee_agreed) || 0,
        escalation_rate: parseFloat(formData.escalation_rate) || 0,
        status: formData.status,
      }

      if (context) {
        payload.company_id = context.companyId
        payload.branch_id = context.branchId

        await supabase.from('leases').insert([payload])
      }

      const prop = propertiesList.find((p) => p.id === payload.property_id)
      const unit = unitsList.find((u) => u.id === payload.unit_id)
      const t = tenantsList.find((x) => x.id === payload.tenant_id)

      const newRecord = {
        id: Date.now().toString(),
        ...payload,
        property_name: prop?.name || 'Buruburu Estate',
        unit_number: unit?.unit_number || 'Unit',
        tenant_name: t?.full_name || 'Tenant',
        tenant_no: t?.tenant_no || '-',
      }

      setLeases([newRecord, ...leases])
      setStatusMsg(`Lease contract ${leaseNumber} executed successfully!`)
      setShowModal(false)
      setFormData(initialFormState)
    } catch (err) {
      console.error(err)
      setStatusMsg('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLeases = leases.filter((l) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (l.lease_no && l.lease_no.toLowerCase().includes(q)) ||
      (l.property_name && l.property_name.toLowerCase().includes(q)) ||
      (l.unit_number && l.unit_number.toLowerCase().includes(q)) ||
      (l.tenant_name && l.tenant_name.toLowerCase().includes(q)) ||
      (l.tenant_no && l.tenant_no.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Tenants Account ~ Lease Contracts & Agreements Master
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              Authorized contractual bindings linking tenants to physical units with agreed monthly payables.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...initialFormState,
                lease_no: `LS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
              })
              setShowModal(true)
            }}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + Create New Lease
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
              placeholder="Search lease no, property, unit, tenant..."
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
              <option value="terminated">Terminated</option>
              <option value="expired">Expired</option>
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
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Lease No</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Property</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Unit</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Tenant Name</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Agreed Rent (KES)</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Rent Deposit</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Water Dep.</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Start Date</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeases.map((l, idx) => (
                <tr key={l.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-gray-900">{l.lease_no}</td>
                  <td className="py-1 px-2">{l.property_name}</td>
                  <td className="py-1 px-2 font-mono">{l.unit_number}</td>
                  <td className="py-1 px-2 font-medium">{l.tenant_name}</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(l.agreed_rent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(l.rent_deposit_held).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {Number(l.water_deposit_held || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-center font-mono">{l.start_date}</td>
                  <td className="py-1 px-2 text-center font-mono text-[11px] uppercase">
                    {l.status === 'active' ? (
                      <span className="text-green-800 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-gray-600">{l.status.toUpperCase()}</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-center">
                    <span
                      onClick={() => setStatusMsg(`Lease ${l.lease_no} agreement printed.`)}
                      className="text-blue-700 underline cursor-pointer font-semibold mr-2"
                    >
                      Print
                    </span>
                    <span
                      onClick={() => {
                        if (window.confirm(`Terminate lease ${l.lease_no}?`)) {
                          setLeases(leases.map((x) => x.id === l.id ? { ...x, status: 'terminated' } : x))
                          setStatusMsg(`Lease ${l.lease_no} marked as terminated.`)
                        }
                      }}
                      className="text-red-600 underline cursor-pointer font-semibold"
                    >
                      Terminate
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
                Execute New Tenancy Lease Contract
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lease Number *</label>
                  <input
                    type="text"
                    name="lease_no"
                    value={formData.lease_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Unit *</label>
                  <select
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="">-- Choose Unit --</option>
                    {unitsList.map((u) => (
                      <option key={u.id} value={u.id}>{u.unit_number} (KES {u.base_rent_rate})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Tenant *</label>
                  <select
                    name="tenant_id"
                    value={formData.tenant_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenantsList.map((t) => (
                      <option key={t.id} value={t.id}>[{t.tenant_no}] {t.full_name} ({t.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commencement Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Agreed Monthly Rent (KES) *</label>
                  <input
                    type="number"
                    name="agreed_rent"
                    value={formData.agreed_rent}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rent Deposit Held (KES)</label>
                  <input
                    type="number"
                    name="rent_deposit_held"
                    value={formData.rent_deposit_held}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Water Deposit Held (KES)</label>
                  <input
                    type="number"
                    name="water_deposit_held"
                    value={formData.water_deposit_held}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rent Due Day (Monthly)</label>
                  <input
                    type="number"
                    name="rent_pay_day"
                    value={formData.rent_pay_day}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Escalation (%)</label>
                  <input
                    type="number"
                    name="escalation_rate"
                    value={formData.escalation_rate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lease Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Deposit</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {submitting ? 'Executing...' : 'Execute Lease Contract'}
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
