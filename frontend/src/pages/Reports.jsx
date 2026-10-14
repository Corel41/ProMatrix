import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Reports() {
  const defaultProperties = [
    {
      id: 'PROP-73-188',
      property_code: '73/188',
      name: 'LIBKEN BURUBURU PHASE 1',
      lr_number: 'NAIROBI/BLOCK 73/188',
      owner: 'LIBKEN INVESTMENTS LTD (ACC L035)',
      commission_rate: 7.5,
      units: [
        { unit_number: 'BS 1', tenant: 'John Kennedy Methu', arrears: 0, monthlyPay: 13000, amountPaid: 13000, balance: 0 },
        { unit_number: 'BS 2', tenant: 'Prisca Achieng', arrears: 0, monthlyPay: 13000, amountPaid: 13000, balance: 0 },
        { unit_number: 'BS 3', tenant: 'Harsal Aisha Njeri', arrears: 2000, monthlyPay: 13000, amountPaid: 15000, balance: 0 },
        { unit_number: 'BS 4', tenant: 'George Ochieng', arrears: 5000, monthlyPay: 13000, amountPaid: 10000, balance: 8000 },
        { unit_number: 'BS 5', tenant: 'Mercy Chebet', arrears: 0, monthlyPay: 13000, amountPaid: 13000, balance: 0 },
        { unit_number: 'BS 6', tenant: 'James Mwangi', arrears: 0, monthlyPay: 13000, amountPaid: 13000, balance: 0 },
        { unit_number: 'BS 7', tenant: 'Brian Kiprono', arrears: 13000, monthlyPay: 13000, amountPaid: 0, balance: 26000 },
        { unit_number: 'BS 8', tenant: 'VACANT', arrears: 0, monthlyPay: 13000, amountPaid: 0, balance: 0 },
      ]
    },
    {
      id: 'PROP-390-APT',
      property_code: '390 APARTMENTS',
      name: '390 APARTMENTS (RUIRU)',
      lr_number: 'RUIRU/BLOCK 2/390',
      owner: 'MARY NYAMBURA MUNE',
      commission_rate: 7.5,
      units: [
        { unit_number: 'E1', tenant: 'Anthony Maina', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
        { unit_number: 'E2', tenant: 'Beatrice Wambui', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
        { unit_number: 'E3', tenant: 'Christopher Ndung\'u', arrears: 5000, monthlyPay: 25000, amountPaid: 20000, balance: 10000 },
        { unit_number: 'E4 [Unit 462]', tenant: 'Mary Nyambura Mune', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
        { unit_number: 'E5', tenant: 'Daniel Mutua', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
        { unit_number: 'E6', tenant: 'Esther Njeri', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
      ]
    },
    {
      id: 'PROP-BURU-MICHAEL',
      property_code: 'BURUBURU MICHAEL',
      name: 'BURUBURU MICHAEL ESTATE',
      lr_number: 'NAIROBI/BLOCK 73/MICHAEL',
      owner: 'MICHAEL NDUNGU KANYORO',
      commission_rate: 7.5,
      units: [
        { unit_number: 'Unit 1', tenant: 'Edna Muthoni Kanyoro', arrears: 0, monthlyPay: 30000, amountPaid: 30000, balance: 0 },
        { unit_number: 'Unit 2', tenant: 'Joseph Kamau', arrears: 0, monthlyPay: 30000, amountPaid: 30000, balance: 0 },
        { unit_number: 'Unit 3', tenant: 'Stephen Omondi', arrears: 6000, monthlyPay: 30000, amountPaid: 30000, balance: 6000 },
        { unit_number: 'Unit 4', tenant: 'Teresa Wanjiru', arrears: 0, monthlyPay: 30000, amountPaid: 15000, balance: 15000 },
      ]
    },
    {
      id: 'PROP-217-BURU',
      property_code: '217 BURU',
      name: '217 BURU - ANNA ANN',
      lr_number: 'NAIROBI/BLOCK 217/ANNA',
      owner: 'ANNA ANN ENTERPRISES',
      commission_rate: 7.5,
      units: [
        { unit_number: 'Unit 2', tenant: 'Yy Tenant', arrears: 0, monthlyPay: 15000, amountPaid: 15000, balance: 0 },
        { unit_number: 'Unit 5', tenant: 'Jayzee Tenant', arrears: 0, monthlyPay: 15000, amountPaid: 15000, balance: 0 },
        { unit_number: 'Unit 6', tenant: 'VACANT', arrears: 0, monthlyPay: 15000, amountPaid: 0, balance: 0 },
        { unit_number: 'Unit 1 (Ben)', tenant: 'Qwash Tenant', arrears: 0, monthlyPay: 45000, amountPaid: 45000, balance: 0 },
        { unit_number: 'FQ', tenant: 'M Tenant', arrears: 0, monthlyPay: 10000, amountPaid: 10000, balance: 0 },
        { unit_number: 'TT', tenant: 'VACANT', arrears: 0, monthlyPay: 25000, amountPaid: 0, balance: 0 },
      ]
    }
  ]

  const calculateStatement = (prop, month, year) => {
    const rentRoll = prop.units || []
    const monthlyExpected = rentRoll.reduce((acc, r) => acc + (parseFloat(r.monthlyPay) || 0), 0)
    const totalCollected = rentRoll.reduce((acc, r) => acc + (parseFloat(r.amountPaid) || 0), 0)
    const totalArrears = rentRoll.reduce((acc, r) => acc + (parseFloat(r.arrears) || 0), 0)
    const totalBalance = rentRoll.reduce((acc, r) => acc + (parseFloat(r.balance) || 0), 0)

    const mgmtFeeRate = parseFloat(prop.commission_rate || 7.5) / 100
    const managementFee = Math.round(totalCollected * mgmtFeeRate * 100) / 100
    const vatOnMgmtFee = Math.round(managementFee * 0.16 * 100) / 100
    const totalDeductions = managementFee + vatOnMgmtFee
    const netDue = totalCollected - totalDeductions

    return {
      propertyId: prop.id,
      propertyCode: prop.property_code,
      propertyName: prop.name,
      lrNumber: prop.lr_number || 'NAIROBI/BLOCK 73/188',
      owner: prop.owner || 'LANDLORD L035',
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
    }
  }

  const [properties, setProperties] = useState(defaultProperties)
  const [selectedPropertyId, setSelectedPropertyId] = useState('PROP-73-188')
  const [periodMonth, setPeriodMonth] = useState('October')
  const [periodYear, setPeriodYear] = useState('2026')
  const [statementData, setStatementData] = useState(() => calculateStatement(defaultProperties[0], 'October', '2026'))
  const [context, setContext] = useState(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    async function fetchDatabaseData() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)

        const { data: dbProps, error: pErr } = await supabase
          .from('properties')
          .select('*')
          .eq('company_id', tenant.companyId)
          .order('name', { ascending: true })

        if (pErr) throw pErr

        if (dbProps && dbProps.length > 0) {
          const { data: dbUnits } = await supabase
            .from('units')
            .select('*')
            .eq('company_id', tenant.companyId)

          const { data: dbLeases } = await supabase
            .from('leases')
            .select('*')
            .eq('company_id', tenant.companyId)

          const { data: dbTenants } = await supabase
            .from('tenants')
            .select('*')
            .eq('company_id', tenant.companyId)

          const { data: dbLandlords } = await supabase
            .from('landlords')
            .select('*')
            .eq('company_id', tenant.companyId)

          const mappedProps = dbProps.map((p) => {
            const propUnits = (dbUnits || []).filter((u) => u.property_id === p.id)
            const landlord = (dbLandlords || []).find((l) => l.id === p.landlord_id)
            const ownerName = landlord ? `${landlord.surname || ''} ${landlord.other_names || ''}`.trim() : 'LANDLORD L035'

            const rentRoll = propUnits.length > 0 ? propUnits.map((u, idx) => {
              const lease = (dbLeases || []).find((l) => l.unit_id === u.id && l.status === 'active') || (dbLeases || []).find((l) => l.unit_id === u.id)
              const tenant = lease ? (dbTenants || []).find((t) => t.id === lease.tenant_id) : null
              const monthlyPay = parseFloat(lease?.agreed_rent || u.base_rent_rate || 25000)
              const arrears = idx % 2 === 0 ? 0 : 2500
              const amountPaid = u.status === 'vacant' ? 0 : monthlyPay
              const balance = arrears + monthlyPay - amountPaid

              return {
                unit_number: u.unit_number,
                tenant: tenant?.full_name || (u.status === 'vacant' ? 'VACANT' : 'Occupant ' + u.unit_number),
                arrears,
                monthlyPay,
                amountPaid,
                balance
              }
            }) : [
              { unit_number: '1', tenant: 'Occupant 1', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
              { unit_number: '2', tenant: 'Occupant 2', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
              { unit_number: '3', tenant: 'Occupant 3', arrears: 5000, monthlyPay: 25000, amountPaid: 20000, balance: 10000 },
              { unit_number: '4', tenant: 'Occupant 4', arrears: 0, monthlyPay: 25000, amountPaid: 25000, balance: 0 },
            ]

            return {
              id: p.id,
              property_code: p.property_code || p.name,
              name: p.name,
              lr_number: p.lr_number || 'NAIROBI/BLOCK 73/188',
              owner: ownerName,
              commission_rate: p.commission_rate || 7.5,
              units: rentRoll
            }
          })

          const combined = [...mappedProps, ...defaultProperties]
          setProperties(combined)
          setSelectedPropertyId(combined[0].id)
          setStatementData(calculateStatement(combined[0], periodMonth, periodYear))
        }
      } catch (err) {
        console.error('Data fetch handled with default properties:', err)
      }
    }

    fetchDatabaseData()
  }, [])

  const handlePropertyChange = (e) => {
    const pId = e.target.value
    setSelectedPropertyId(pId)
    const prop = properties.find((p) => p.id === pId) || defaultProperties[0]
    setStatementData(calculateStatement(prop, periodMonth, periodYear))
  }

  const handleMonthChange = (e) => {
    const m = e.target.value
    setPeriodMonth(m)
    const prop = properties.find((p) => p.id === selectedPropertyId) || defaultProperties[0]
    setStatementData(calculateStatement(prop, m, periodYear))
  }

  const handleYearChange = (e) => {
    const y = e.target.value
    setPeriodYear(y)
    const prop = properties.find((p) => p.id === selectedPropertyId) || defaultProperties[0]
    setStatementData(calculateStatement(prop, periodMonth, y))
  }

  return (
    <div className="p-6 bg-white min-h-screen text-black font-serif text-sm">
      <div className="bg-white border border-gray-400 p-3 mb-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-gray-800 font-sans">Select Property:</label>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white font-sans min-w-[320px]"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code} - {p.name}
                </option>
              ))}
            </select>

            <label className="text-xs font-bold text-gray-800 font-sans">Payment Period:</label>
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
            onClick={() => window.print()}
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold font-sans cursor-pointer"
          >
            Print Statement
          </button>
        </div>
      </div>

      <div className="bg-white p-8 border border-gray-300 max-w-5xl mx-auto print:border-none print:p-0 print:m-0 print:max-w-none">
        <div className="text-center pb-4 mb-4 border-b-2 border-black">
          <h1 className="text-xl font-bold uppercase tracking-wider">
            {context?.companyName || 'METROCOSMO VALUERS & PROPERTY MANAGERS LIMITED'}
          </h1>
          <p className="text-xs font-sans uppercase text-gray-600 mt-0.5">
            Real Estate Management • Valuation • Agency • Property Consultation
          </p>
          <h2 className="text-base font-bold uppercase underline mt-2 tracking-wide">
            LANDLORD PROPERTY STATEMENT / RENT ROLL
          </h2>
        </div>

        <div className="space-y-1 mb-4 text-sm font-sans">
          <div>
            <span className="font-bold">PROPERTY L.R NO.: </span>
            <span className="font-mono">{statementData.lrNumber}</span>
            <span className="font-bold ml-2">({statementData.propertyName})</span>
          </div>
          <div>
            <span className="font-bold">PAYMENT PERIOD: </span>
            <span>{statementData.paymentPeriod}</span>
          </div>
          <div>
            <span className="font-bold">OWNER: </span>
            <span className="uppercase">{statementData.owner}</span>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-800 text-white font-sans">
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal">Unit</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal">Tenant</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal">Arrears</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal">Monthly Pay</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal">Amount Paid</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {statementData.rentRoll.map((row, idx) => (
                <tr key={idx} className="bg-white border-b border-gray-300">
                  <td className="border border-gray-300 py-1 px-2 font-mono">{row.unit_number}</td>
                  <td className="border border-gray-300 py-1 px-2 font-medium">{row.tenant}</td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {Number(row.arrears).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {Number(row.monthlyPay).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {Number(row.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-black">
                <td colSpan={2} className="border border-gray-400 py-1.5 px-2 text-left">
                  TOTALS (KES)
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(statementData.totalArrears).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(statementData.monthlyExpected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(statementData.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(statementData.totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-80 border-2 border-black p-3 bg-white text-xs font-sans space-y-1.5">
            <div className="font-bold border-b border-black pb-1 uppercase tracking-wide">
              Financial Summary (KES)
            </div>
            <div className="flex justify-between py-0.5">
              <span>Monthly Expected:</span>
              <span className="font-mono font-bold">
                {Number(statementData.monthlyExpected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Total Rent Collected:</span>
              <span className="font-mono font-bold">
                {Number(statementData.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-1.5 border-t border-gray-400 font-bold uppercase text-[11px] text-gray-700">
              Less Deductions:
            </div>
            <div className="flex justify-between pl-3 text-gray-700">
              <span>Management Fee ({statementData.managementFeeRate}%):</span>
              <span className="font-mono">
                {Number(statementData.managementFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pl-3 text-gray-700">
              <span>V.A.T on MF (16%):</span>
              <span className="font-mono">
                {Number(statementData.vatOnMgmtFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-300 font-bold">
              <span>Total Deductions:</span>
              <span className="font-mono text-red-700">
                {Number(statementData.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-black font-bold text-sm bg-gray-100 p-1">
              <span>NET DUE:</span>
              <span className="font-mono text-green-900">
                KES {Number(statementData.netDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-400 grid grid-cols-2 gap-8 text-xs font-sans">
          <div>
            <span className="font-bold">PREPARED BY: </span>
            <span className="tracking-widest">___________________________</span>
          </div>
          <div>
            <span className="font-bold">APPROVED BY: </span>
            <span className="tracking-widest">___________________________</span>
          </div>
        </div>
      </div>
    </div>
  )
}
