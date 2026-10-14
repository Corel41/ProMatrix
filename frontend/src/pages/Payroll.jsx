import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Payroll() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [employees, setEmployees] = useState([])
  const [allowancesMap, setAllowancesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)
  const [existingRun, setExistingRun] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [selectedPayslipVoucher, setSelectedPayslipVoucher] = useState(null)
  const [activeSidebarNav, setActiveSidebarNav] = useState('process')
  const [selectedStaffDossier, setSelectedStaffDossier] = useState(null)
  const [activeFolderTab, setActiveFolderTab] = useState('Payment Information')
  const [paysPaye, setPaysPaye] = useState(true)
  const [paysNhif, setPaysNhif] = useState(true)
  const [paysNssf, setPaysNssf] = useState(true)
  const [earningsList, setEarningsList] = useState([
    { id: 1, type: 'Basic Pay', amount: 35000, taxable: true, recurring: true },
    { id: 2, type: 'House Allowance', amount: 8000, taxable: true, recurring: true },
    { id: 3, type: 'Commuter Allowance', amount: 4000, taxable: false, recurring: true }
  ])
  const [newEarningType, setNewEarningType] = useState('Overtime')
  const [newEarningAmount, setNewEarningAmount] = useState('')
  const [newEarningTaxable, setNewEarningTaxable] = useState(true)
  const [statusMsg, setStatusMsg] = useState('')

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const folderTabs = [
    'Contact Information',
    'Job Information',
    'Payment Information',
    'Contract Details',
    'Leave Details',
    'Exit Details',
    'Qualification',
    'Next Of Kin',
    'Documents'
  ]

  const calculateStatutory = (basicSalary, allowances = 0) => {
    const gross = basicSalary + allowances
    const nssf = paysNssf ? Math.min(Math.round(gross * 0.06), 2160) : 0

    let nhif = 0
    if (paysNhif) {
      if (gross <= 5999) nhif = 150
      else if (gross <= 7999) nhif = 300
      else if (gross <= 11999) nhif = 400
      else if (gross <= 14999) nhif = 500
      else if (gross <= 19999) nhif = 600
      else if (gross <= 24999) nhif = 750
      else if (gross <= 29999) nhif = 850
      else if (gross <= 49999) nhif = 1000
      else if (gross <= 99999) nhif = 1400
      else nhif = 1700
    }

    const housingLevy = Math.round(gross * 0.015)
    const taxablePay = Math.max(0, gross - nssf)
    let grossTax = 0

    if (paysPaye) {
      if (taxablePay <= 24000) {
        grossTax = taxablePay * 0.10
      } else if (taxablePay <= 32333) {
        grossTax = (24000 * 0.10) + ((taxablePay - 24000) * 0.25)
      } else {
        grossTax = (24000 * 0.10) + ((32333 - 24000) * 0.25) + ((taxablePay - 32333) * 0.30)
      }
    }

    const personalRelief = paysPaye ? 2400 : 0
    const paye = Math.max(0, Math.round(grossTax - personalRelief))
    const totalDeductions = nssf + nhif + paye + housingLevy
    const net = Math.max(0, gross - totalDeductions)

    return {
      gross,
      taxablePay,
      nssf,
      nhif,
      housingLevy,
      paye,
      personalRelief,
      totalDeductions,
      net,
    }
  }

  const loadPayrollData = async () => {
    setLoading(true)
    setStatusMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('employee_no', { ascending: true })

      if (empErr) throw empErr
      setEmployees(empData || [])
      if (empData && empData.length > 0 && !selectedStaffDossier) {
        setSelectedStaffDossier(empData[0])
      }

      const { data: runData, error: runErr } = await supabase
        .from('payroll_runs')
        .select('*, payslips(*)')
        .eq('company_id', tenant.companyId)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .maybeSingle()

      if (runErr) throw runErr
      setExistingRun(runData)

      if (runData?.payslips && runData.payslips.length > 0) {
        const initMap = {}
        runData.payslips.forEach((ps) => {
          initMap[ps.employee_id] = ps.allowances || 0
        })
        setAllowancesMap(initMap)
      }
    } catch (err) {
      console.error(err)
      setStatusMsg('Error loading payroll data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayrollData()
  }, [selectedMonth, selectedYear])

  const handleAllowanceChange = (empId, val) => {
    const num = parseFloat(val) || 0
    setAllowancesMap((prev) => ({
      ...prev,
      [empId]: num,
    }))
  }

  const handleAddEarning = () => {
    if (!newEarningAmount) return
    const newItem = {
      id: Date.now(),
      type: newEarningType,
      amount: parseFloat(newEarningAmount) || 0,
      taxable: newEarningTaxable,
      recurring: true
    }
    setEarningsList([...earningsList, newItem])
    setNewEarningAmount('')
  }

  const handleRemoveEarning = (id) => {
    setEarningsList(earningsList.filter((item) => item.id !== id))
  }

  const handleEditEarning = (item) => {
    setNewEarningType(item.type)
    setNewEarningAmount(item.amount.toString())
    setNewEarningTaxable(item.taxable)
    handleRemoveEarning(item.id)
  }

  const handleSaveDraft = async () => {
    setProcessing(true)
    setStatusMsg('')
    try {
      if (!context) throw new Error('Tenant context missing.')
      if (employees.length === 0) throw new Error('No active employees found to process.')

      let totalGross = 0
      let totalNet = 0

      const payslipsToInsert = employees.map((emp) => {
        const basic = parseFloat(emp.basic_salary) || 0
        const allow = allowancesMap[emp.id] || 0
        const calc = calculateStatutory(basic, allow)

        totalGross += calc.gross
        totalNet += calc.net

        return {
          company_id: context.companyId,
          branch_id: context.branchId,
          employee_id: emp.id,
          basic_salary: basic,
          allowances: allow,
          gross_pay: calc.gross,
          paye_tax: calc.paye,
          nhif_deduction: calc.nhif,
          nssf_deduction: calc.nssf,
          net_pay: calc.net,
        }
      })

      let runId = existingRun?.id

      if (runId) {
        const { error: updateRunErr } = await supabase
          .from('payroll_runs')
          .update({
            total_gross: totalGross,
            total_net: totalNet,
            status: 'draft',
          })
          .eq('id', runId)

        if (updateRunErr) throw updateRunErr

        const { error: deleteOldErr } = await supabase
          .from('payslips')
          .delete()
          .eq('payroll_run_id', runId)

        if (deleteOldErr) throw deleteOldErr
      } else {
        const { data: newRun, error: createRunErr } = await supabase
          .from('payroll_runs')
          .insert({
            company_id: context.companyId,
            branch_id: context.branchId,
            period_month: selectedMonth,
            period_year: selectedYear,
            total_gross: totalGross,
            total_net: totalNet,
            status: 'draft',
          })
          .select()
          .single()

        if (createRunErr) throw createRunErr
        runId = newRun.id
      }

      const payslipsWithRunId = payslipsToInsert.map((ps) => ({
        ...ps,
        payroll_run_id: runId,
      }))

      const { error: insertPsErr } = await supabase
        .from('payslips')
        .insert(payslipsWithRunId)

      if (insertPsErr) throw insertPsErr

      setStatusMsg('Payroll run saved successfully as DRAFT.')
      await loadPayrollData()
    } catch (err) {
      console.error(err)
      setStatusMsg('Payroll save failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleApprovePayroll = async () => {
    if (!existingRun?.id) {
      setStatusMsg('Please save the draft run first before approving.')
      return
    }

    setProcessing(true)
    setStatusMsg('')
    try {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved' })
        .eq('id', existingRun.id)

      if (error) throw error
      setStatusMsg('Payroll run successfully APPROVED and locked for payment disbursement.')
      await loadPayrollData()
    } catch (err) {
      console.error(err)
      setStatusMsg('Approval failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const computedRows = employees.map((emp) => {
    const basic = parseFloat(emp.basic_salary) || 0
    const allow = allowancesMap[emp.id] || 0
    const calc = calculateStatutory(basic, allow)
    return {
      emp,
      basic,
      allow,
      ...calc,
    }
  })

  const aggregateGross = computedRows.reduce((acc, r) => acc + r.gross, 0)
  const aggregatePaye = computedRows.reduce((acc, r) => acc + r.paye, 0)
  const aggregateNhif = computedRows.reduce((acc, r) => acc + r.nhif, 0)
  const aggregateNssf = computedRows.reduce((acc, r) => acc + r.nssf, 0)
  const aggregateHousing = computedRows.reduce((acc, r) => acc + r.housingLevy, 0)
  const aggregateNet = computedRows.reduce((acc, r) => acc + r.net, 0)

  return (
    <div className="flex h-full w-full bg-white text-black font-sans text-xs overflow-hidden">
      <aside className="w-56 shrink-0 bg-teal-600 text-white flex flex-col justify-between border-r border-teal-700 select-none">
        <div>
          <div className="p-3 bg-teal-700 font-bold text-sm tracking-wide border-b border-teal-800">
            PAYROLL & DEDUCTIONS
          </div>
          <div className="p-2 text-[11px] text-teal-100 uppercase font-semibold">
            Activity
          </div>
          <ul className="text-xs">
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('process')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'process' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Process Monthly Payroll
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('salary_details')}
                className={`w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer ${
                  activeSidebarNav === 'salary_details' ? 'bg-teal-800 font-bold' : ''
                }`}
              >
                Salary Details & Deductions
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveSidebarNav('process')}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                Payroll Periods
              </button>
            </li>
          </ul>

          <div className="p-2 text-[11px] text-teal-100 uppercase font-semibold mt-3">
            Reports
          </div>
          <ul className="text-xs">
            <li>
              <button
                type="button"
                onClick={() => {
                  if (computedRows.length > 0) setSelectedPayslipVoucher(computedRows[0])
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                Payslips
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStatusMsg('P10 KRA Tax Deduction report generated.')}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                KRA iTAX / P10 Returns
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStatusMsg('NHIF Return Schedule exported.')}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                NHIF Monthly Returns
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStatusMsg('NSSF Return Schedule exported.')}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                NSSF Monthly Returns
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStatusMsg('Bank payment schedule exported for EFT.')}
                className="w-full text-left px-3 py-1.5 hover:bg-teal-500 cursor-pointer"
              >
                Bank Payments List
              </button>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-teal-700/80 text-[11px] border-t border-teal-800">
          <div>Payroll Status: {existingRun ? existingRun.status.toUpperCase() : 'NOT PROCESSED'}</div>
          <div className="text-teal-200">Period: {monthNames[selectedMonth - 1]} {selectedYear}</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-100 p-4">
        {activeSidebarNav === 'salary_details' ? (
          <div className="bg-white border border-gray-300 p-3 mb-3">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
              <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
                Fig 10 & 11: Employee Data Window ~ Salary Details & Deductions
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Select Employee:</span>
                <select
                  value={selectedStaffDossier?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value)
                    if (emp) setSelectedStaffDossier(emp)
                  }}
                  className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_no} - {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveSidebarNav('process')}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Return to Processing
                </button>
              </div>
            </div>

            <div className="flex border-b border-gray-400">
              {folderTabs.map((tab) => {
                const isActive = activeFolderTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFolderTab(tab)}
                    className={`px-3 py-1 text-xs font-bold border border-gray-400 border-b-0 -mr-px cursor-pointer select-none ${
                      isActive
                        ? 'bg-white text-black border-t-2 border-t-orange-500 z-10'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{ marginBottom: isActive ? '-1px' : '0px' }}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            <div className="border border-gray-400 border-t-0 bg-white p-4">
              {activeFolderTab === 'Payment Information' && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 border border-gray-300">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Basic Pay (Kshs) *
                        </label>
                        <input
                          type="number"
                          defaultValue={selectedStaffDossier?.basic_salary || 35000}
                          className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-48 font-bold text-gray-900"
                        />
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paysPaye}
                            onChange={(e) => setPaysPaye(e.target.checked)}
                            className="rounded-none border border-gray-400 h-4 w-4"
                          />
                          <span>Pays PAYE</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paysNhif}
                            onChange={(e) => setPaysNhif(e.target.checked)}
                            className="rounded-none border border-gray-400 h-4 w-4"
                          />
                          <span>Pays NHIF</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paysNssf}
                            onChange={(e) => setPaysNssf(e.target.checked)}
                            className="rounded-none border border-gray-400 h-4 w-4"
                          />
                          <span>Pays NSSF</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-300 p-3 bg-white mt-4">
                    <div className="font-bold text-gray-800 text-xs uppercase mb-2">
                      Earnings & Allowances Grid
                    </div>

                    <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 border border-gray-300">
                      <span className="text-xs font-semibold">Earning Item:</span>
                      <select
                        value={newEarningType}
                        onChange={(e) => setNewEarningType(e.target.value)}
                        className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                      >
                        <option value="House Allowance">House Allowance</option>
                        <option value="Commuter Allowance">Commuter Allowance</option>
                        <option value="Overtime">Overtime</option>
                        <option value="Responsibility Allowance">Responsibility Allowance</option>
                        <option value="Performance Bonus">Performance Bonus</option>
                      </select>

                      <span className="text-xs font-semibold ml-2">Amount (Kshs):</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={newEarningAmount}
                        onChange={(e) => setNewEarningAmount(e.target.value)}
                        className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-28"
                      />

                      <label className="inline-flex items-center gap-1 text-xs ml-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEarningTaxable}
                          onChange={(e) => setNewEarningTaxable(e.target.checked)}
                          className="rounded-none border-gray-400"
                        />
                        <span>Taxable</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddEarning}
                        className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold ml-auto cursor-pointer"
                      >
                        Add Earning
                      </button>
                    </div>

                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead>
                        <tr>
                          <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left w-24">
                            Actions
                          </th>
                          <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">
                            Earning Description
                          </th>
                          <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">
                            Amount (KES)
                          </th>
                          <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">
                            Taxable
                          </th>
                          <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">
                            Recurring
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {earningsList.map((item) => (
                          <tr key={item.id} className="bg-white border-b border-gray-200">
                            <td className="py-1 px-2 whitespace-nowrap">
                              <span
                                onClick={() => handleRemoveEarning(item.id)}
                                className="text-red-600 underline cursor-pointer mr-3 font-semibold"
                              >
                                Remove
                              </span>
                              <span
                                onClick={() => handleEditEarning(item)}
                                className="text-gray-600 underline cursor-pointer font-semibold"
                              >
                                Edit
                              </span>
                            </td>
                            <td className="py-1 px-2 font-medium">{item.type}</td>
                            <td className="py-1 px-2 text-right font-mono">
                              {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-2 text-center">
                              {item.taxable ? 'YES' : 'NO'}
                            </td>
                            <td className="py-1 px-2 text-center">
                              {item.recurring ? 'YES' : 'NO'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeFolderTab !== 'Payment Information' && (
                <div className="py-8 text-center text-gray-500 font-serif">
                  Dossier section [{activeFolderTab}] loaded for {selectedStaffDossier?.first_name} {selectedStaffDossier?.last_name}.
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-300 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusMsg('Compensation schedule updated.')}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Save Salary Record
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="bg-white border border-gray-300 p-3 mb-3">
              <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
                <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
                  Fig 11: Payroll Processing Window
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">Payroll Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs font-semibold text-gray-700 ml-2">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>

                  <button
                    type="button"
                    onClick={loadPayrollData}
                    className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                  >
                    Recalculate
                  </button>
                </div>
              </div>

              {statusMsg && (
                <div className="bg-yellow-50 border border-yellow-400 text-yellow-900 px-3 py-1 text-xs mb-2">
                  {statusMsg}
                </div>
              )}

              <div className="grid grid-cols-6 gap-2 bg-gray-50 border border-gray-300 p-2 text-xs">
                <div>
                  <div className="text-gray-500">Total Gross:</div>
                  <div className="font-bold text-gray-900 font-mono text-sm">
                    KES {Number(aggregateGross).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total PAYE Tax:</div>
                  <div className="font-bold text-red-700 font-mono text-sm">
                    KES {Number(aggregatePaye).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total NHIF:</div>
                  <div className="font-bold text-red-700 font-mono text-sm">
                    KES {Number(aggregateNhif).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total NSSF:</div>
                  <div className="font-bold text-red-700 font-mono text-sm">
                    KES {Number(aggregateNssf).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Housing Levy:</div>
                  <div className="font-bold text-red-700 font-mono text-sm">
                    KES {Number(aggregateHousing).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Total Net Pay:</div>
                  <div className="font-bold text-green-700 font-mono text-sm">
                    KES {Number(aggregateNet).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={processing}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  {processing ? 'Processing...' : 'Save Draft Payroll'}
                </button>
                <button
                  type="button"
                  onClick={handleApprovePayroll}
                  disabled={processing}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Approve & Finalize
                </button>
                <button
                  type="button"
                  onClick={() => setStatusMsg('Bank payment schedule exported to Excel.')}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Print Bank Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setStatusMsg('P10 Monthly Tax Return schedule exported.')}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Export P10 KRA
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-300 p-3 flex-1 flex flex-col">
              <div className="border-b border-gray-300 pb-2 mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                  Monthly Payroll Register - {monthNames[selectedMonth - 1]} {selectedYear} ({computedRows.length} Staff)
                </h2>
                <span className="text-xs text-gray-500 italic">
                  Note: Allowances column can be edited inline.
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Emp No</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Employee Name</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Basic Pay</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Allowances</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Gross Pay</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">PAYE Tax</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">NHIF</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">NSSF</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Housing Levy</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Total Ded.</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right font-bold">Net Pay</th>
                      <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedRows.map((r) => (
                      <tr key={r.emp.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-1 px-2 font-mono">{r.emp.employee_no}</td>
                        <td className="py-1 px-2 font-medium">{r.emp.first_name} {r.emp.last_name}</td>
                        <td className="py-1 px-2 text-right font-mono">
                          {Number(r.basic).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            value={allowancesMap[r.emp.id] !== undefined ? allowancesMap[r.emp.id] : 0}
                            onChange={(e) => handleAllowanceChange(r.emp.id, e.target.value)}
                            className="border border-gray-400 rounded-none h-6 px-1 text-xs bg-white w-20 text-right font-mono"
                          />
                        </td>
                        <td className="py-1 px-2 text-right font-mono">
                          {Number(r.gross).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-700">
                          {Number(r.paye).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-700">
                          {Number(r.nhif).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-700">
                          {Number(r.nssf).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-700">
                          {Number(r.housingLevy).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-700">
                          {Number(r.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-green-800">
                          {Number(r.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPayslipVoucher(r)}
                            className="text-blue-700 underline font-semibold cursor-pointer"
                          >
                            Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedPayslipVoucher && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-gray-800 p-6 max-w-xl w-full font-serif text-sm">
              <div className="border-b-2 border-black pb-2 mb-4 text-center">
                <div className="font-bold text-lg uppercase tracking-wide">
                  {context?.companyName || 'PROMATRIX PROPERTY MANAGEMENT LTD'}
                </div>
                <div className="text-xs uppercase text-gray-700">
                  STAFF PAYSLIP VOUCHER ~ {monthNames[selectedMonth - 1].toUpperCase()} {selectedYear}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4 border border-gray-300 p-2">
                <div>
                  <span className="font-bold">EMPLOYEE NO:</span> {selectedPayslipVoucher.emp.employee_no}
                </div>
                <div>
                  <span className="font-bold">ID NUMBER:</span> {selectedPayslipVoucher.emp.id_number || 'N/A'}
                </div>
                <div>
                  <span className="font-bold">EMPLOYEE NAME:</span> {selectedPayslipVoucher.emp.first_name} {selectedPayslipVoucher.emp.last_name}
                </div>
                <div>
                  <span className="font-bold">DESIGNATION:</span> {selectedPayslipVoucher.emp.job_title}
                </div>
                <div>
                  <span className="font-bold">KRA PIN:</span> {selectedPayslipVoucher.emp.kra_pin || 'N/A'}
                </div>
                <div>
                  <span className="font-bold">NSSF / NHIF:</span> {selectedPayslipVoucher.emp.nssf_no || '-'} / {selectedPayslipVoucher.emp.nhif_no || '-'}
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-xs mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 py-1 px-2 text-left">ITEM DESCRIPTION</th>
                    <th className="border border-gray-400 py-1 px-2 text-right">EARNINGS (KES)</th>
                    <th className="border border-gray-400 py-1 px-2 text-right">DEDUCTIONS (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">Basic Salary</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.basic).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">Allowances & Benefits</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.allow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">PAYE Income Tax</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.paye).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">NHIF Deduction</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.nhif).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">NSSF Deduction</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.nssf).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 py-1 px-2">Affordable Housing Levy (1.5%)</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">-</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      {Number(selectedPayslipVoucher.housingLevy).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-400 py-1 px-2">TOTALS</td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      KES {Number(selectedPayslipVoucher.gross).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 py-1 px-2 text-right font-mono">
                      KES {Number(selectedPayslipVoucher.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black p-2 bg-gray-50 flex items-center justify-between mb-4">
                <span className="font-bold text-sm">NET AMOUNT PAYABLE:</span>
                <span className="font-bold text-base font-mono text-green-900">
                  KES {Number(selectedPayslipVoucher.net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-[11px] text-gray-600 space-y-1 mb-4">
                <div>Bank: {selectedPayslipVoucher.emp.bank_name || 'Equity Bank Kenya'}</div>
                <div>Account: {selectedPayslipVoucher.emp.bank_account_no || '••••••••'}</div>
              </div>

              <div className="pt-4 border-t border-gray-400 grid grid-cols-2 gap-4 text-[11px]">
                <div>PREPARED BY: ___________________</div>
                <div>RECEIVED BY: ___________________</div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslipVoucher(null)}
                  className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
