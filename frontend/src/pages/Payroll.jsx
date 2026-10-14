import { useState, useEffect } from 'react'
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Users,
  Percent,
  Calculator,
  Printer,
  FileText,
  Landmark,
  Building,
  Home
} from 'lucide-react'
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
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const calculateStatutory = (basicSalary, allowances = 0) => {
    const gross = basicSalary + allowances
    const nssf = Math.min(Math.round(gross * 0.06), 2160)

    let nhif = 0
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

    const housingLevy = Math.round(gross * 0.015)
    const taxablePay = Math.max(0, gross - nssf)
    let grossTax = 0

    if (taxablePay <= 24000) {
      grossTax = taxablePay * 0.10
    } else if (taxablePay <= 32333) {
      grossTax = (24000 * 0.10) + ((taxablePay - 24000) * 0.25)
    } else {
      grossTax = (24000 * 0.10) + ((32333 - 24000) * 0.25) + ((taxablePay - 32333) * 0.30)
    }

    const personalRelief = 2400
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
    setErrorMsg('')
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
      console.error('Error loading payroll records:', err)
      setErrorMsg(err.message || 'Failed to load payroll records.')
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

  const computedList = employees.map((emp) => {
    const basic = parseFloat(emp.basic_salary || 0)
    const allowances = parseFloat(allowancesMap[emp.id] || 0)
    const calcs = calculateStatutory(basic, allowances)
    return {
      ...emp,
      basicSalary: basic,
      allowances,
      ...calcs,
    }
  })

  const totalGross = computedList.reduce((acc, row) => acc + row.gross, 0)
  const totalNssf = computedList.reduce((acc, row) => acc + row.nssf, 0)
  const totalNhif = computedList.reduce((acc, row) => acc + row.nhif, 0)
  const totalHousingLevy = computedList.reduce((acc, row) => acc + row.housingLevy, 0)
  const totalPaye = computedList.reduce((acc, row) => acc + row.paye, 0)
  const totalDeductions = computedList.reduce((acc, row) => acc + row.totalDeductions, 0)
  const totalNet = computedList.reduce((acc, row) => acc + row.net, 0)

  const handleProcessPayroll = async () => {
    setProcessing(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) {
        throw new Error('Tenant context missing. Please refresh.')
      }

      if (computedList.length === 0) {
        throw new Error('No active staff available to process for this period.')
      }

      let runId = existingRun?.id

      if (!runId) {
        const runPayload = {
          company_id: context.companyId,
          branch_id: context.branchId,
          period_month: selectedMonth,
          period_year: selectedYear,
          total_gross: totalGross,
          total_net: totalNet,
          status: 'approved',
        }

        const { data: newRun, error: runError } = await supabase
          .from('payroll_runs')
          .insert([runPayload])
          .select()
          .single()

        if (runError) throw runError
        runId = newRun.id
      } else {
        const { error: updateRunErr } = await supabase
          .from('payroll_runs')
          .update({
            total_gross: totalGross,
            total_net: totalNet,
            status: 'approved',
          })
          .eq('id', runId)

        if (updateRunErr) throw updateRunErr

        const { error: delErr } = await supabase
          .from('payslips')
          .delete()
          .eq('payroll_run_id', runId)

        if (delErr) throw delErr
      }

      const payslipsPayload = computedList.map((row) => ({
        company_id: context.companyId,
        branch_id: context.branchId,
        payroll_run_id: runId,
        employee_id: row.id,
        basic_salary: row.basicSalary,
        allowances: row.allowances,
        gross_pay: row.gross,
        paye_tax: row.paye,
        nhif_deduction: row.nhif,
        nssf_deduction: row.nssf,
        housing_levy: row.housingLevy,
        taxable_pay: row.taxablePay,
        personal_relief: row.personalRelief,
        net_pay: row.net,
      }))

      const { error: payslipsErr } = await supabase
        .from('payslips')
        .insert(payslipsPayload)

      if (payslipsErr) throw payslipsErr

      setSuccessMsg(
        `Payroll for ${monthNames[selectedMonth - 1]} ${selectedYear} processed and committed! ${computedList.length} payslips ledgered.`
      )
      await loadPayrollData()
    } catch (err) {
      console.error('Payroll processing error:', err)
      setErrorMsg(err.message || 'Failed to process payroll.')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="w-full px-8 py-6 space-y-6 bg-surface-950 text-surface-100 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-1">
            <span>Domain 7</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span>HR & Remuneration</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span className="text-surface-300">Monthly Payroll Processing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-mint-400" />
            <span>Statutory Payroll Processing</span>
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Automated statutory calculations: KRA PAYE bands, NSSF Tier I & II, NHIF/SHIF scales, and Affordable Housing Levy (1.5%).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-900/80 border border-surface-800 rounded-xl px-3 py-1.5 shadow-soft">
            <Calendar className="h-4 w-4 text-brand-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-surface-200 font-semibold focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1} className="bg-surface-900 text-white">
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-surface-200 font-semibold focus:outline-none cursor-pointer font-mono"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr} className="bg-surface-900 text-white">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadPayrollData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-surface-900/80 hover:bg-surface-850 text-surface-300 border border-surface-800 shadow-soft transition-all cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {existingRun && (
        <div className="p-4 rounded-2xl bg-brand-950/40 border border-brand-500/20 text-xs text-brand-200 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
            <span>
              Payroll for <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> has already been{' '}
              <strong className="uppercase font-mono text-mint-300">{existingRun.status}</strong>. Processing again will update and re-commit the batch.
            </span>
          </div>
          <span className="text-[11px] font-mono text-surface-400">
            Total Disbursed: KES {parseFloat(existingRun.total_net || 0).toLocaleString()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Total Gross Pay</span>
            <Users className="h-4 w-4 text-brand-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1 font-mono">
            KES {totalGross.toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">{computedList.length} staff members</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>KRA PAYE</span>
            <Percent className="h-4 w-4 text-honey-400" />
          </div>
          <p className="text-xl font-bold text-honey-400 mt-1 font-mono">
            KES {totalPaye.toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">Tax withheld at source</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Housing Levy (1.5%)</span>
            <Home className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-bold text-teal-300 mt-1 font-mono">
            KES {totalHousingLevy.toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">AHL Act 2024 compliance</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>NSSF & NHIF</span>
            <ShieldCheck className="h-4 w-4 text-brand-400" />
          </div>
          <p className="text-xl font-bold text-brand-300 mt-1 font-mono">
            KES {(totalNssf + totalNhif).toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">NSSF: {totalNssf} | NHIF: {totalNhif}</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-surface-800/80 shadow-card">
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span>Net Disbursable</span>
            <CreditCard className="h-4 w-4 text-mint-400" />
          </div>
          <p className="text-xl font-bold text-mint-400 mt-1 font-mono">
            KES {totalNet.toLocaleString()}
          </p>
          <p className="text-[11px] text-surface-500 mt-1">Total bank disbursement</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-coral-950/30 border border-coral-500/30 text-coral-300 text-xs flex items-start gap-3 shadow-card">
          <AlertCircle className="h-4 w-4 text-coral-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-coral-200">Processing Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-coral-400 hover:text-coral-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-mint-950/30 border border-mint-500/30 text-mint-300 text-xs flex items-start gap-3 shadow-card">
          <CheckCircle2 className="h-4 w-4 text-mint-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-mint-200">Success</p>
            <p className="mt-0.5">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-mint-400 hover:text-mint-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-surface-800/80 flex items-center justify-between bg-surface-950/60">
          <div>
            <h3 className="text-sm font-bold text-white font-sans">
              Monthly Remuneration Ledger — {monthNames[selectedMonth - 1]} {selectedYear}
            </h3>
            <p className="text-xs text-surface-400">
              Review and adjust individual allowances before executing payroll batch.
            </p>
          </div>

          <button
            onClick={handleProcessPayroll}
            disabled={processing || computedList.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft shadow-brand-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {processing ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Payroll...</span>
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                <span>Process & Commit Payroll</span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-800/80 bg-surface-950/70 text-surface-400 font-medium uppercase tracking-wider font-mono text-[11px]">
                <th className="py-3.5 px-4">Emp No</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Basic Salary</th>
                <th className="py-3.5 px-4">Allowances</th>
                <th className="py-3.5 px-4">Gross Pay</th>
                <th className="py-3.5 px-4">NSSF</th>
                <th className="py-3.5 px-4">NHIF</th>
                <th className="py-3.5 px-4">Housing (1.5%)</th>
                <th className="py-3.5 px-4">PAYE Tax</th>
                <th className="py-3.5 px-4">Total Ded.</th>
                <th className="py-3.5 px-4">Net Pay</th>
                <th className="py-3.5 px-4 text-center">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-850/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="12" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-mono">Calculating remuneration ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : computedList.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-16 text-center text-surface-500">
                    No active employees registered to process for this month.
                  </td>
                </tr>
              ) : (
                computedList.map((row) => (
                  <tr
                    key={row.id}
                    className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/50 transition-colors text-surface-300"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-300 whitespace-nowrap">
                      {row.employee_no}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-surface-100 whitespace-nowrap">
                      <div>
                        {row.first_name} {row.last_name}
                      </div>
                      <div className="text-[10px] text-surface-400 font-normal">
                        {row.job_title}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-surface-200 whitespace-nowrap">
                      KES {row.basicSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={allowancesMap[row.id] !== undefined ? allowancesMap[row.id] : 0}
                          onChange={(e) => handleAllowanceChange(row.id, e.target.value)}
                          className="w-full bg-surface-950 border border-surface-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all text-right"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      KES {row.gross.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-surface-400 whitespace-nowrap">
                      KES {row.nssf.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-surface-400 whitespace-nowrap">
                      KES {row.nhif.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-teal-300 whitespace-nowrap">
                      KES {row.housingLevy.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-honey-400 whitespace-nowrap">
                      KES {row.paye.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-coral-400 whitespace-nowrap">
                      KES {row.totalDeductions.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-mint-400 whitespace-nowrap">
                      KES {row.net.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayslipVoucher(row)}
                        className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors cursor-pointer"
                        title="View / Print Payslip Voucher"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {computedList.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-surface-800 bg-surface-950/90 font-mono text-xs text-white font-bold">
                  <td colSpan="2" className="py-4 px-4 text-surface-300 uppercase">
                    Grand Totals ({computedList.length} staff)
                  </td>
                  <td className="py-4 px-4">
                    KES {computedList.reduce((acc, r) => acc + r.basicSalary, 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    KES {computedList.reduce((acc, r) => acc + r.allowances, 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-white">
                    KES {totalGross.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-surface-300">
                    KES {totalNssf.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-surface-300">
                    KES {totalNhif.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-teal-300">
                    KES {totalHousingLevy.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-honey-400">
                    KES {totalPaye.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-coral-400">
                    KES {totalDeductions.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-mint-400 text-sm">
                    KES {totalNet.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-surface-950/70 px-5 py-3.5 border-t border-surface-800/80 text-xs text-surface-400 flex items-center justify-between">
          <span>
            Statutory Rules Applied: KRA Personal Relief KES 2,400/mo • NSSF Act 2013 Tier II Capped • NHIF/SHIF Scales • Housing Levy 1.5%
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] text-surface-500">
            <ShieldCheck className="h-3.5 w-3.5 text-mint-400" />
            <span>Multi-tenant Isolation: {context?.branchCode}</span>
          </div>
        </div>
      </div>

      {selectedPayslipVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-elevated flex flex-col print:border-none print:shadow-none print:rounded-none print:m-0 print:w-full print:bg-white print:text-black">
            <div className="px-6 py-4.5 border-b border-surface-800 flex items-center justify-between bg-surface-950/50 print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-brand-400" />
                <h3 className="text-base font-bold text-white font-sans">Official Payslip Voucher</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedPayslipVoucher(null)}
                  className="text-surface-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-xs bg-surface-900 print:bg-white print:text-black font-sans">
              <div className="flex items-start justify-between border-b border-surface-800 pb-5 print:border-gray-300">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white print:text-black">
                    {context?.companyName || 'METROCOSMO VALUERS & PROPERTY MANAGERS'}
                  </h2>
                  <p className="text-xs text-surface-400 print:text-gray-600 mt-1">
                    Branch: {context?.branchName || 'Head Office'} • Branch Code: {context?.branchCode}
                  </p>
                  <p className="text-xs text-surface-400 print:text-gray-600">
                    Period: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold bg-brand-950/50 text-brand-300 border border-brand-500/20 print:border-gray-400 print:text-black print:bg-gray-100">
                    PAYSLIP VOUCHER
                  </span>
                  <p className="text-[11px] font-mono text-surface-400 print:text-gray-500 mt-1.5">
                    Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-surface-950/50 print:bg-gray-50 p-4 rounded-2xl border border-surface-800/60 print:border-gray-200">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase font-mono">Employee Name:</span>
                    <p className="font-bold text-white print:text-black text-sm">
                      {selectedPayslipVoucher.title ? `${selectedPayslipVoucher.title} ` : ''}
                      {selectedPayslipVoucher.first_name} {selectedPayslipVoucher.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase font-mono">Employee No:</span>
                    <p className="font-mono font-bold text-brand-400 print:text-black">{selectedPayslipVoucher.employee_no}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase font-mono">Designation:</span>
                    <p className="text-surface-300 print:text-gray-700">{selectedPayslipVoucher.job_title} ({selectedPayslipVoucher.department || 'Operations'})</p>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase">National ID:</span>
                    <p className="text-surface-300 print:text-gray-700">{selectedPayslipVoucher.id_number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase">KRA PIN / NSSF / NHIF:</span>
                    <p className="text-surface-300 print:text-gray-700">
                      {selectedPayslipVoucher.kra_pin || '—'} / {selectedPayslipVoucher.nssf_no || '—'} / {selectedPayslipVoucher.nhif_no || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 print:text-gray-500 uppercase">Disbursement Bank:</span>
                    <p className="text-surface-300 print:text-gray-700">
                      {selectedPayslipVoucher.bank_name || 'Cash Settlement'} {selectedPayslipVoucher.bank_account_no ? `(Acc: ${selectedPayslipVoucher.bank_account_no})` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-mint-400 print:text-black font-mono border-b border-surface-800 print:border-gray-300 pb-1.5">
                    Earnings (KES)
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>Basic Remuneration:</span>
                      <span className="font-semibold text-white print:text-black">
                        KES {selectedPayslipVoucher.basicSalary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>Housing / Travel Allowances:</span>
                      <span className="font-semibold text-white print:text-black">
                        KES {selectedPayslipVoucher.allowances.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-surface-800 print:border-gray-300 pt-2 flex justify-between font-bold text-white print:text-black">
                      <span>Total Gross Pay:</span>
                      <span>KES {selectedPayslipVoucher.gross.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-coral-400 print:text-black font-mono border-b border-surface-800 print:border-gray-300 pb-1.5">
                    Deductions (KES)
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>NSSF Pension (Tier I & II):</span>
                      <span className="font-semibold text-surface-200 print:text-black">
                        KES {selectedPayslipVoucher.nssf.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>NHIF / SHIF Medical:</span>
                      <span className="font-semibold text-surface-200 print:text-black">
                        KES {selectedPayslipVoucher.nhif.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>Affordable Housing Levy (1.5%):</span>
                      <span className="font-semibold text-teal-300 print:text-black">
                        KES {selectedPayslipVoucher.housingLevy.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-surface-300 print:text-gray-700">
                      <span>KRA PAYE Tax (Net of Relief):</span>
                      <span className="font-semibold text-honey-400 print:text-black">
                        KES {selectedPayslipVoucher.paye.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-surface-800 print:border-gray-300 pt-2 flex justify-between font-bold text-coral-400 print:text-black">
                      <span>Total Deductions:</span>
                      <span>KES {selectedPayslipVoucher.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-mint-950/40 print:bg-gray-100 p-4 rounded-2xl border border-mint-500/20 print:border-gray-300 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[11px] text-mint-300 print:text-gray-600 uppercase font-semibold">Net Disbursable Remuneration:</span>
                  <p className="text-xl font-bold text-mint-400 print:text-black mt-0.5">
                    KES {selectedPayslipVoucher.net.toLocaleString()}
                  </p>
                </div>
                <div className="text-right text-[11px] text-surface-400 print:text-gray-600">
                  <span>Authorized Signature: _______________________</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-surface-800 bg-surface-950/40 flex justify-end print:hidden">
              <button
                onClick={() => setSelectedPayslipVoucher(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white transition-all cursor-pointer"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
