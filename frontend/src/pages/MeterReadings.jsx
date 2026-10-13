import { useState, useEffect, useMemo } from 'react'
import {
  Gauge,
  Search,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Save,
  Droplets,
  Layers,
  ArrowRight,
  Calculator,
  FileCheck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function MeterReadings() {
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter & Period State
  const today = new Date()
  const [selectedPropertyId, setSelectedPropertyId] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [readingDate, setReadingDate] = useState(today.toISOString().split('T')[0])
  const [tariffRate, setTariffRate] = useState(150.0) // KES per unit/cubic meter
  const [searchQuery, setSearchQuery] = useState('')

  // Entities Data
  const [propertiesList, setPropertiesList] = useState([])
  const [unitsWithMeters, setUnitsWithMeters] = useState([])
  const [metersMap, setMetersMap] = useState({})
  const [previousReadingsMap, setPreviousReadingsMap] = useState({})

  // Editable Current Readings State: keyed by unit.id -> string
  const [currentReadingsInput, setCurrentReadingsInput] = useState({})

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      // 1. Fetch properties for dropdown filter
      const { data: propData, error: propErr } = await supabase
        .from('properties')
        .select('id, property_code, name')
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      if (propErr) throw propErr
      setPropertiesList(propData || [])

      // 2. Fetch all units that have a recorded water_meter_no
      const { data: unitsData, error: uErr } = await supabase
        .from('units')
        .select(`
          id,
          company_id,
          branch_id,
          property_id,
          unit_number,
          unit_category,
          floor_level,
          water_meter_no,
          status,
          properties!units_company_property_fk (
            id,
            property_code,
            name
          )
        `)
        .eq('company_id', tenant.companyId)
        .not('water_meter_no', 'is', null)
        .order('unit_number', { ascending: true })

      if (uErr) throw uErr

      const validUnits = (unitsData || []).filter(
        (u) => u.water_meter_no && u.water_meter_no.trim() !== ''
      )
      setUnitsWithMeters(validUnits)

      // 3. Fetch utility meters for these units
      const { data: metersData, error: mErr } = await supabase
        .from('utility_meters')
        .select('id, unit_id, meter_number, initial_reading, current_reading')
        .eq('company_id', tenant.companyId)
        .eq('meter_type', 'water')

      if (mErr) throw mErr

      const mMap = {}
      ;(metersData || []).forEach((m) => {
        mMap[m.unit_id] = m
      })

      // Ensure any unit without a utility_meters entry gets registered automatically
      for (const u of validUnits) {
        if (!mMap[u.id]) {
          const { data: newMeter, error: newMErr } = await supabase
            .from('utility_meters')
            .upsert(
              {
                company_id: tenant.companyId,
                branch_id: tenant.branchId,
                property_id: u.property_id,
                unit_id: u.id,
                meter_type: 'water',
                meter_number: u.water_meter_no,
                initial_reading: 0.0,
                current_reading: 0.0,
                is_active: true,
              },
              { onConflict: 'unit_id, meter_type' }
            )
            .select()
            .single()

          if (!newMErr && newMeter) {
            mMap[u.id] = newMeter
          }
        }
      }
      setMetersMap(mMap)

      // 4. Fetch previous utility readings to populate Previous Reading column
      const { data: readingsData, error: rErr } = await supabase
        .from('utility_readings')
        .select('unit_id, current_reading, reading_date, month, year')
        .eq('company_id', tenant.companyId)
        .order('reading_date', { ascending: false })

      if (rErr) throw rErr

      const prevMap = {}
      // Map the most recent recorded reading per unit
      ;(readingsData || []).forEach((r) => {
        if (prevMap[r.unit_id] === undefined) {
          prevMap[r.unit_id] = Number(r.current_reading || 0)
        }
      })

      // Fallback to meter's current_reading or initial_reading
      validUnits.forEach((u) => {
        if (prevMap[u.id] === undefined) {
          const meter = mMap[u.id]
          prevMap[u.id] = Number(meter?.current_reading || meter?.initial_reading || 0)
        }
      })
      setPreviousReadingsMap(prevMap)
    } catch (err) {
      console.error('Failed to load meter readings data:', err)
      setErrorMsg(err.message || 'Error loading utility meters.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered units list
  const filteredUnits = useMemo(() => {
    return unitsWithMeters.filter((u) => {
      const matchesProperty =
        selectedPropertyId === 'all' || u.property_id === selectedPropertyId
      const matchesSearch =
        u.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.water_meter_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesProperty && matchesSearch
    })
  }, [unitsWithMeters, selectedPropertyId, searchQuery])

  // Handle Current Reading input change
  const handleCurrentReadingChange = (unitId, value) => {
    setCurrentReadingsInput((prev) => ({
      ...prev,
      [unitId]: value,
    }))
  }

  // Row-level computations
  const getRowCalculations = (unitId) => {
    const prev = previousReadingsMap[unitId] || 0.0
    const rawCurr = currentReadingsInput[unitId]
    const curr = parseFloat(rawCurr)

    if (rawCurr === undefined || rawCurr === '' || isNaN(curr)) {
      return {
        previousReading: prev,
        currentReading: '',
        consumption: 0.0,
        bill: 0.0,
        isValid: false,
        isEntered: false,
      }
    }

    const consumption = Math.max(0, curr - prev)
    const bill = consumption * tariffRate
    const isValid = curr >= prev

    return {
      previousReading: prev,
      currentReading: curr,
      consumption,
      bill,
      isValid,
      isEntered: true,
    }
  }

  // Aggregate metrics across active inputs
  const aggregates = useMemo(() => {
    let enteredCount = 0
    let totalConsumption = 0
    let totalBill = 0

    filteredUnits.forEach((u) => {
      const calc = getRowCalculations(u.id)
      if (calc.isEntered && calc.isValid) {
        enteredCount += 1
        totalConsumption += calc.consumption
        totalBill += calc.bill
      }
    })

    return {
      enteredCount,
      totalConsumption,
      totalBill,
    }
  }, [filteredUnits, currentReadingsInput, previousReadingsMap, tariffRate])

  // Batch Save Readings Execution
  const handleSaveReadings = async () => {
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context missing.')

      // Collect all units with valid entered readings
      const rowsToSave = []
      const meterUpdates = []

      for (const unit of filteredUnits) {
        const rawCurr = currentReadingsInput[unit.id]
        if (rawCurr === undefined || rawCurr === '') continue

        const prev = previousReadingsMap[unit.id] || 0.0
        const curr = parseFloat(rawCurr)

        if (isNaN(curr)) {
          throw new Error(`Unit ${unit.unit_number} has an invalid numeric reading.`)
        }

        if (curr < prev) {
          throw new Error(
            `Unit ${unit.unit_number}: Current reading (${curr}) cannot be lower than previous reading (${prev}).`
          )
        }

        const meter = metersMap[unit.id]
        if (!meter) {
          throw new Error(`No utility meter found for Unit ${unit.unit_number}.`)
        }

        const consumption = curr - prev
        const totalCharge = consumption * tariffRate

        rowsToSave.push({
          company_id: context.companyId,
          branch_id: context.branchId,
          property_id: unit.property_id,
          unit_id: unit.id,
          meter_id: meter.id,
          month: selectedMonth,
          year: selectedYear,
          reading_date: readingDate,
          previous_reading: prev,
          current_reading: curr,
          tariff_rate: tariffRate,
          meter_rent: 0.0,
          sewerage_amount: 0.0,
          total_charge_amount: totalCharge,
          is_billed: false,
        })

        meterUpdates.push({
          id: meter.id,
          current_reading: curr,
        })
      }

      if (rowsToSave.length === 0) {
        throw new Error('Please enter at least one Current Reading in the grid before saving.')
      }

      // 1. Batch upsert into utility_readings (unique on meter_id, year, month)
      const { data: insertedReadings, error: insErr } = await supabase
        .from('utility_readings')
        .upsert(rowsToSave, { onConflict: 'meter_id, year, month' })
        .select()

      if (insErr) throw insErr

      // 2. Update utility_meters current_reading to latest reading
      for (const update of meterUpdates) {
        await supabase
          .from('utility_meters')
          .update({ current_reading: update.current_reading, updated_at: new Date().toISOString() })
          .eq('id', update.id)
      }

      setSuccessMsg(
        `Successfully saved ${rowsToSave.length} water meter reading(s) for ${selectedMonth}/${selectedYear}! Total Consumption: ${aggregates.totalConsumption.toFixed(
          2
        )} Units • Total Billed: KES ${aggregates.totalBill.toLocaleString('en-KE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`
      )

      // Clear current readings inputs and reload
      setCurrentReadingsInput({})
      await loadData()
    } catch (err) {
      console.error('Batch save readings failed:', err)
      setErrorMsg(err.message || 'Failed to save meter readings.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 4</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Utility Consumption Billing</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Meter Readings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Droplets className="h-7 w-7 text-sky-400" />
              <span>Water Meter Readings & Consumption Billing</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Capture monthly water meter readings with instant consumption and tariff calculation under strict RLS isolation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Meter Reading Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/90 mt-0.5">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Controls Bar: Property Filter, Period, Reading Date & Tariff */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Property Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Estate / Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">All Properties ({propertiesList.length})</option>
                {propertiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.property_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Month */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Billing Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })} (Month {m})
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Year */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Billing Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Reading Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reading Date</label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Tariff Rate (KES/Unit) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tariff (KES / Unit)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[11px] font-mono text-slate-500 font-bold">
                  KES
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={tariffRate}
                  onChange={(e) => setTariffRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Quick Search & Summary Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="relative max-w-sm w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search unit number or meter no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Live Aggregate Metrics Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-500">METERED UNITS:</span>{' '}
                <span className="font-bold text-slate-200">{filteredUnits.length}</span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-500">READY TO SAVE:</span>{' '}
                <span className="font-bold text-sky-400">{aggregates.enteredCount}</span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-500">CONSUMPTION:</span>{' '}
                <span className="font-bold text-amber-400">
                  {aggregates.totalConsumption.toFixed(2)} Units
                </span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                <span className="text-slate-500">TOTAL BILL:</span>{' '}
                <span className="font-bold text-emerald-400">
                  KES{' '}
                  {aggregates.totalBill.toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Grid: Units, Meters, Readings & Auto-Calculated Bills */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
                Monthly Water Consumption Grid ({filteredUnits.length} Metered Units)
              </h3>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Period: <span className="text-indigo-400 font-bold">{selectedMonth}/{selectedYear}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Unit Number</th>
                  <th className="py-3 px-4">Property / Estate</th>
                  <th className="py-3 px-4">Water Meter No</th>
                  <th className="py-3 px-4 text-right">Previous Reading</th>
                  <th className="py-3 px-4 text-right w-44">Current Reading</th>
                  <th className="py-3 px-4 text-right">Consumption (Units)</th>
                  <th className="py-3 px-4 text-right">Calculated Bill (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading metered units and previous readings...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      No units with water meters found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => {
                    const calc = getRowCalculations(unit.id)
                    const rawVal = currentReadingsInput[unit.id] ?? ''
                    const hasError = calc.isEntered && !calc.isValid

                    return (
                      <tr
                        key={unit.id}
                        className={`transition-colors ${
                          calc.isEntered && calc.isValid
                            ? 'bg-sky-950/20 text-slate-200'
                            : hasError
                            ? 'bg-rose-950/20 text-rose-200'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        {/* Unit Number */}
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>Unit {unit.unit_number}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {unit.unit_category}
                            </span>
                          </div>
                        </td>

                        {/* Property Name */}
                        <td className="py-3 px-4 text-slate-300">
                          <span className="truncate block max-w-xs">{unit.properties?.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {unit.properties?.property_code}
                          </span>
                        </td>

                        {/* Water Meter No */}
                        <td className="py-3 px-4 font-mono font-semibold text-sky-400">
                          {unit.water_meter_no}
                        </td>

                        {/* Previous Reading */}
                        <td className="py-3 px-4 font-mono font-medium text-right text-slate-400">
                          {calc.previousReading.toFixed(2)}
                        </td>

                        {/* Editable Current Reading Input */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              step="0.01"
                              placeholder={calc.previousReading.toFixed(2)}
                              value={rawVal}
                              onChange={(e) => handleCurrentReadingChange(unit.id, e.target.value)}
                              className={`w-32 bg-slate-950 border rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-xs focus:outline-none transition-all ${
                                hasError
                                  ? 'border-rose-500 text-rose-400 ring-1 ring-rose-500/20'
                                  : calc.isEntered
                                  ? 'border-sky-500 text-sky-300 ring-1 ring-sky-500/20'
                                  : 'border-slate-700 text-white focus:border-indigo-500'
                              }`}
                            />
                            {hasError && (
                              <span className="text-[10px] text-rose-400 mt-0.5 font-mono">
                                &lt; previous ({calc.previousReading})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Auto-Calculated Consumption */}
                        <td className="py-3 px-4 font-mono font-bold text-right">
                          <span
                            className={
                              calc.consumption > 0 ? 'text-amber-400' : 'text-slate-500'
                            }
                          >
                            {calc.consumption.toFixed(2)}
                          </span>
                        </td>

                        {/* Auto-Calculated Bill (Consumption * Tariff) */}
                        <td className="py-3 px-4 font-mono font-bold text-right text-emerald-400">
                          {calc.bill > 0
                            ? calc.bill.toLocaleString('en-KE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0.00'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Table Footer with Summary */}
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/90 font-mono">
                  <td colSpan="5" className="py-3.5 px-4 text-right uppercase tracking-wider font-bold text-slate-300">
                    Totals for Entered Readings:
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-amber-400">
                    {aggregates.totalConsumption.toFixed(2)} Units
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      KES{' '}
                      {aggregates.totalBill.toLocaleString('en-KE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Footer: Batch Save Readings */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Batch save will enforce multi-tenant isolation under{' '}
                <strong className="text-slate-200">{context?.companyName}</strong> ({context?.branchCode}).
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveReadings}
                disabled={submitting || aggregates.enteredCount === 0}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Readings...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>
                      Save Readings ({aggregates.enteredCount} Unit{aggregates.enteredCount === 1 ? '' : 's'} • KES{' '}
                      {aggregates.totalBill.toLocaleString('en-KE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      )
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
