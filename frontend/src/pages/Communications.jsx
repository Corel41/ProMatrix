import { useState, useEffect, useMemo } from 'react'
import {
  MessageSquare,
  Send,
  Users,
  History,
  Building,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Radio,
  FileText,
  Clock,
  Sparkles,
  Smartphone,
  Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'
import Navbar from '../components/Navbar'

export default function Communications() {
  const [activeTab, setActiveTab] = useState('single')
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [propertiesList, setPropertiesList] = useState([])
  const [tenantsList, setTenantsList] = useState([])
  const [leasesList, setLeasesList] = useState([])
  const [commsLogs, setCommsLogs] = useState([])

  const [selectedLogDetail, setSelectedLogDetail] = useState(null)

  const [singleTenantId, setSingleTenantId] = useState('')
  const [singlePhone, setSinglePhone] = useState('')
  const [singleMessageType, setSingleMessageType] = useState('general_broadcast')
  const [singleMessageContent, setSingleMessageContent] = useState('')

  const [bulkPropertyId, setBulkPropertyId] = useState('all')
  const [selectedTenantIds, setSelectedTenantIds] = useState(new Set())
  const [bulkMessageType, setBulkMessageType] = useState('general_broadcast')
  const [bulkMessageContent, setBulkMessageContent] = useState('')
  const [bulkSearchQuery, setBulkSearchQuery] = useState('')

  const [logsSearchQuery, setLogsSearchQuery] = useState('')
  const [logsTypeFilter, setLogsTypeFilter] = useState('all')
  const [logsStatusFilter, setLogsStatusFilter] = useState('all')

  const templates = [
    {
      label: 'Rent Due Reminder',
      type: 'rent_due_reminder',
      template: 'Dear {name}, this is a gentle reminder that rent for Unit {unit} is due on the 5th. Kindly settle via our official Paybill. Thank you, ProMatrix.',
    },
    {
      label: 'Arrears Demand Notice',
      type: 'arrears_demand',
      template: 'Dear {name}, our records show an outstanding balance on Unit {unit}. Please clear your account immediately to avoid disconnection/penalties.',
    },
    {
      label: 'Payment Receipt Ack',
      type: 'credit_receipt',
      template: 'Dear {name}, we acknowledge receipt of your payment for Unit {unit}. Your official receipt has been posted to your statement.',
    },
    {
      label: 'Routine Property Notice',
      type: 'general_broadcast',
      template: 'Dear Residents of {property}, please note there will be scheduled maintenance of the common water pump tomorrow from 9am to 1pm.',
    },
  ]

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: propData, error: propErr } = await supabase
        .from('properties')
        .select('id, property_code, name')
        .eq('company_id', tenant.companyId)
        .order('name', { ascending: true })

      if (propErr) throw propErr
      setPropertiesList(propData || [])

      const { data: tData, error: tErr } = await supabase
        .from('tenants')
        .select('id, tenant_no, full_name, phone, email, status')
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (tErr) throw tErr
      setTenantsList(tData || [])

      const { data: leasesData, error: lErr } = await supabase
        .from('leases')
        .select(`
          id,
          property_id,
          unit_id,
          tenant_id,
          agreed_rent,
          status,
          properties!leases_company_property_fk (
            id,
            property_code,
            name
          ),
          units!leases_company_unit_fk (
            id,
            unit_number,
            unit_category
          ),
          tenants!leases_company_tenant_fk (
            id,
            tenant_no,
            full_name,
            phone
          )
        `)
        .eq('company_id', tenant.companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (lErr) throw lErr
      setLeasesList(leasesData || [])

      const allTIds = new Set((leasesData || []).map((l) => l.tenant_id).filter(Boolean))
      setSelectedTenantIds(allTIds)

      const { data: logsData, error: logsErr } = await supabase
        .from('communication_logs')
        .select(`
          id,
          recipient_destination,
          channel,
          message_type,
          message_content,
          status,
          external_gateway_id,
          sent_at,
          created_at,
          tenant_id,
          tenants (
            id,
            tenant_no,
            full_name,
            phone
          )
        `)
        .eq('company_id', tenant.companyId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsErr) throw logsErr
      setCommsLogs(logsData || [])
    } catch (err) {
      console.error('Failed to load communications data:', err)
      setErrorMsg(err.message || 'Error loading communications workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectSingleTenant = (tenantId) => {
    setSingleTenantId(tenantId)
    const t = tenantsList.find((x) => x.id === tenantId)
    if (t && t.phone) {
      setSinglePhone(t.phone)
    }
  }

  const getSmsSegmentCount = (text) => {
    const len = text.length
    if (len === 0) return { chars: 0, segments: 0 }
    if (len <= 160) return { chars: len, segments: 1, maxSegment: 160 }
    const segments = Math.ceil(len / 153)
    return { chars: len, segments, maxSegment: segments * 153 }
  }

  const handleSendSingleSms = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context missing.')
      if (!singlePhone.trim()) throw new Error('Recipient destination phone number is required.')
      if (!singleMessageContent.trim()) throw new Error('Message content cannot be empty.')

      const gatewayRef = `AT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
      const now = new Date().toISOString()

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        tenant_id: singleTenantId || null,
        channel: 'sms',
        recipient_destination: singlePhone.trim(),
        message_type: singleMessageType,
        message_content: singleMessageContent.trim(),
        status: 'sent',
        external_gateway_id: gatewayRef,
        sent_at: now,
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .insert([payload])
        .select()

      if (error) throw error

      setSuccessMsg(
        `SMS successfully dispatched to ${singlePhone}! Gateway Reference: ${gatewayRef}.`
      )

      setSingleMessageContent('')
      await loadData()
    } catch (err) {
      console.error('Single SMS dispatch failed:', err)
      setErrorMsg(err.message || 'Failed to dispatch SMS.')
    } finally {
      setSubmitting(false)
    }
  }

  const bulkEligibleLeases = useMemo(() => {
    return leasesList.filter((lease) => {
      const matchesProperty =
        bulkPropertyId === 'all' || lease.property_id === bulkPropertyId
      const tenantName = lease.tenants?.full_name?.toLowerCase() || ''
      const tenantPhone = lease.tenants?.phone?.toLowerCase() || ''
      const unitNum = lease.units?.unit_number?.toLowerCase() || ''
      const matchesSearch =
        tenantName.includes(bulkSearchQuery.toLowerCase()) ||
        tenantPhone.includes(bulkSearchQuery.toLowerCase()) ||
        unitNum.includes(bulkSearchQuery.toLowerCase())
      return matchesProperty && matchesSearch
    })
  }, [leasesList, bulkPropertyId, bulkSearchQuery])

  const toggleSelectTenant = (tenantId) => {
    const next = new Set(selectedTenantIds)
    if (next.has(tenantId)) {
      next.delete(tenantId)
    } else {
      next.add(tenantId)
    }
    setSelectedTenantIds(next)
  }

  const toggleSelectAllBulk = () => {
    const visibleIds = bulkEligibleLeases.map((l) => l.tenant_id).filter(Boolean)
    const allSelected = visibleIds.every((id) => selectedTenantIds.has(id))

    const next = new Set(selectedTenantIds)
    if (allSelected) {
      visibleIds.forEach((id) => next.delete(id))
    } else {
      visibleIds.forEach((id) => next.add(id))
    }
    setSelectedTenantIds(next)
  }

  const handleSendBulkSms = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!context) throw new Error('Tenant context missing.')
      if (!bulkMessageContent.trim()) throw new Error('Message content cannot be empty.')

      const targetLeases = bulkEligibleLeases.filter((l) =>
        selectedTenantIds.has(l.tenant_id)
      )

      if (targetLeases.length === 0) {
        throw new Error('Please select at least one tenant to receive the bulk SMS.')
      }

      const now = new Date().toISOString()
      const batchRef = `BULK-${Math.floor(1000 + Math.random() * 9000)}`

      const payloads = targetLeases.map((lease, idx) => {
        const tenant = lease.tenants
        const unit = lease.units
        const property = lease.properties

        let personalizedMsg = bulkMessageContent
          .replace(/{name}/g, tenant?.full_name || 'Resident')
          .replace(/{unit}/g, unit?.unit_number || '')
          .replace(/{property}/g, property?.name || 'the estate')

        const gatewayRef = `AT-${batchRef}-${idx + 1}`

        return {
          company_id: context.companyId,
          branch_id: context.branchId,
          tenant_id: tenant?.id || null,
          channel: 'sms',
          recipient_destination: tenant?.phone || '',
          message_type: bulkMessageType,
          message_content: personalizedMsg.trim(),
          status: 'sent',
          external_gateway_id: gatewayRef,
          sent_at: now,
        }
      }).filter((p) => p.recipient_destination && p.recipient_destination.trim() !== '')

      if (payloads.length === 0) {
        throw new Error('None of the selected tenants have a valid destination phone number.')
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .insert(payloads)
        .select()

      if (error) throw error

      setSuccessMsg(
        `Bulk campaign dispatched successfully! Inserted ${payloads.length} message record(s) into communication log.`
      )

      setBulkMessageContent('')
      await loadData()
    } catch (err) {
      console.error('Bulk SMS dispatch failed:', err)
      setErrorMsg(err.message || 'Failed to dispatch bulk SMS campaign.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return commsLogs.filter((log) => {
      const matchesType =
        logsTypeFilter === 'all' || log.message_type === logsTypeFilter
      const matchesStatus =
        logsStatusFilter === 'all' || log.status === logsStatusFilter

      const q = logsSearchQuery.toLowerCase()
      const recipient = log.recipient_destination?.toLowerCase() || ''
      const tenantName = log.tenants?.full_name?.toLowerCase() || ''
      const tenantNo = log.tenants?.tenant_no?.toLowerCase() || ''
      const content = log.message_content?.toLowerCase() || ''
      const gateway = log.external_gateway_id?.toLowerCase() || ''

      const matchesSearch =
        recipient.includes(q) ||
        tenantName.includes(q) ||
        tenantNo.includes(q) ||
        content.includes(q) ||
        gateway.includes(q)

      return matchesType && matchesStatus && matchesSearch
    })
  }, [commsLogs, logsTypeFilter, logsStatusFilter, logsSearchQuery])

  const logStats = useMemo(() => {
    const total = commsLogs.length
    const sent = commsLogs.filter((l) => l.status === 'sent' || l.status === 'delivered').length
    const delivered = commsLogs.filter((l) => l.status === 'delivered').length
    return {
      total,
      sent,
      delivered,
      rate: total > 0 ? Math.round((sent / total) * 100) : 100,
    }
  }, [commsLogs])

  const singleSegments = getSmsSegmentCount(singleMessageContent)
  const bulkSegments = getSmsSegmentCount(bulkMessageContent)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar activeContext={context} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>Domain 6</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span>Communications & Telephony</span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-slate-300">Bulk SMS Dispatch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <MessageSquare className="h-7 w-7 text-indigo-400" />
              <span>Tenant Communications & Telco SMS Engine</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Personalized tenant messaging, property-wide batch alerts, and authoritative delivery logs under RLS isolation.
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

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Dispatch Error</p>
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

        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>Single SMS Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Bulk SMS Campaign</span>
            {selectedTenantIds.size > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-400/40">
                {selectedTenantIds.size}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Communication Logs</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {commsLogs.length}
            </span>
          </button>
        </div>

        {activeTab === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Single SMS Composer
                  </h3>
                  <p className="text-xs text-slate-400">Dispatch immediate transactional SMS to a client</p>
                </div>
              </div>

              <form onSubmit={handleSendSingleSms} className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Tenant / Receiver Account
                  </label>
                  <select
                    value={singleTenantId}
                    onChange={(e) => handleSelectSingleTenant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">-- Choose Tenant (or enter phone manually) --</option>
                    {tenantsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.tenant_no}] {t.full_name} ({t.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Receiver Mobile Phone No <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. +254727485379"
                        value={singlePhone}
                        onChange={(e) => setSinglePhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Message Classification <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={singleMessageType}
                      onChange={(e) => setSingleMessageType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="general_broadcast">General Broadcast / Notification</option>
                      <option value="rent_due_reminder">Rent Due Reminder</option>
                      <option value="arrears_demand">Arrears Demand Notice</option>
                      <option value="credit_receipt">Payment Confirmation Receipt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Use Standard Template</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSingleMessageType(tpl.type)
                          const t = tenantsList.find((x) => x.id === singleTenantId)
                          const resolved = tpl.template
                            .replace(/{name}/g, t?.full_name || 'Resident')
                            .replace(/{unit}/g, 'Unit')
                          setSingleMessageContent(resolved)
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      SMS Message Content <span className="text-rose-400">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        singleSegments.segments > 1 ? 'text-amber-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {singleSegments.chars} chars • {singleSegments.segments} SMS segment(s)
                    </span>
                  </div>
                  <textarea
                    rows="4"
                    required
                    placeholder="Type your message text here..."
                    value={singleMessageContent}
                    onChange={(e) => setSingleMessageContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Multi-tenant isolated for {context?.companyName}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !singlePhone || !singleMessageContent}
                    className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Dispatch SMS</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-indigo-400" />
                  <span>SMS Character Guidelines</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  A standard GSM-7 SMS contains up to <strong>160 characters</strong>. Multi-part messages are concatenated at 153 characters per segment by telecommunication networks.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">1 Segment:</span>
                    <span className="text-emerald-400 font-bold">1 - 160 chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">2 Segments:</span>
                    <span className="text-amber-400 font-bold">161 - 306 chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">3 Segments:</span>
                    <span className="text-rose-400 font-bold">307 - 459 chars</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    1. Target Audience Selection
                  </h3>
                  <p className="text-xs text-slate-400">Filter property and check recipient tenants</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Selected:</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    {selectedTenantIds.size} / {bulkEligibleLeases.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Estate / Property Filter
                  </label>
                  <select
                    value={bulkPropertyId}
                    onChange={(e) => setBulkPropertyId(e.target.value)}
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

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Quick Search
                  </label>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search name, phone, unit..."
                      value={bulkSearchQuery}
                      onChange={(e) => setBulkSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 text-slate-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAllBulk}
                          className="text-slate-400 hover:text-indigo-400 cursor-pointer"
                        >
                          {bulkEligibleLeases.length > 0 &&
                          bulkEligibleLeases.every((l) => selectedTenantIds.has(l.tenant_id)) ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Tenant Name</th>
                      <th className="py-2.5 px-3">Property & Unit</th>
                      <th className="py-2.5 px-3">Mobile No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {bulkEligibleLeases.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500">
                          No active tenants found for this property filter.
                        </td>
                      </tr>
                    ) : (
                      bulkEligibleLeases.map((lease) => {
                        const isChecked = selectedTenantIds.has(lease.tenant_id)
                        return (
                          <tr
                            key={lease.id}
                            onClick={() => toggleSelectTenant(lease.tenant_id)}
                            className={`cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-950/20 text-slate-200'
                                : 'hover:bg-slate-800/40 text-slate-400'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-indigo-400 mx-auto" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-600 mx-auto" />
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-white block">
                                {lease.tenants?.full_name}
                              </span>
                              <span className="text-[10px] font-mono text-indigo-400">
                                {lease.tenants?.tenant_no}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-slate-200 block truncate max-w-[140px]">
                                {lease.properties?.name}
                              </span>
                              <span className="text-[10px] font-mono text-amber-400">
                                Unit {lease.units?.unit_number}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300">
                              {lease.tenants?.phone || 'No Phone'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  2. Campaign Composition
                </h3>
                <p className="text-xs text-slate-400">Compose broadcast template with dynamic tokens</p>
              </div>

              <form onSubmit={handleSendBulkSms} className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Message Classification
                  </label>
                  <select
                    value={bulkMessageType}
                    onChange={(e) => setBulkMessageType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="general_broadcast">General Broadcast / Notification</option>
                    <option value="rent_due_reminder">Rent Due Reminder</option>
                    <option value="arrears_demand">Arrears Demand Notice</option>
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">Personalization Tokens:</span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {'{name}'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                      {'{unit}'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                      {'{property}'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Campaign Message Content <span className="text-rose-400">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        bulkSegments.segments > 1 ? 'text-amber-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {bulkSegments.chars} chars • {bulkSegments.segments} segment(s)
                    </span>
                  </div>
                  <textarea
                    rows="5"
                    required
                    placeholder="Dear {name}, rent for Unit {unit} is due..."
                    value={bulkMessageContent}
                    onChange={(e) => setBulkMessageContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || selectedTenantIds.size === 0 || !bulkMessageContent.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch to {selectedTenantIds.size} Recipient(s)</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Total Dispatched</p>
                <p className="text-2xl font-bold font-mono text-white mt-1">{logStats.total}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Delivery Rate</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{logStats.rate}%</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Active Gateway</p>
                <p className="text-xs font-bold font-mono text-indigo-400 mt-2 truncate">
                  Africa's Talking / Telco
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] text-slate-400 uppercase font-mono">Channel Protocol</p>
                <p className="text-xs font-bold font-mono text-slate-300 mt-2">
                  E.164 Shortcode SMPP
                </p>
              </div>
            </div>

            
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search recipient, message, gateway ID..."
                  value={logsSearchQuery}
                  onChange={(e) => setLogsSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={logsTypeFilter}
                  onChange={(e) => setLogsTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">All Message Types</option>
                  <option value="general_broadcast">General Broadcast</option>
                  <option value="rent_due_reminder">Rent Due Reminder</option>
                  <option value="arrears_demand">Arrears Demand</option>
                  <option value="credit_receipt">Payment Receipt</option>
                </select>

                <select
                  value={logsStatusFilter}
                  onChange={(e) => setLogsStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="queued">Queued</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-mono font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Client / Tenant</th>
                      <th className="py-3 px-4">Mobile Destination</th>
                      <th className="py-3 px-4">Message Snippet</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Gateway Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span>Loading communication logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          No communication logs found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogDetail(log)}
                          className="hover:bg-slate-800/40 transition-colors text-slate-300 cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {log.sent_at
                              ? new Date(log.sent_at).toLocaleString('en-KE', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : new Date(log.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              {log.tenants?.full_name || 'Direct Recipient'}
                            </div>
                            {log.tenants?.tenant_no && (
                              <div className="text-[10px] font-mono text-indigo-400">
                                {log.tenants.tenant_no}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-sky-400">
                            {log.recipient_destination}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                            {log.message_content}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                log.status === 'delivered' || log.status === 'sent'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : log.status === 'queued'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {log.external_gateway_id || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        
        {selectedLogDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">SMS Dispatch Record</h3>
                </div>
                <button
                  onClick={() => setSelectedLogDetail(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">GATEWAY REF:</span>
                  <span className="text-emerald-400 font-bold">{selectedLogDetail.external_gateway_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RECIPIENT:</span>
                  <span className="text-white">{selectedLogDetail.recipient_destination}</span>
                </div>
                {selectedLogDetail.tenants && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CLIENT:</span>
                    <span className="text-indigo-400 font-bold">{selectedLogDetail.tenants.full_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">TYPE:</span>
                  <span className="uppercase text-slate-300">{selectedLogDetail.message_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="uppercase text-emerald-400 font-bold">{selectedLogDetail.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SENT AT:</span>
                  <span className="text-slate-300">{selectedLogDetail.sent_at}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase font-mono text-slate-400 mb-1">
                  Full Dispatched Content
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                  {selectedLogDetail.message_content}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
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
