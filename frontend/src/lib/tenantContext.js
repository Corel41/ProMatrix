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

  // Query branch_memberships for this user
  const { data: memberships, error: membershipError } = await supabase
    .from('branch_memberships')
    .select(`
      company_id,
      branch_id,
      branches (
        id,
        name,
        code,
        city
      ),
      companies (
        id,
        name,
        slug
      )
    `)
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
  cachedContext = {
    userId: user.id,
    companyId: mem.company_id,
    branchId: mem.branch_id,
    companyName: mem.companies?.name || 'ProMatrix Real Estate Agency',
    branchName: mem.branches?.name || 'Thika Head Office',
    branchCode: mem.branches?.code || 'THK-01',
  }

  return cachedContext
}

export function clearTenantContextCache() {
  cachedContext = null
}
