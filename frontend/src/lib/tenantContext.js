import { supabase } from './supabase'

let cachedContext = null

export async function getTenantContext() {
  if (cachedContext) {
    return cachedContext
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Not authenticated')
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('branch_memberships')
    .select('company_id, branch_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)

  if (membershipError) {
    console.error('Failed to fetch membership:', membershipError)
    throw membershipError
  }

  if (!memberships || memberships.length === 0) {
    throw new Error('No active branch membership found for this user.')
  }

  const mem = memberships[0]

  const [branchRes, companyRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id, name, code, city')
      .eq('id', mem.branch_id)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('id, name, slug')
      .eq('id', mem.company_id)
      .maybeSingle(),
  ])

  cachedContext = {
    userId: user.id,
    companyId: mem.company_id,
    branchId: mem.branch_id,
    companyName: companyRes?.data?.name || 'ProMatrix Real Estate Agency',
    branchName: branchRes?.data?.name || 'Thika Head Office',
    branchCode: branchRes?.data?.code || 'THK-01',
  }

  return cachedContext
}

export function clearTenantContextCache() {
  cachedContext = null
}
