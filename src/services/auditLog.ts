import { supabase } from '@/lib/supabase'
import { getCurrentUserOrganizationId } from './organizationService'

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.invited'
  | 'user.role_changed'
  | 'store.created'
  | 'store.updated'
  | 'store.deleted'
  | 'report.created'
  | 'report.updated'
  | 'report.deleted'
  | 'report.shared'
  | 'organization.updated'
  | 'organization.settings_changed'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.cancelled'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'

export type ResourceType = 'user' | 'store' | 'report' | 'organization' | 'subscription' | 'auth'

export interface AuditLogEntry {
  id: string
  organization_id: string
  user_id: string | null
  action: AuditAction
  resource_type: ResourceType
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  status: 'success' | 'failure'
  error_message?: string
  created_at: string
}

export interface AuditLogFilters {
  userId?: string
  action?: AuditAction
  resourceType?: ResourceType
  resourceId?: string
  status?: 'success' | 'failure'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * 監査ログを作成
 */
export async function createAuditLog(
  userId: string,
  action: AuditAction,
  resourceType: ResourceType,
  options?: {
    resourceId?: string
    details?: Record<string, any>
    status?: 'success' | 'failure'
    errorMessage?: string
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const organizationId = await getCurrentUserOrganizationId(userId)

    if (!organizationId) {
      console.error('Cannot create audit log: organization not found')
      return { success: false, error: 'Organization not found' }
    }

    const { error } = await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: options?.resourceId,
      details: options?.details || {},
      status: options?.status || 'success',
      error_message: options?.errorMessage
    })

    if (error) {
      console.error('Failed to create audit log:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating audit log:', error)
    return { success: false, error }
  }
}

/**
 * 監査ログを取得（フィルタリング可能）
 */
export async function getAuditLogs(
  organizationId: string,
  filters?: AuditLogFilters
): Promise<{ data: AuditLogEntry[] | null; error: any }> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }

    if (filters?.resourceId) {
      query = query.eq('resource_id', filters.resourceId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    return { data, error }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return { data: null, error }
  }
}

/**
 * 特定リソースの監査ログを取得
 */
export async function getResourceAuditLogs(
  organizationId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<{ data: AuditLogEntry[] | null; error: any }> {
  return getAuditLogs(organizationId, {
    resourceType,
    resourceId,
    limit: 100
  })
}

/**
 * ユーザーアクティビティを取得
 */
export async function getUserActivity(
  organizationId: string,
  userId: string,
  limit: number = 50
): Promise<{ data: AuditLogEntry[] | null; error: any }> {
  return getAuditLogs(organizationId, {
    userId,
    limit
  })
}

/**
 * 監査ログの統計を取得
 */
export async function getAuditLogStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalLogs: number
  successCount: number
  failureCount: number
  actionCounts: Record<string, number>
  userCounts: Record<string, number>
}> {
  const filters: AuditLogFilters = { startDate, endDate }
  const { data: logs } = await getAuditLogs(organizationId, filters)

  if (!logs) {
    return {
      totalLogs: 0,
      successCount: 0,
      failureCount: 0,
      actionCounts: {},
      userCounts: {}
    }
  }

  const actionCounts: Record<string, number> = {}
  const userCounts: Record<string, number> = {}
  let successCount = 0
  let failureCount = 0

  logs.forEach((log) => {
    if (log.status === 'success') successCount++
    else failureCount++

    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1

    if (log.user_id) {
      userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1
    }
  })

  return {
    totalLogs: logs.length,
    successCount,
    failureCount,
    actionCounts,
    userCounts
  }
}

/**
 * アクション名を日本語に変換
 */
export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    'user.created': 'ユーザー作成',
    'user.updated': 'ユーザー更新',
    'user.deleted': 'ユーザー削除',
    'user.invited': 'ユーザー招待',
    'user.role_changed': '権限変更',
    'store.created': '店舗作成',
    'store.updated': '店舗更新',
    'store.deleted': '店舗削除',
    'report.created': 'レポート作成',
    'report.updated': 'レポート更新',
    'report.deleted': 'レポート削除',
    'report.shared': 'レポート共有',
    'organization.updated': '組織情報更新',
    'organization.settings_changed': '組織設定変更',
    'subscription.upgraded': 'プランアップグレード',
    'subscription.downgraded': 'プランダウングレード',
    'subscription.cancelled': 'サブスクリプション解約',
    'auth.login': 'ログイン',
    'auth.logout': 'ログアウト',
    'auth.failed_login': 'ログイン失敗'
  }

  return labels[action] || action
}

/**
 * リソースタイプ名を日本語に変換
 */
export function getResourceTypeLabel(resourceType: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    user: 'ユーザー',
    store: '店舗',
    report: 'レポート',
    organization: '組織',
    subscription: 'サブスクリプション',
    auth: '認証'
  }

  return labels[resourceType] || resourceType
}
