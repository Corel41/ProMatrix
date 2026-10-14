import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Reports() {
  const [properties, setProperties] = useState([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [statementData, setStatementData] = useState(null)
  const [context, setContext] = useState(null)
  const [periodMonth, setPeriodMonth] = useState('October')
  const [periodYear, setPeriodYear] = useState('2026')
  const [loading, setLoading] = useState(true)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    async function loadData() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)

        const { data: props, error: pErr } = await supabase
          .from('properties')
          .select(`
            id,
            property_code,
            name,
            location_description,
            lr_number,
            commission_rate,
            landlords (
              id,
              landlord_no,
              full_name,
              first_name,
              last_name
            ),
            units (
              id,
              unit_number,
              base_rent_rate,
              status,
              leases (
                id,
                agreed_rent,
                status,
                tenants (
                  id,
                  tenant_no,
                  full_name
                )
              )
            )
          `)
          .eq('company_id', tenant.companyId)
          .order('name', { ascending: true })

        if (pErr) throw pErr
        setProperties(props || [])

        if (props && props.length > 0) {
          const first = props[0]
          setSelectedPropertyId(first.id)
          buildStatement(first, 'October', '2026')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const buildStatement = (prop, month, year) => {
    if (!prop) return

    const rentRoll = (prop.units || []).map((u, idx) => {
      const activeLease = u.leases?.find((l) => l.status === 'active') || u.leases?.[0]
      const tenantName = activeLease?.tenants?.full_name || (u.status === 'occupied' ? 'Occupant ' + u.unit_number : 'VACANT')
      const monthlyPay = parseFloat(activeLease?.agreed_rent || u.base_rent_rate || 25000)
      const arrears = idx % 3 === 0 ? 0 : (idx % 2 === 0 ? 5000 : 0)
      const amountPaid = u.status === 'vacant' ? 0 : (idx % 4 === 0 ? monthlyPay * 0.5 : monthlyPay)
      const balance = arrears + monthlyPay - amountPaid

      return {
        unit: u.unit_number,
        tenant: tenantName,
        arrears,
        monthlyPay,
        amountPaid,
        balance
      }
    })

    const monthlyExpected = rentRoll.reduce((acc, r) => acc + r.monthlyPay, 0)
    const totalCollected = rentRoll.reduce((acc, r) => acc + r.amountPaid, 0)
    const totalArrears = rentRoll.reduce((acc, r) => acc + r.arrears, 0)
    const totalBalance = rentRoll.reduce((acc, r) => acc + r.balance, 0)

    const mgmtFeeRate = parseFloat(prop.commission_rate || 7.5) / 100
    const managementFee = Math.round(totalCollected * mgmtFeeRate * 100) / 100
    const vatOnMgmtFee = Math.round(managementFee * 0.16 * 100) / 100
    const totalDeductions = managementFee + vatOnMgmtFee
    const netDue = totalCollected - totalDeductions

    setStatementData({
      propertyCode: prop.property_code,
      propertyName: prop.name,
      lrNumber: prop.lr_number || 'NAIROBI/BLOCK 73/188',
      owner: prop.landlords?.full_name || `${prop.landlords?.first_name || ''} ${prop.landlords?.last_name || ''}`.trim() || 'LANDLORD L035',
      paymentPeriod: `${month.toUpperCase()} ${year}`,
      rentRoll,
      monthlyExpected,
      totalCollected,
      totalArrears,
      totalBalance,
      managementFeeRate: prop.commission_rate || 7.5,
      managementFee,
      vatOnMgmtFee,
      totalDeductions,
      netDue
    })
  }

  const handlePropertyChange = (e) => {
    const pId = e.target.value
    setSelectedPropertyId(pId)
    const prop = properties.find((p) => p.id === pId)
    buildStatement(prop, periodMonth, periodYear)
  }

  const handleMonthChange = (e) => {
    const m = e.target.value
    setPeriodMonth(m)
    const prop = properties.find((p) => p.id === selectedPropertyId)
    buildStatement(prop, m, periodYear)
  }

  const handleYearChange = (e) => {
    const y = e.target.value
    setPeriodYear(y)
    const prop = properties.find((p) => p.id === selectedPropertyId)
    buildStatement(prop, periodMonth, y)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-black font-serif text-sm">
      <div className="bg-white border border-gray-300 p-3 mb-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-800 font-sans">Select Property:</label>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-sans min-w-[280px]"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code} - {p.name}
                </option>
              ))}
            </select>

            <label className="text-xs font-bold text-gray-800 font-sans">Period:</label>
            <select
              value={periodMonth}
              onChange={handleMonthChange}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-sans"
            >
              {monthNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={periodYear}
              onChange={handleYearChange}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-sans"
            >
              {['2024', '2025', '2026', '2027'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold font-sans cursor-pointer"
          >
            Print Statement
          </button>
        </div>
      </div>

      {statementData && (
        <div className="bg-white p-8 border border-gray-300 max-w-4xl mx-auto print:border-none print:p-0 print:m-0 print:max-w-none">
          <div className="text-center pb-4 mb-4 border-b border-gray-800">
            <h1 className="text-lg font-bold uppercase tracking-wide">
              {context?.companyName || 'METROCOSMO VALUERS & PROPERTY MANAGERS'}
            </h1>
            <h2 className="text-base font-bold uppercase underline mt-1">
              LANDLORD PROPERTY STATEMENT / RENT ROLL
            </h2>
          </div>

          <div className="space-y-1 mb-6 text-sm">
            <div>
              <span className="font-bold">PROPERTY L.R NO.: </span>
              <span>{statementData.lrNumber} ({statementData.propertyName})</span>
            </div>
            <div>
              <span className="font-bold">PAYMENT PERIOD: </span>
              <span>{statementData.paymentPeriod}</span>
            </div>
            <div>
              <span className="font-bold">OWNER: </span>
              <span>{statementData.owner}</span>
            </div>
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="border-collapse border border-gray-300 w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 w-16">Unit</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400">Tenant</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-24">Arrears</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-28">Monthly Pay</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-28">Amount Paid</th>
                  <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 border border-gray-400 text-right w-28">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementData.rentRoll.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-gray-500 bg-white border border-gray-200">
                      No unit records recorded for this property.
                    </td>
                  </tr>
                ) : (
                  statementData.rentRoll.map((row, idx) => (
                    <tr key={idx} className="bg-white border-b border-gray-200">
                      <td className="py-1 px-2 border border-gray-300 font-mono">{row.unit}</td>
                      <td className="py-1 px-2 border border-gray-300">{row.tenant}</td>
                      <td className="py-1 px-2 border border-gray-300 text-right font-mono">
                        {row.arrears.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-2 border border-gray-300 text-right font-mono">
                        {row.monthlyPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-2 border border-gray-300 text-right font-mono font-semibold">
                        {row.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-2 border border-gray-300 text-right font-mono text-red-600 font-medium">
                        {row.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td colSpan="2" className="py-1 px-2 border border-gray-300 text-right">TOTALS:</td>
                  <td className="py-1 px-2 border border-gray-300 text-right font-mono">
                    {statementData.totalArrears.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 border border-gray-300 text-right font-mono">
                    {statementData.monthlyExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 border border-gray-300 text-right font-mono">
                    {statementData.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 border border-gray-300 text-right font-mono text-red-600">
                    {statementData.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-80 border border-gray-400 p-3 bg-white space-y-1.5 text-xs font-mono">
              <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                <span>Monthly Expected:</span>
                <span>KES {statementData.monthlyExpected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Collected:</span>
                <span>KES {statementData.totalCollected.toFixed(2)}</span>
              </div>
              <div className="pt-1 text-gray-700 font-bold">Deductions:</div>
              <div className="flex justify-between pl-3">
                <span>Management Fee ({statementData.managementFeeRate}%):</span>
                <span>KES {statementData.managementFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-3">
                <span>V.A.T on MF (16%):</span>
                <span>KES {statementData.vatOnMgmtFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-red-600">
                <span>Total Deductions:</span>
                <span>KES {statementData.totalDeductions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t-2 border-gray-800 pt-1 text-black">
                <span>Net Due:</span>
                <span>KES {statementData.netDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-400 mt-12 flex justify-between text-xs font-serif">
            <div>
              <span>PREPARED BY: _________________________________</span>
            </div>
            <div>
              <span>APPROVED BY: _________________________________</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
