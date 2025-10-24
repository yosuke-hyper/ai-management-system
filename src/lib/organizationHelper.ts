import { supabase } from './supabase'

export async function getCurrentOrganizationId(userId: string): Promise<string | null> {
  if (!userId) return null

  try {
    const { data: memberData, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to get organization ID:', error)
      return null
    }

    return memberData?.organization_id || null
  } catch (error) {
    console.error('Error getting organization ID:', error)
    return null
  }
}

export function addOrganizationFilter<T>(
  query: any,
  organizationId: string | undefined | null
): any {
  if (!organizationId) {
    return query
  }
  return query.eq('organization_id', organizationId)
}

export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!userId || !organizationId) return false

  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      console.error('Failed to validate organization access:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error validating organization access:', error)
    return false
  }
}

export async function getUserOrganizationRole(
  userId: string,
  organizationId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  if (!userId || !organizationId) return null

  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      console.error('Failed to get organization role:', error)
      return null
    }

    return data?.role || null
  } catch (error) {
    console.error('Error getting organization role:', error)
    return null
  }
}

export async function checkOrganizationLimits(organizationId: string): Promise<{
  withinStoreLimit: boolean
  withinUserLimit: boolean
  withinAiRequestLimit: boolean
  currentStores: number
  currentUsers: number
  currentAiRequests: number
  maxStores: number
  maxUsers: number
  maxAiRequests: number
}> {
  if (!organizationId) {
    return {
      withinStoreLimit: false,
      withinUserLimit: false,
      withinAiRequestLimit: false,
      currentStores: 0,
      currentUsers: 0,
      currentAiRequests: 0,
      maxStores: 0,
      maxUsers: 0,
      maxAiRequests: 0
    }
  }

  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('max_stores, max_users, max_ai_requests_per_month')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      throw new Error('Failed to fetch organization limits')
    }

    const { count: storesCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { count: usersCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: aiRequestsCount } = await supabase
      .from('ai_usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString())

    const currentStores = storesCount || 0
    const currentUsers = usersCount || 0
    const currentAiRequests = aiRequestsCount || 0

    return {
      withinStoreLimit: currentStores < org.max_stores,
      withinUserLimit: currentUsers < org.max_users,
      withinAiRequestLimit: currentAiRequests < org.max_ai_requests_per_month,
      currentStores,
      currentUsers,
      currentAiRequests,
      maxStores: org.max_stores,
      maxUsers: org.max_users,
      maxAiRequests: org.max_ai_requests_per_month
    }
  } catch (error) {
    console.error('Error checking organization limits:', error)
    return {
      withinStoreLimit: false,
      withinUserLimit: false,
      withinAiRequestLimit: false,
      currentStores: 0,
      currentUsers: 0,
      currentAiRequests: 0,
      maxStores: 0,
      maxUsers: 0,
      maxAiRequests: 0
    }
  }
}
