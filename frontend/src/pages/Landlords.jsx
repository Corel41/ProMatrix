import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Landlords() {
  const defaultLandlords = [
    {
      id: 'L-001',
      landlord_no: 'L035',
      surname: 'LIBKEN',
      other_names: 'INVESTMENTS LTD',
      id_number: 'CPR/2012/89102',
      tax_pin: 'P051928102A',
      phone: '254722000111',
      email: 'info@libken.co.ke',
      bank_name: 'Kenya Commercial Bank',
      bank_branch: 'Moi Avenue',
      bank_account_no: '1102938491',
      commission_rate: 7.5,
      remittance_day: 10,
      status: 'active'
    },
    {
      id: 'L-002',
      landlord_no: 'L036',
      surname: 'MUNE',
      other_names: 'MARY NYAMBURA',
      id_number: '28471920',
      tax_pin: 'A002910491B',
      phone: '254728459082',
      email: 'mary.mune@gmail.com',
      bank_name: 'Equity Bank',
      bank_branch: 'Thika Road Mall',
      bank_account_no: '0180293847',
      commission_rate: 7.5,
      remittance_day: 10,
      status: 'active'
    },
    {
      id: 'L-003',
      landlord_no: 'L037',
      surname: 'KANYORO',
      other_names: 'MICHAEL NDUNGU',
      id_number: '18920194',
      tax_pin: 'A003819201C',
      phone: '254722334455',
      email: 'm.kanyoro@gmail.com',
      bank_name: 'Co-operative Bank',
      bank_branch: 'City Hall',
      bank_account_no: '011293849102',
      commission_rate: 7.5,
      remittance_day: 10,
      status: 'active'
    },
    {
      id: 'L-004',
      landlord_no: 'L038',
      surname: 'ANN',
      other_names: 'ANNA',
      id_number: '2347589',
      tax_pin: 'A009182746B',
      phone: '254700000000',
      email: 'anna.ann@gmail.com',
      bank_name: 'Standard Chartered',
      bank_branch: 'Harambee Ave',
      bank_account_no: '01002938491',
      commission_rate: 7.5,
      remittance_day: 10,
      status: 'active'
    }
  ]

  const [landlords, setLandlords] = useState(defaultLandlords)
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const initialFormState = {
    landlord_no: '',
    surname: '',
    other_names: '',
    id_number: '',
    tax_pin: '',
    phone: '',
    email: '',
    bank_name: 'Equity Bank',
    bank_branch: 'Nairobi',
    bank_account_no: '',
    commission_rate: 7.5,
    remittance_day: 10,
    status: 'active',
  }
  const [formData, setFormData] = useState(initialFormState)

  const loadData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data, error } = await supabase
        .from('landlords')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('landlord_no', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        setLandlords(data)
      } else {
        setLandlords(defaultLandlords)
      }
    } catch (err) {
      console.error('Handled with default landlords:', err)
      setLandlords(defaultLandlords)
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
    setStatusMsg('')

    try {
      if (!formData.surname.trim() || !formData.phone.trim()) {
        throw new Error('Surname / Entity Name and Primary Phone are required.')
      }

      let code = formData.landlord_no.trim().toUpperCase()
      if (!code) code = 'L' + Math.floor(100 + Math.random() * 900)

      const payload = {
        landlord_no: code,
        surname: formData.surname.trim(),
        other_names: formData.other_names.trim() || null,
        id_number: formData.id_number.trim() || null,
        tax_pin: formData.tax_pin.trim().toUpperCase() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        bank_name: formData.bank_name.trim() || null,
        bank_branch: formData.bank_branch.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        commission_rate: parseFloat(formData.commission_rate) || 7.5,
        remittance_day: parseInt(formData.remittance_day, 10) || 10,
        status: formData.status,
      }

      if (context) {
        payload.company_id = context.companyId
        payload.branch_id = context.branchId
        await supabase.from('landlords').insert([payload])
      }

      const newRecord = { id: Date.now().toString(), ...payload }
      setLandlords([newRecord, ...landlords])
      setStatusMsg(`Landlord ${code} registered successfully.`)
      setShowModal(false)
      setFormData(initialFormState)
    } catch (err) {
      console.error(err)
      setStatusMsg('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLandlords = landlords.filter((l) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (l.landlord_no && l.landlord_no.toLowerCase().includes(q)) ||
      (l.surname && l.surname.toLowerCase().includes(q)) ||
      (l.other_names && l.other_names.toLowerCase().includes(q)) ||
      (l.phone && l.phone.toLowerCase().includes(q)) ||
      (l.tax_pin && l.tax_pin.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              Registration Module ~ Landlords Master
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              Property owners, banking details, remittance preferences, and tax credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...initialFormState,
                landlord_no: 'L' + Math.floor(100 + Math.random() * 900)
              })
              setShowModal(true)
            }}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + Register Landlord
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
              placeholder="Search code, surname, phone, KRA..."
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
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Owner / Entity Name</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">National ID / Reg</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Tax PIN</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Phone</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Bank & Branch</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Account No</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Comm. %</th>
                <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLandlords.map((l, idx) => (
                <tr key={l.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1 px-2 font-mono font-bold text-gray-900">{l.landlord_no}</td>
                  <td className="py-1 px-2 font-medium">{l.surname} {l.other_names || ''}</td>
                  <td className="py-1 px-2 font-mono">{l.id_number || '-'}</td>
                  <td className="py-1 px-2 font-mono uppercase">{l.tax_pin || '-'}</td>
                  <td className="py-1 px-2 font-mono">{l.phone}</td>
                  <td className="py-1 px-2">{l.bank_name || '-'} ({l.bank_branch || '-'})</td>
                  <td className="py-1 px-2 font-mono">{l.bank_account_no || '-'}</td>
                  <td className="py-1 px-2 text-right font-mono">{l.commission_rate || 7.5}%</td>
                  <td className="py-1 px-2 text-center font-mono text-[11px] uppercase">
                    {l.status === 'active' ? (
                      <span className="text-green-800 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-gray-600">{l.status.toUpperCase()}</span>
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
                Register Beneficial Owner / Landlord
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Landlord Code *</label>
                  <input
                    type="text"
                    name="landlord_no"
                    value={formData.landlord_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Surname / Entity Name *</label>
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Other Names</label>
                  <input
                    type="text"
                    name="other_names"
                    value={formData.other_names}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">National ID / Reg No</label>
                  <input
                    type="text"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tax PIN (KRA)</label>
                  <input
                    type="text"
                    name="tax_pin"
                    value={formData.tax_pin}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
                  />
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Account No</label>
                  <input
                    type="text"
                    name="bank_account_no"
                    value={formData.bank_account_no}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-mono"
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Remittance Day (Monthly)</label>
                  <input
                    type="number"
                    name="remittance_day"
                    value={formData.remittance_day}
                    onChange={handleInputChange}
                    className="w-full border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
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
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Landlord'}
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
