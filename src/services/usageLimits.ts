import { supabase } from '@/lib/supabase'
import { getCurrentUserOrganizationId } from './organizationService'

export interface UsageLimits {
  maxStores: number
  maxUsers: number
  maxAIRequestsPerMonth: number
}

export interface CurrentUsage {
  storeCount: number
  userCount: number
  aiRequestCount: number
}

export interface UsageStatus {
  limits: UsageLimits
  current: CurrentUsage
  canAddStore: boolean
  canAddUser: boolean
  canUseAI: boolean
  storesRemaining: number
  usersRemaining: number
  aiRequestsRemaining: number
}

/**
 * 組織の使用制限を取得
 */
export async function getOrganizationLimits(organizationId: string): Promise<UsageLimits> {
  const { data, error } = await supabase
    .from('organizations')
    .select('max_stores, max_users, max_ai_requests_per_month')
    .eq('id', organizationId)
    .single()

  if (error) {
    console.error('Failed to get organization limits:', error)
    return {
      maxStores: 1,
      maxUsers: 3,
      maxAIRequestsPerMonth: 50
    }
  }

  return {
    maxStores: data.max_stores,
    maxUsers: data.max_users,
    maxAIRequestsPerMonth: data.max_ai_requests_per_month
  }
}

/**
 * 現在の店舗数を取得
 */
export async function getCurrentStoreCount(organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Failed to get store count:', error)
    return 0
  }

  return count || 0
}

/**
 * 現在のユーザー数を取得
 */
export async function getCurrentUserCount(organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('organization_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Failed to get user count:', error)
    return 0
  }

  return count || 0
}

/**
 * 今月のAI使用回数を取得
 */
export async function getCurrentAIUsageCount(organizationId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('ai_chat_archive')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('Failed to get AI usage count:', error)
    return 0
  }

  return count || 0
}

/**
 * 使用状況を取得
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus | null> {
  const organizationId = await getCurrentUserOrganizationId(userId)

  if (!organizationId) {
    return null
  }

  const [limits, storeCount, userCount, aiRequestCount] = await Promise.all([
    getOrganizationLimits(organizationId),
    getCurrentStoreCount(organizationId),
    getCurrentUserCount(organizationId),
    getCurrentAIUsageCount(organizationId)
  ])

  const canAddStore = limits.maxStores === 0 || storeCount < limits.maxStores
  const canAddUser = limits.maxUsers === 0 || userCount < limits.maxUsers
  const canUseAI = limits.maxAIRequestsPerMonth === 0 || aiRequestCount < limits.maxAIRequestsPerMonth

  return {
    limits,
    current: {
      storeCount,
      userCount,
      aiRequestCount
    },
    canAddStore,
    canAddUser,
    canUseAI,
    storesRemaining: limits.maxStores === 0 ? Infinity : Math.max(0, limits.maxStores - storeCount),
    usersRemaining: limits.maxUsers === 0 ? Infinity : Math.max(0, limits.maxUsers - userCount),
    aiRequestsRemaining: limits.maxAIRequestsPerMonth === 0 ? Infinity : Math.max(0, limits.maxAIRequestsPerMonth - aiRequestCount)
  }
}

/**
 * 店舗追加が可能かチェック
 */
export async function canAddStore(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const status = await getUsageStatus(userId)

  if (!status) {
    return { allowed: false, message: '組織情報が見つかりません' }
  }

  if (!status.canAddStore) {
    return {
      allowed: false,
      message: `店舗数の上限（${status.limits.maxStores}店舗）に達しています。プランをアップグレードしてください。`
    }
  }

  return { allowed: true }
}

/**
 * ユーザー招待が可能かチェック
 */
export async function canInviteUser(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const status = await getUsageStatus(userId)

  if (!status) {
    return { allowed: false, message: '組織情報が見つかりません' }
  }

  if (!status.canAddUser) {
    return {
      allowed: false,
      message: `ユーザー数の上限（${status.limits.maxUsers}名）に達しています。プランをアップグレードしてください。`
    }
  }

  return { allowed: true }
}

/**
 * AI使用が可能かチェック
 */
export async function canUseAI(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const status = await getUsageStatus(userId)

  if (!status) {
    return { allowed: false, message: '組織情報が見つかりません' }
  }

  if (!status.canUseAI) {
    return {
      allowed: false,
      message: `今月のAI使用回数の上限（${status.limits.maxAIRequestsPerMonth}回）に達しています。来月まで待つか、プランをアップグレードしてください。`
    }
  }

  return { allowed: true }
}

/**
 * 使用量の割合を計算
 */
export function getUsagePercentage(current: number, max: number): number {
  if (max === 0) return 0
  return Math.min(Math.round((current / max) * 100), 100)
}

/**
 * 使用量の状態を取得
 */
export function getUsageState(current: number, max: number): 'safe' | 'warning' | 'critical' | 'exceeded' {
  if (max === 0) return 'safe'

  const percentage = (current / max) * 100

  if (current >= max) return 'exceeded'
  if (percentage >= 90) return 'critical'
  if (percentage >= 75) return 'warning'
  return 'safe'
}
