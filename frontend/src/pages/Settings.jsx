import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Building2,
  Shield,
  Users,
  CreditCard,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Lock,
  Mail,
  Smartphone,
  FileCheck2,
  History,
  Sliders,
  Save,
  Plus,
  Key,
  UserCheck,
  Search,
  Eye,
  Edit,
  Trash2,
  Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTenantContext } from '../lib/tenantContext'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company')
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [companyForm, setCompanyForm] = useState({
    name: 'ProMatrix Real Estate Agency',
    slogan: 'Properties. People. Performance.',
    legal_name: 'ProMatrix Management Limited',
    kra_pin: 'P051283921A',
    nssf_no: 'NSSF-492019',
    nhif_no: 'NHIF-820192',
    postal_code: '01000',
    city: 'Thika',
    address_line1: 'Commercial Street, Suite 402',
    phone: '+254712345678',
    email: 'info@promatrix.co.ke',
    base_currency: 'KES',
    time_zone: 'Africa/Nairobi',
  })

  const [mpesaForm, setMpesaForm] = useState({
    paybill_number: '522522, 400200',
    mpesa_shortcode: '522522',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: '',
    mpesa_passkey: '',
    mpesa_b2c_phone: '+254712345678',
  })

  const [notificationForm, setNotificationForm] = useState({
    smtp_host: 'mail.propwings.co.ke',
    smtp_port: 465,
    smtp_username: 'updates@propwings.co.ke',
    smtp_password: '••••••••••••',
    smtp_sender_email: 'updates@propwings.co.ke',
    smtp_alert_emails: 'admin@promatrix.co.ke, accounts@promatrix.co.ke',
    smtp_use_ssl: true,
    sms_sender_id: 'PROPMATRIX',
    sms_api_key: 'MS_LIVE_9821039840192837',
    sms_gateway_url: 'https://api.mobilesasa.com/v1/send/',
  })

  const [approvalForm, setApprovalForm] = useState({
    approval_payment_receipt_limit: 100000,
    approval_expense_voucher_limit: 50000,
    approval_landlord_remittance_limit: 200000,
    approval_deposit_refund_limit: 50000,
    require_maker_checker: true,
  })

  const [selectedRole, setSelectedRole] = useState('property_manager')
  const [rolesList, setRolesList] = useState([
    { id: '1', role_name: 'Company Super Admin', role_slug: 'super_admin' },
    { id: '2', role_name: 'Property Manager', role_slug: 'property_manager' },
    { id: '3', role_name: 'Finance & Accounts Officer', role_slug: 'finance_officer' },
    { id: '4', role_name: 'Site Caretaker / Supervisor', role_slug: 'caretaker' },
    { id: '5', role_name: 'Internal Auditor (Read-Only)', role_slug: 'auditor' },
  ])

  const initialPermissionsMatrix = {
    super_admin: {
      properties: { view: true, create: true, edit: true, delete: true, approve: true },
      tenants: { view: true, create: true, edit: true, delete: true, approve: true },
      leases: { view: true, create: true, edit: true, delete: true, approve: true },
      finance: { view: true, create: true, edit: true, delete: true, approve: true },
      utilities: { view: true, create: true, edit: true, delete: true, approve: true },
      payroll: { view: true, create: true, edit: true, delete: true, approve: true },
      communications: { view: true, create: true, edit: true, delete: true, approve: true },
      administration: { view: true, create: true, edit: true, delete: true, approve: true },
    },
    property_manager: {
      properties: { view: true, create: true, edit: true, delete: false, approve: true },
      tenants: { view: true, create: true, edit: true, delete: false, approve: true },
      leases: { view: true, create: true, edit: true, delete: false, approve: true },
      finance: { view: true, create: true, edit: true, delete: false, approve: false },
      utilities: { view: true, create: true, edit: true, delete: false, approve: true },
      payroll: { view: true, create: false, edit: false, delete: false, approve: false },
      communications: { view: true, create: true, edit: false, delete: false, approve: true },
      administration: { view: true, create: false, edit: false, delete: false, approve: false },
    },
    finance_officer: {
      properties: { view: true, create: false, edit: false, delete: false, approve: false },
      tenants: { view: true, create: false, edit: false, delete: false, approve: false },
      leases: { view: true, create: false, edit: false, delete: false, approve: false },
      finance: { view: true, create: true, edit: true, delete: false, approve: true },
      utilities: { view: true, create: true, edit: true, delete: false, approve: true },
      payroll: { view: true, create: true, edit: true, delete: false, approve: true },
      communications: { view: true, create: true, edit: false, delete: false, approve: false },
      administration: { view: false, create: false, edit: false, delete: false, approve: false },
    },
    caretaker: {
      properties: { view: true, create: false, edit: false, delete: false, approve: false },
      tenants: { view: true, create: false, edit: false, delete: false, approve: false },
      leases: { view: true, create: false, edit: false, delete: false, approve: false },
      finance: { view: false, create: false, edit: false, delete: false, approve: false },
      utilities: { view: true, create: true, edit: true, delete: false, approve: false },
      payroll: { view: false, create: false, edit: false, delete: false, approve: false },
      communications: { view: false, create: false, edit: false, delete: false, approve: false },
      administration: { view: false, create: false, edit: false, delete: false, approve: false },
    },
    auditor: {
      properties: { view: true, create: false, edit: false, delete: false, approve: false },
      tenants: { view: true, create: false, edit: false, delete: false, approve: false },
      leases: { view: true, create: false, edit: false, delete: false, approve: false },
      finance: { view: true, create: false, edit: false, delete: false, approve: false },
      utilities: { view: true, create: false, edit: false, delete: false, approve: false },
      payroll: { view: true, create: false, edit: false, delete: false, approve: false },
      communications: { view: true, create: false, edit: false, delete: false, approve: false },
      administration: { view: true, create: false, edit: false, delete: false, approve: false },
    },
  }

  const [permissionsMatrix, setPermissionsMatrix] = useState(initialPermissionsMatrix)

  const [usersList, setUsersList] = useState([
    {
      id: '1',
      username: 'ckibet',
      full_name: 'Cornelius Kibet',
      email: 'cornelius.kibet@promatrix.co.ke',
      employee_no: 'EMP-001',
      role: 'Property Manager',
      status: 'active',
      last_login: 'Today, 19:35',
    },
    {
      id: '2',
      username: 'gwanjiru',
      full_name: 'Grace Wanjiru',
      email: 'grace.wanjiru@promatrix.co.ke',
      employee_no: 'EMP-003',
      role: 'Finance & Accounts Officer',
      status: 'active',
      last_login: 'Today, 18:12',
    },
    {
      id: '3',
      username: 'sndungu',
      full_name: "Samuel Ndung'u",
      email: 'samuel.ndungu@promatrix.co.ke',
      employee_no: 'EMP-002',
      role: 'Site Caretaker / Supervisor',
      status: 'active',
      last_login: 'Yesterday, 16:45',
    },
    {
      id: '4',
      username: 'auditor1',
      full_name: 'Mercy Achieng',
      email: 'audit@promatrix.co.ke',
      employee_no: 'EMP-EXT-09',
      role: 'Internal Auditor (Read-Only)',
      status: 'active',
      last_login: '11 Oct 2026, 11:20',
    },
  ])

  const [auditLogs, setAuditLogs] = useState([
    {
      id: '1',
      timestamp: 'Today, 19:46:12',
      actor: 'Cornelius Kibet (ckibet)',
      action: 'Payroll Run Committed',
      module: 'HR & Payroll',
      description: 'Processed monthly remuneration for October 2026. 3 payslips batched.',
      status: 'Success',
    },
    {
      id: '2',
      timestamp: 'Today, 19:43:35',
      actor: 'Cornelius Kibet (ckibet)',
      action: 'Staff Registration',
      module: 'Staff Registry',
      description: 'Created employee records for Cornelius Kibet, Samuel Ndung\'u, Grace Wanjiru.',
      status: 'Success',
    },
    {
      id: '3',
      timestamp: 'Today, 19:26:40',
      actor: 'Cornelius Kibet (ckibet)',
      action: 'UI Theme Pass Applied',
      module: 'System Administration',
      description: 'Applied full-bleed layout and enterprise theme configuration.',
      status: 'Success',
    },
    {
      id: '4',
      timestamp: 'Today, 18:30:15',
      actor: 'Grace Wanjiru (gwanjiru)',
      action: 'Manual Receipt Allocation',
      module: 'Finance & Receipting',
      description: 'Allocated KES 25,000 credit to rent & service charge line items.',
      status: 'Success',
    },
    {
      id: '5',
      timestamp: 'Today, 17:15:00',
      actor: 'Samuel Ndung\'u (sndungu)',
      action: 'Meter Readings Batch',
      module: 'Utilities',
      description: 'Captured monthly water meter units across Mowlem Heights.',
      status: 'Success',
    },
  ])

  const loadSettings = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const tenant = await getTenantContext()
      setContext(tenant)

      const { data: setRes, error: setErr } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', tenant.companyId)
        .maybeSingle()

      if (setRes) {
        setCompanyForm((prev) => ({
          ...prev,
          name: tenant.companyName || prev.name,
          slogan: setRes.slogan || prev.slogan,
          kra_pin: setRes.kra_pin || prev.kra_pin,
          nssf_no: setRes.nssf_no || prev.nssf_no,
          nhif_no: setRes.nhif_no || prev.nhif_no,
          postal_code: setRes.postal_code || prev.postal_code,
        }))

        setMpesaForm((prev) => ({
          ...prev,
          paybill_number: setRes.paybill_number || prev.paybill_number,
          mpesa_shortcode: setRes.mpesa_shortcode || prev.mpesa_shortcode,
          mpesa_b2c_phone: setRes.mpesa_b2c_phone || prev.mpesa_b2c_phone,
        }))

        setNotificationForm((prev) => ({
          ...prev,
          smtp_host: setRes.smtp_host || prev.smtp_host,
          smtp_port: setRes.smtp_port || prev.smtp_port,
          smtp_username: setRes.smtp_username || prev.smtp_username,
          smtp_sender_email: setRes.smtp_sender_email || prev.smtp_sender_email,
          smtp_alert_emails: setRes.smtp_alert_emails || prev.smtp_alert_emails,
          sms_sender_id: setRes.sms_sender_id || prev.sms_sender_id,
        }))

        setApprovalForm({
          approval_payment_receipt_limit: parseFloat(setRes.approval_payment_receipt_limit || 100000),
          approval_expense_voucher_limit: parseFloat(setRes.approval_expense_voucher_limit || 50000),
          approval_landlord_remittance_limit: parseFloat(setRes.approval_landlord_remittance_limit || 200000),
          approval_deposit_refund_limit: parseFloat(setRes.approval_deposit_refund_limit || 50000),
          require_maker_checker: !!setRes.require_maker_checker,
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setErrorMsg(err.message || 'Failed to load system settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      if (!context) throw new Error('Tenant context missing.')

      const payload = {
        company_id: context.companyId,
        branch_id: context.branchId,
        slogan: companyForm.slogan,
        kra_pin: companyForm.kra_pin,
        nssf_no: companyForm.nssf_no,
        nhif_no: companyForm.nhif_no,
        postal_code: companyForm.postal_code,
        paybill_number: mpesaForm.paybill_number,
        mpesa_shortcode: mpesaForm.mpesa_shortcode,
        mpesa_b2c_phone: mpesaForm.mpesa_b2c_phone,
        smtp_host: notificationForm.smtp_host,
        smtp_port: parseInt(notificationForm.smtp_port, 10),
        smtp_username: notificationForm.smtp_username,
        smtp_sender_email: notificationForm.smtp_sender_email,
        smtp_alert_emails: notificationForm.smtp_alert_emails,
        sms_sender_id: notificationForm.sms_sender_id,
        approval_payment_receipt_limit: parseFloat(approvalForm.approval_payment_receipt_limit),
        approval_expense_voucher_limit: parseFloat(approvalForm.approval_expense_voucher_limit),
        approval_landlord_remittance_limit: parseFloat(approvalForm.approval_landlord_remittance_limit),
        approval_deposit_refund_limit: parseFloat(approvalForm.approval_deposit_refund_limit),
        require_maker_checker: approvalForm.require_maker_checker,
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert([payload], { onConflict: 'company_id,branch_id' })

      if (error) throw error

      setSuccessMsg('System configuration and enterprise settings saved successfully!')
    } catch (err) {
      console.error('Save settings error:', err)
      setErrorMsg(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePermission = (moduleKey, permKey) => {
    setPermissionsMatrix((prev) => {
      const currentVal = prev[selectedRole]?.[moduleKey]?.[permKey]
      return {
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [moduleKey]: {
            ...prev[selectedRole]?.[moduleKey],
            [permKey]: !currentVal,
          },
        },
      }
    })
  }

  const moduleDefinitions = [
    { key: 'properties', label: 'Domain 1: Properties & Estates' },
    { key: 'tenants', label: 'Domain 2: Landlords & Beneficial Owners' },
    { key: 'leases', label: 'Domain 3: Tenancy & Leases' },
    { key: 'utilities', label: 'Domain 4: Utility Meter Readings' },
    { key: 'finance', label: 'Domain 5: Financial Ledger & Receipting' },
    { key: 'communications', label: 'Domain 6: Communications & Bulk SMS' },
    { key: 'payroll', label: 'Domain 7: HR & Statutory Payroll' },
    { key: 'administration', label: 'Domain 8: System Administration' },
  ]

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'users', label: 'System Users', icon: Users },
    { id: 'mpesa', label: 'M-Pesa Integration', icon: CreditCard },
    { id: 'notifications', label: 'Email & SMS Gateways', icon: Bell },
    { id: 'approvals', label: 'Approval Workflows', icon: FileCheck2 },
    { id: 'audit', label: 'System Audit Trail', icon: History },
  ]

  return (
    <div className="w-full px-8 py-6 space-y-6 bg-surface-950 text-surface-100 min-h-full">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-400 mb-1">
            <span>Domain 8</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span>Administration</span>
            <ChevronRight className="h-3 w-3 text-surface-600" />
            <span className="text-surface-300">Enterprise Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <SettingsIcon className="h-7 w-7 text-brand-400" />
            <span>System Administration & Settings</span>
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Authoritative configuration hub mirroring legacy Propwings administration, roles, and M-Pesa channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-surface-900/80 hover:bg-surface-850 text-surface-300 border border-surface-800 shadow-soft transition-all cursor-pointer"
            title="Reload settings"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft shadow-brand-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-coral-950/30 border border-coral-500/30 text-coral-300 text-xs flex items-start gap-3 shadow-card">
          <AlertCircle className="h-4 w-4 text-coral-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-coral-200">Configuration Error</p>
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-850/80">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-brand-600 text-white shadow-soft shadow-brand-600/25'
                  : 'bg-surface-900/60 text-surface-400 hover:text-white hover:bg-surface-850/80 border border-surface-800/80'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'company' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-400" />
              <span>Company Information & Statutory Registration</span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Defines legal entity details, official branding, and statutory numbers shown on tenant statements and invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Company Trade Name</label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Company Slogan</label>
              <input
                type="text"
                value={companyForm.slogan}
                onChange={(e) => setCompanyForm({ ...companyForm, slogan: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white italic focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">KRA Tax PIN</label>
              <input
                type="text"
                value={companyForm.kra_pin}
                onChange={(e) => setCompanyForm({ ...companyForm, kra_pin: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">NSSF Employer No</label>
              <input
                type="text"
                value={companyForm.nssf_no}
                onChange={(e) => setCompanyForm({ ...companyForm, nssf_no: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">NHIF Employer No</label>
              <input
                type="text"
                value={companyForm.nhif_no}
                onChange={(e) => setCompanyForm({ ...companyForm, nhif_no: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Physical Address</label>
              <input
                type="text"
                value={companyForm.address_line1}
                onChange={(e) => setCompanyForm({ ...companyForm, address_line1: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">City / Municipality</label>
              <input
                type="text"
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Postal Code</label>
              <input
                type="text"
                value={companyForm.postal_code}
                onChange={(e) => setCompanyForm({ ...companyForm, postal_code: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Official Mobile Phone</label>
              <input
                type="text"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Support Email Address</label>
              <input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-400" />
                <span>Role-Based Access Control (RBAC) Matrix</span>
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Configure module granular privileges for operational roles across the multi-tenant estate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400 font-medium">Select Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-surface-950 border border-surface-800 text-xs text-brand-300 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500/80"
              >
                {rolesList.map((r) => (
                  <option key={r.role_slug} value={r.role_slug} className="bg-surface-900 text-white">
                    {r.role_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-surface-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-950 text-surface-400 uppercase font-mono font-medium text-[11px] border-b border-surface-800">
                  <th className="py-3 px-4">Functional Module</th>
                  <th className="py-3 px-4 text-center">View (Read)</th>
                  <th className="py-3 px-4 text-center">Create (Add)</th>
                  <th className="py-3 px-4 text-center">Edit (Update)</th>
                  <th className="py-3 px-4 text-center">Delete (Remove)</th>
                  <th className="py-3 px-4 text-center">Approve (Post)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850/60 font-sans">
                {moduleDefinitions.map((mod) => {
                  const perms = permissionsMatrix[selectedRole]?.[mod.key] || {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                    approve: false,
                  }

                  return (
                    <tr key={mod.key} className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/40">
                      <td className="py-3 px-4 font-semibold text-surface-200">{mod.label}</td>
                      {['view', 'create', 'edit', 'delete', 'approve'].map((permKey) => (
                        <td key={permKey} className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(mod.key, permKey)}
                            className={`h-6 w-6 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                              perms[permKey]
                                ? 'bg-mint-500/20 text-mint-400 border border-mint-500/40 hover:bg-mint-500/30'
                                : 'bg-surface-950 text-surface-600 border border-surface-800 hover:text-surface-400'
                            }`}
                          >
                            {perms[permKey] ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-400" />
                <span>Authorized System Users</span>
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Staff login credentials, active status controls, and role assignments.
              </p>
            </div>

            <button
              onClick={() => {
                setSuccessMsg('New user provisioning modal initialized.')
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-soft transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Provision User</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-surface-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-950 text-surface-400 uppercase font-mono font-medium text-[11px] border-b border-surface-800">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Staff Code</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850/60 font-sans">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/40">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{usr.full_name}</div>
                      <div className="text-[11px] text-surface-400">{usr.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-300 font-semibold">{usr.username}</td>
                    <td className="py-3 px-4 font-mono text-surface-400">{usr.employee_no}</td>
                    <td className="py-3 px-4 font-medium text-surface-200">{usr.role}</td>
                    <td className="py-3 px-4 text-surface-400">{usr.last_login}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-mint-950/40 text-mint-400 border border-mint-500/20 font-mono">
                        {usr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSuccessMsg(`Password reset link queued for ${usr.username}.`)}
                        className="px-2.5 py-1 rounded-lg text-[11px] bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium transition-colors cursor-pointer"
                      >
                        Reset Pwd
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'mpesa' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-mint-400" />
              <span>Safaricom M-Pesa C2B Paybill & B2C Disbursal</span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Configures automated rent collection paybills and automated landlord/staff disbursement lines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">
                Active Paybill Number(s) <span className="text-surface-500">(Comma-separated)</span>
              </label>
              <input
                type="text"
                value={mpesaForm.paybill_number}
                onChange={(e) => setMpesaForm({ ...mpesaForm, paybill_number: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">C2B Primary Shortcode</label>
              <input
                type="text"
                value={mpesaForm.mpesa_shortcode}
                onChange={(e) => setMpesaForm({ ...mpesaForm, mpesa_shortcode: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Daraja Consumer Key</label>
              <input
                type="password"
                placeholder="Enter Safaricom Daraja Consumer Key..."
                value={mpesaForm.mpesa_consumer_key}
                onChange={(e) => setMpesaForm({ ...mpesaForm, mpesa_consumer_key: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Daraja Consumer Secret</label>
              <input
                type="password"
                placeholder="Enter Safaricom Daraja Consumer Secret..."
                value={mpesaForm.mpesa_consumer_secret}
                onChange={(e) => setMpesaForm({ ...mpesaForm, mpesa_consumer_secret: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1">B2C Bulk Disbursal Phone</label>
            <input
              type="text"
              value={mpesaForm.mpesa_b2c_phone}
              onChange={(e) => setMpesaForm({ ...mpesaForm, mpesa_b2c_phone: e.target.value })}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
            />
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-400" />
              <span>Email (SMTP) & Bulk SMS Gateway Configuration</span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Connects transactional notifications, tenant rent reminders, and management alert emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">SMTP Server Host</label>
              <input
                type="text"
                value={notificationForm.smtp_host}
                onChange={(e) => setNotificationForm({ ...notificationForm, smtp_host: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">SMTP Port</label>
              <input
                type="number"
                value={notificationForm.smtp_port}
                onChange={(e) => setNotificationForm({ ...notificationForm, smtp_port: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Sender Email Address</label>
              <input
                type="email"
                value={notificationForm.smtp_sender_email}
                onChange={(e) => setNotificationForm({ ...notificationForm, smtp_sender_email: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Bulk SMS Sender ID</label>
              <input
                type="text"
                value={notificationForm.sms_sender_id}
                onChange={(e) => setNotificationForm({ ...notificationForm, sms_sender_id: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase font-bold focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">Management Alert Emails (CC)</label>
              <input
                type="text"
                value={notificationForm.smtp_alert_emails}
                onChange={(e) => setNotificationForm({ ...notificationForm, smtp_alert_emails: e.target.value })}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-brand-400" />
              <span>Maker-Checker Governance & Approval Limits</span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Enforces managerial sign-off when financial postings exceed threshold values.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">
                Receipt Approval Threshold (KES)
              </label>
              <input
                type="number"
                value={approvalForm.approval_payment_receipt_limit}
                onChange={(e) =>
                  setApprovalForm({ ...approvalForm, approval_payment_receipt_limit: e.target.value })
                }
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">
                Expense Voucher Limit (KES)
              </label>
              <input
                type="number"
                value={approvalForm.approval_expense_voucher_limit}
                onChange={(e) =>
                  setApprovalForm({ ...approvalForm, approval_expense_voucher_limit: e.target.value })
                }
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">
                Landlord Remittance Limit (KES)
              </label>
              <input
                type="number"
                value={approvalForm.approval_landlord_remittance_limit}
                onChange={(e) =>
                  setApprovalForm({ ...approvalForm, approval_landlord_remittance_limit: e.target.value })
                }
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1">
                Tenant Deposit Refund Limit (KES)
              </label>
              <input
                type="number"
                value={approvalForm.approval_deposit_refund_limit}
                onChange={(e) =>
                  setApprovalForm({ ...approvalForm, approval_deposit_refund_limit: e.target.value })
                }
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500/80 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="require_maker_checker"
              checked={approvalForm.require_maker_checker}
              onChange={(e) => setApprovalForm({ ...approvalForm, require_maker_checker: e.target.checked })}
              className="rounded bg-surface-950 border-surface-800 text-brand-600 focus:ring-0 h-4 w-4"
            />
            <label htmlFor="require_maker_checker" className="text-xs text-surface-300 cursor-pointer">
              Enforce strict Maker-Checker sign-off: Operations posted above limits remain unconfirmed until authorized by manager.
            </label>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-3xl p-6 shadow-card space-y-6">
          <div className="border-b border-surface-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-brand-400" />
              <span>Immutable System Audit Trail</span>
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Chronological log of user actions, financial postings, and access changes across {context?.branchName}.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-surface-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-950 text-surface-400 uppercase font-mono font-medium text-[11px] border-b border-surface-800">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User / Actor</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Audit Description</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850/60 font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="even:bg-surface-900/40 odd:bg-surface-950/20 hover:bg-surface-850/40">
                    <td className="py-3 px-4 font-mono text-surface-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{log.actor}</td>
                    <td className="py-3 px-4 text-surface-300 whitespace-nowrap">{log.module}</td>
                    <td className="py-3 px-4 font-mono font-medium text-brand-300 whitespace-nowrap">{log.action}</td>
                    <td className="py-3 px-4 text-surface-300">{log.description}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-mint-950/40 text-mint-400 border border-mint-500/20 font-mono">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
