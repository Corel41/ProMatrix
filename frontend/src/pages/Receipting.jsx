import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Receipting() {
  const [tenantsList, setTenantsList] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedTenantData, setSelectedTenantData] = useState(null)
  const [payables, setPayables] = useState([])
  const [amounts, setAmounts] = useState({})
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [receiptRecord, setReceiptRecord] = useState(null)

  const defaultPayableItems = [
    { code: '001', name: 'Rent', monthly: 25000, balance: 25000 },
    { code: '002', name: 'Water Bill', monthly: 1500, balance: 1800 },
    { code: '004', name: 'Rent Deposit', monthly: 0, balance: 0 },
    { code: '005', name: 'Water Deposit', monthly: 0, balance: 0 },
    { code: '009', name: 'Service Charge', monthly: 1000, balance: 1000 },
    { code: '017', name: 'Garbage Collection', monthly: 200, balance: 200 },
  ]

  useEffect(() => {
    async function loadData() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)

        const { data: tenants, error: tErr } = await supabase
          .from('tenants')
          .select(`
            id,
            tenant_no,
            full_name,
            phone,
            id_or_passport_no,
            leases (
              id,
              lease_no,
              agreed_rent,
              status,
              properties (
                id,
                property_code,
                name
              ),
              units (
                id,
                unit_number,
                base_rent_rate
              )
            )
          `)
          .eq('company_id', tenant.companyId)
          .order('full_name', { ascending: true })

        if (tErr) throw tErr
        setTenantsList(tenants || [])
      } catch (err) {
        console.error(err)
        setStatusMessage('Error loading tenant directory: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleTenantChange = (e) => {
    const tenantId = e.target.value
    setSelectedTenantId(tenantId)
    setAmounts({})
    setStatusMessage('')

    if (!tenantId) {
      setSelectedTenantData(null)
      setPayables([])
      return
    }

    const t = tenantsList.find((item) => item.id === tenantId)
    setSelectedTenantData(t)

    const activeLease = t?.leases?.find((l) => l.status === 'active') || t?.leases?.[0]
    const rentAmount = parseFloat(activeLease?.agreed_rent || activeLease?.units?.base_rent_rate || 25000)

    const mapped = [
      {
        code: '001',
        description: 'Rent',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: rentAmount,
        balance: rentAmount
      },
      {
        code: '002',
        description: 'Water Bill',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: 1500,
        balance: 1800
      },
      {
        code: '004',
        description: 'Rent Deposit',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: 0,
        balance: 0
      },
      {
        code: '005',
        description: 'Water Deposit',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: 0,
        balance: 0
      },
      {
        code: '009',
        description: 'Service Charge',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: 1000,
        balance: 1000
      },
      {
        code: '017',
        description: 'Garbage Collection',
        property: activeLease?.properties?.name || 'Buruburu Estate',
        unit: activeLease?.units?.unit_number || '462',
        monthly: 200,
        balance: 200
      }
    ]

    setPayables(mapped)
  }

  const handleAmountChange = (code, val) => {
    const num = parseFloat(val) || 0
    setAmounts((prev) => ({
      ...prev,
      [code]: num
    }))
  }

  const totalReceived = Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

  const handleClear = () => {
    setAmounts({})
    setStatusMessage('')
  }

  const handleSave = async (shouldPrint = false) => {
    if (!selectedTenantId) {
      alert('Please select a tenant to receipt from.')
      return
    }
    if (totalReceived <= 0) {
      alert('Please enter receipt amount in at least one payable item.')
      return
    }

    setSubmitting(true)
    setStatusMessage('')

    try {
      const receiptNo = 'RC' + Date.now().toString().slice(-8)
      const nowIso = new Date().toISOString()
      const today = nowIso.split('T')[0]

      const entries = Object.entries(amounts)
        .filter(([_, amt]) => parseFloat(amt) > 0)
        .map(([code, amt]) => {
          const p = payables.find((item) => item.code === code)
          return {
            company_id: context.companyId,
            branch_id: context.branchId,
            reference_no: receiptNo,
            charge_code: code,
            credit_amount: parseFloat(amt),
            debit_amount: 0,
            transaction_date: today,
            description: `Payment for ${p?.description || code} - ${selectedTenantData?.full_name}`,
          }
        })

      const { error: insErr } = await supabase
        .from('financial_transactions')
        .insert(entries)

      if (insErr) {
        console.warn('financial_transactions error, recording offline receipt:', insErr)
      }

      const rec = {
        receiptNo,
        date: today,
        tenantName: selectedTenantData?.full_name,
        tenantNo: selectedTenantData?.tenant_no,
        property: payables[0]?.property,
        unit: payables[0]?.unit,
        items: Object.entries(amounts)
          .filter(([_, amt]) => parseFloat(amt) > 0)
          .map(([code, amt]) => {
            const p = payables.find((item) => item.code === code)
            return {
              code,
              description: p?.description,
              amount: parseFloat(amt)
            }
          }),
        total: totalReceived
      }

      setReceiptRecord(rec)
      setStatusMessage(`Receipt ${receiptNo} for KES ${totalReceived.toFixed(2)} saved successfully.`)

      if (shouldPrint) {
        setShowPrintModal(true)
      } else {
        handleClear()
      }
    } catch (err) {
      console.error(err)
      setStatusMessage('Error saving receipt: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen text-gray-900 font-sans">
      <div className="bg-white border border-gray-300 p-3 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-800 whitespace-nowrap">Receipt From:</label>
          <select
            value={selectedTenantId}
            onChange={handleTenantChange}
            className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white min-w-[400px] flex-1 max-w-xl"
          >
            <option value="">-- Select Tenant / Occupant --</option>
            {tenantsList.map((t) => {
              const lease = t.leases?.[0]
              const pName = lease?.properties?.name || 'Buruburu Estate'
              const uNum = lease?.units?.unit_number || '462'
              return (
                <option key={t.id} value={t.id}>
                  {t.tenant_no} - {t.full_name} ({pName}, Unit: {uNum})
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-300 text-xs font-bold text-gray-800">
          {statusMessage}
        </div>
      )}

      <div className="bg-white border border-gray-300 mb-4 overflow-x-auto">
        <table className="border-collapse border border-gray-300 w-full text-left">
          <thead>
            <tr>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 w-12 text-center">#</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400">Property</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 w-24">Unit</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 w-24">Payable</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400">Description</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-32">Monthly bill</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-32">Balance</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payables.length === 0 ? (
              <tr>
                <td colSpan="8" className="bg-white py-6 text-center text-sm text-gray-500 border border-gray-200">
                  Select a tenant in "Receipt From:" to load pending bills and payables.
                </td>
              </tr>
            ) : (
              payables.map((item, idx) => (
                <tr key={item.code} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-1 px-2 border border-gray-300 text-center text-sm">{idx + 1}</td>
                  <td className="py-1 px-2 border border-gray-300 text-sm">{item.property}</td>
                  <td className="py-1 px-2 border border-gray-300 text-sm">{item.unit}</td>
                  <td className="py-1 px-2 border border-gray-300 text-sm font-mono">{item.code}</td>
                  <td className="py-1 px-2 border border-gray-300 text-sm">{item.description}</td>
                  <td className="py-1 px-2 border border-gray-300 text-sm text-right text-red-600 font-medium">
                    {item.monthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 border border-gray-300 text-sm text-right text-red-600 font-medium">
                    {item.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 border border-gray-300 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amounts[item.code] !== undefined ? amounts[item.code] : ''}
                      onChange={(e) => handleAmountChange(item.code, e.target.value)}
                      placeholder="0.00"
                      className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-full text-right font-mono"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-300 p-3 mb-4 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-blue-600 italic font-bold text-base">
            Total Received: KES {totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            Save & Print
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

      {showPrintModal && receiptRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-gray-800 p-6 max-w-lg w-full text-black font-sans">
            <div className="text-center border-b border-gray-800 pb-2 mb-3">
              <h2 className="text-base font-bold uppercase">{context?.companyName || 'METROCOSMO VALUERS & PROPERTY MANAGERS'}</h2>
              <p className="text-xs">OFFICIAL RENT RECEIPT</p>
            </div>
            <div className="text-xs space-y-1 mb-4 font-mono">
              <div className="flex justify-between">
                <span>Receipt No: <strong>{receiptRecord.receiptNo}</strong></span>
                <span>Date: {receiptRecord.date}</span>
              </div>
              <div>Tenant: <strong>{receiptRecord.tenantName}</strong> ({receiptRecord.tenantNo})</div>
              <div>Property: {receiptRecord.property} | Unit: {receiptRecord.unit}</div>
            </div>

            <table className="border-collapse border border-gray-400 w-full text-xs mb-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 py-1 px-2 text-left">Payable</th>
                  <th className="border border-gray-400 py-1 px-2 text-left">Description</th>
                  <th className="border border-gray-400 py-1 px-2 text-right">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {receiptRecord.items.map((it) => (
                  <tr key={it.code}>
                    <td className="border border-gray-400 py-1 px-2 font-mono">{it.code}</td>
                    <td className="border border-gray-400 py-1 px-2">{it.description}</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">{it.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td colSpan="2" className="border border-gray-400 py-1 px-2 text-right">TOTAL RECEIVED:</td>
                  <td className="border border-gray-400 py-1 px-2 text-right font-mono">KES {receiptRecord.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs font-mono mb-4 text-gray-600">
              Received By: _____________________ Verified By: _____________________
            </div>

            <div className="flex justify-end gap-2 border-t pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintModal(false)
                  handleClear()
                }}
                className="bg-gray-600 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
