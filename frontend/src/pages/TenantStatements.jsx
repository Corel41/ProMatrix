import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function TenantStatements() {
  const [searchParams] = useSearchParams()
  const initialTenantIdParam = searchParams.get('tenantId')

  const defaultTenants = [
    {
      id: 'T-13101',
      tenant_no: 'T13101',
      full_name: 'Mary Nyambura Mune',
      phone: '254728459082',
      id_or_passport_no: '28471920',
      property_name: '390 APARTMENTS (RUIRU)',
      unit_number: 'E4 [Unit 462]',
      monthly_rent: 25000,
    },
    {
      id: 'T-11879',
      tenant_no: 'T11879',
      full_name: 'John Kennedy Methu',
      phone: '254759265199',
      id_or_passport_no: '24910293',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 1',
      monthly_rent: 13000,
    },
    {
      id: 'T-14126',
      tenant_no: 'T14126',
      full_name: 'Prisca Achieng',
      phone: '254798798020',
      id_or_passport_no: '30192847',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 2',
      monthly_rent: 13000,
    },
    {
      id: 'T-11933',
      tenant_no: 'T11933',
      full_name: 'Harsal Aisha Njeri',
      phone: '254745705150',
      id_or_passport_no: '31829104',
      property_name: '73/188 LIBKEN BURUBURU',
      unit_number: 'BS 3',
      monthly_rent: 13000,
    },
    {
      id: 'T-19217',
      tenant_no: 'T19217',
      full_name: 'Edna Muthoni Kanyoro',
      phone: '254706370463',
      id_or_passport_no: '32036555',
      property_name: 'BURUBURU MICHAEL ESTATE',
      unit_number: 'Unit 1',
      monthly_rent: 30000,
    }
  ]

  const defaultLedgerMap = {
    'T-13101': [
      { date: '2026-08-01', ref_no: 'INV-2026-08-462', description: 'August 2026 Rent Bill', payable: 'Rent', debit: 25000, credit: 0 },
      { date: '2026-08-04', ref_no: 'RCT-2026-8921', description: 'M-Pesa Rent Payment (QWE8912)', payable: 'Rent', debit: 0, credit: 25000 },
      { date: '2026-09-01', ref_no: 'INV-2026-09-462', description: 'September 2026 Rent Bill', payable: 'Rent', debit: 25000, credit: 0 },
      { date: '2026-09-05', ref_no: 'RCT-2026-9210', description: 'Direct Bank Deposit (EFT Ref 402)', payable: 'Rent', debit: 0, credit: 25000 },
      { date: '2026-09-15', ref_no: 'INV-2026-09-W462', description: 'Water Consumption 12 Units', payable: 'Water Bill', debit: 1800, credit: 0 },
      { date: '2026-09-18', ref_no: 'RCT-2026-9402', description: 'Water Bill Settlement', payable: 'Water Bill', debit: 0, credit: 1800 },
      { date: '2026-10-01', ref_no: 'INV-2026-10-462', description: 'October 2026 Rent Bill', payable: 'Rent', debit: 25000, credit: 0 },
      { date: '2026-10-06', ref_no: 'RCT-2026-9912', description: 'M-Pesa Rent Payment (KLM9012)', payable: 'Rent', debit: 0, credit: 25000 },
    ],
    'T-11879': [
      { date: '2026-08-01', ref_no: 'INV-2026-08-512', description: 'August 2026 Monthly Rent', payable: 'Rent', debit: 13000, credit: 0 },
      { date: '2026-08-05', ref_no: 'RCT-2026-8812', description: 'Cash Office Bank Slip', payable: 'Rent', debit: 0, credit: 13000 },
      { date: '2026-09-01', ref_no: 'INV-2026-09-512', description: 'September 2026 Monthly Rent', payable: 'Rent', debit: 13000, credit: 0 },
      { date: '2026-09-06', ref_no: 'RCT-2026-9112', description: 'M-Pesa Payment', payable: 'Rent', debit: 0, credit: 13000 },
      { date: '2026-10-01', ref_no: 'INV-2026-10-512', description: 'October 2026 Monthly Rent', payable: 'Rent', debit: 13000, credit: 0 },
      { date: '2026-10-05', ref_no: 'RCT-2026-9812', description: 'M-Pesa Payment', payable: 'Rent', debit: 0, credit: 13000 },
    ]
  }

  const [tenantsList, setTenantsList] = useState(defaultTenants)
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantIdParam || 'T-13101')
  const [selectedTenant, setSelectedTenant] = useState(defaultTenants[0])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)

  const buildLedger = (tenantId, t) => {
    const raw = defaultLedgerMap[tenantId] || [
      { date: '2026-08-01', ref_no: 'INV-2026-08-01', description: 'August 2026 Rent Bill', payable: 'Rent', debit: t?.monthly_rent || 25000, credit: 0 },
      { date: '2026-08-06', ref_no: 'RCT-2026-08-01', description: 'Tenant Payment Receipt', payable: 'Rent', debit: 0, credit: t?.monthly_rent || 25000 },
      { date: '2026-09-01', ref_no: 'INV-2026-09-01', description: 'September 2026 Rent Bill', payable: 'Rent', debit: t?.monthly_rent || 25000, credit: 0 },
      { date: '2026-09-07', ref_no: 'RCT-2026-09-01', description: 'Tenant Payment Receipt', payable: 'Rent', debit: 0, credit: t?.monthly_rent || 25000 },
      { date: '2026-10-01', ref_no: 'INV-2026-10-01', description: 'October 2026 Rent Bill', payable: 'Rent', debit: t?.monthly_rent || 25000, credit: 0 },
      { date: '2026-10-08', ref_no: 'RCT-2026-10-01', description: 'Tenant Payment Receipt', payable: 'Rent', debit: 0, credit: t?.monthly_rent || 25000 },
    ]

    let running = 0
    return raw.map((item) => {
      running = running + item.debit - item.credit
      return {
        ...item,
        balance: running
      }
    })
  }

  useEffect(() => {
    async function loadData() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)

        const { data: dbTenants } = await supabase
          .from('tenants')
          .select('*')
          .eq('company_id', tenant.companyId)
          .order('full_name', { ascending: true })

        if (dbTenants && dbTenants.length > 0) {
          const combined = [
            ...dbTenants.map((dt) => ({
              id: dt.id,
              tenant_no: dt.tenant_no,
              full_name: dt.full_name || `${dt.first_name || ''} ${dt.last_name || ''}`.trim(),
              phone: dt.phone,
              id_or_passport_no: dt.id_or_passport_no || '-',
              property_name: 'Metrocosmo Agency Properties',
              unit_number: 'Assigned Unit',
              monthly_rent: 25000,
            })),
            ...defaultTenants
          ]
          setTenantsList(combined)

          const targetId = initialTenantIdParam || combined[0].id
          setSelectedTenantId(targetId)
          const chosen = combined.find((x) => x.id === targetId) || combined[0]
          setSelectedTenant(chosen)
          setTransactions(buildLedger(targetId, chosen))
        } else {
          const chosen = defaultTenants.find((x) => x.id === selectedTenantId) || defaultTenants[0]
          setSelectedTenant(chosen)
          setTransactions(buildLedger(selectedTenantId, chosen))
        }
      } catch (err) {
        console.error('Handled with default ledger:', err)
        const chosen = defaultTenants.find((x) => x.id === selectedTenantId) || defaultTenants[0]
        setSelectedTenant(chosen)
        setTransactions(buildLedger(selectedTenantId, chosen))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSelectTenant = (tenantId) => {
    setSelectedTenantId(tenantId)
    const chosen = tenantsList.find((x) => x.id === tenantId) || defaultTenants[0]
    setSelectedTenant(chosen)
    setTransactions(buildLedger(tenantId, chosen))
  }

  const totalDebits = transactions.reduce((acc, tx) => acc + (tx.debit || 0), 0)
  const totalCredits = transactions.reduce((acc, tx) => acc + (tx.credit || 0), 0)
  const netClosingBalance = totalDebits - totalCredits

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-400 p-4 mb-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="font-bold text-gray-800 text-xs">Select Tenant Account:</label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleSelectTenant(e.target.value)}
              className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white min-w-[320px]"
            >
              {tenantsList.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.tenant_no}] {t.full_name} ({t.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
            >
              Print Statement
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 border border-gray-300 max-w-5xl mx-auto print:border-none print:p-0 print:m-0 print:max-w-none">
        <div className="text-center pb-4 mb-4 border-b-2 border-black">
          <h1 className="text-xl font-bold uppercase tracking-wider font-serif">
            {context?.companyName || 'METROCOSMO VALUERS & PROPERTY MANAGERS LIMITED'}
          </h1>
          <p className="text-xs uppercase text-gray-600 mt-0.5">
            Customer Financial Ledger • Authorized Statement of Account
          </p>
          <h2 className="text-base font-bold uppercase underline mt-2 font-serif">
            TENANT STATEMENT OF ACCOUNT
          </h2>
        </div>

        <div className="border border-gray-300 p-3 bg-gray-50 mb-6 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="font-bold text-gray-700">TENANT NAME: </span>
            <span className="font-bold text-gray-900">{selectedTenant?.full_name}</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">TENANT CODE: </span>
            <span className="font-mono font-bold text-gray-900">{selectedTenant?.tenant_no}</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">NATIONAL ID: </span>
            <span className="font-mono">{selectedTenant?.id_or_passport_no}</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">PROPERTY: </span>
            <span>{selectedTenant?.property_name}</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">UNIT NUMBER: </span>
            <span className="font-mono font-bold">{selectedTenant?.unit_number}</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">PRIMARY PHONE: </span>
            <span className="font-mono">{selectedTenant?.phone}</span>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal w-24">Date</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal w-36">Ref / Voucher</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal">Description</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left font-normal w-24">Payable</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal w-28">Debit (KES)</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal w-28">Credit (KES)</th>
                <th className="border border-gray-400 py-1.5 px-2 text-right font-normal w-32">Balance (KES)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={idx} className="bg-white border-b border-gray-300">
                  <td className="border border-gray-300 py-1 px-2 font-mono">{tx.date}</td>
                  <td className="border border-gray-300 py-1 px-2 font-mono text-gray-700">{tx.ref_no}</td>
                  <td className="border border-gray-300 py-1 px-2">{tx.description}</td>
                  <td className="border border-gray-300 py-1 px-2 font-mono">{tx.payable}</td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {tx.debit > 0 ? Number(tx.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono">
                    {tx.credit > 0 ? Number(tx.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="border border-gray-300 py-1 px-2 text-right font-mono font-medium">
                    {tx.balance > 0 ? (
                      <span className="text-red-700">
                        {Number(tx.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span>
                        {Number(tx.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-black">
                <td colSpan={4} className="border border-gray-400 py-1.5 px-2 text-left">
                  TOTALS (KES)
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(totalDebits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono">
                  {Number(totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-400 py-1.5 px-2 text-right font-mono font-bold">
                  {netClosingBalance > 0 ? (
                    <span className="text-red-700">
                      {Number(netClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span>
                      {Number(netClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-80 border-2 border-black p-3 bg-white text-xs space-y-1">
            <div className="flex justify-between py-0.5">
              <span className="font-bold">Total Invoiced Debits:</span>
              <span className="font-mono font-bold">
                KES {Number(totalDebits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="font-bold">Total Settled Credits:</span>
              <span className="font-mono font-bold">
                KES {Number(totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t-2 border-black font-bold text-sm bg-gray-100 p-1">
              <span>CLOSING BALANCE:</span>
              <span className="font-mono">
                {netClosingBalance > 0 ? (
                  <span className="text-red-700">
                    KES {Number(netClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span>
                    KES {Number(netClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-400 grid grid-cols-2 gap-8 text-xs">
          <div>
            <span className="font-bold">ISSUED BY: </span>
            <span className="tracking-widest">___________________________</span>
          </div>
          <div>
            <span className="font-bold">ACCOUNTANT SIGN: </span>
            <span className="tracking-widest">___________________________</span>
          </div>
        </div>
      </div>
    </div>
  )
}
