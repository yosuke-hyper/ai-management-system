import { supabase } from '@/lib/supabase'
import { getCurrentUserOrganizationId } from './organizationservice'

/**
 * ブラウザのコンテキスト情報を取得
 */
export function getContextInfo(): { ipAddress?: string; userAgent?: string } {
  return {
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  }
}

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.invited'
  | 'user.role_changed'
  | 'user.removed'
  | 'store.created'
  | 'store.updated'
  | 'store.deleted'
  | 'store.activated'
  | 'store.deactivated'
  | 'report.created'
  | 'report.updated'
  | 'report.deleted'
  | 'report.shared'
  | 'report.exported'
  | 'organization.updated'
  | 'organization.settings_changed'
  | 'organization.member_added'
  | 'organization.member_removed'
  | 'subscription.created'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.cancelled'
  | 'subscription.renewed'
  | 'data.imported'
  | 'data.exported'
  | 'data.bulk_deleted'
  | 'settings.changed'
  | 'ai.report_generated'
  | 'ai.chat_initiated'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_changed'
  | 'auth.password_reset_requested'

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
  searchTerm?: string
  limit?: number
  offset?: number
}

export interface AuditLogSettings {
  id: string
  organization_id: string
  retention_days: number
  auto_archive_enabled: boolean
  archive_to_cold_storage: boolean
  created_at: string
  updated_at: string
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
    oldValue?: Record<string, any>
    newValue?: Record<string, any>
    status?: 'success' | 'failure'
    errorMessage?: string
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const organizationId = await getCurrentUserOrganizationId(userId)

    if (!organizationId) {
      console.error('Cannot create audit log: organization not found')
      return { success: false, error: 'Organization not found' }
    }

    // 詳細情報を構築
    const details = options?.details || {}
    if (options?.oldValue) {
      details.before = options.oldValue
    }
    if (options?.newValue) {
      details.after = options.newValue
    }

    // 変更された項目を抽出
    if (options?.oldValue && options?.newValue) {
      const changes: Record<string, { from: any; to: any }> = {}
      const allKeys = new Set([
        ...Object.keys(options.oldValue),
        ...Object.keys(options.newValue)
      ])

      allKeys.forEach(key => {
        const oldVal = options.oldValue![key]
        const newVal = options.newValue![key]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes[key] = { from: oldVal, to: newVal }
        }
      })

      if (Object.keys(changes).length > 0) {
        details.changes = changes
      }
    }

    const { error } = await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: options?.resourceId,
      details,
      ip_address: options?.ipAddress,
      user_agent: options?.userAgent,
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
 * 変更履歴付きの監査ログを作成（更新操作用）
 */
export async function createUpdateAuditLog(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  oldValue: Record<string, any>,
  newValue: Record<string, any>,
  options?: {
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ success: boolean; error?: any }> {
  const actionMap: Record<ResourceType, AuditAction> = {
    user: 'user.updated',
    store: 'store.updated',
    report: 'report.updated',
    organization: 'organization.updated',
    subscription: 'subscription.upgraded',
    auth: 'auth.login'
  }

  return createAuditLog(userId, actionMap[resourceType], resourceType, {
    resourceId,
    oldValue,
    newValue,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent
  })
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
    'user.removed': 'ユーザー削除',
    'store.created': '店舗作成',
    'store.updated': '店舗更新',
    'store.deleted': '店舗削除',
    'store.activated': '店舗有効化',
    'store.deactivated': '店舗無効化',
    'report.created': 'レポート作成',
    'report.updated': 'レポート更新',
    'report.deleted': 'レポート削除',
    'report.shared': 'レポート共有',
    'report.exported': 'レポートエクスポート',
    'organization.updated': '組織情報更新',
    'organization.settings_changed': '組織設定変更',
    'organization.member_added': 'メンバー追加',
    'organization.member_removed': 'メンバー削除',
    'subscription.created': 'サブスクリプション作成',
    'subscription.upgraded': 'プランアップグレード',
    'subscription.downgraded': 'プランダウングレード',
    'subscription.cancelled': 'サブスクリプション解約',
    'subscription.renewed': 'サブスクリプション更新',
    'data.imported': 'データインポート',
    'data.exported': 'データエクスポート',
    'data.bulk_deleted': 'データ一括削除',
    'settings.changed': '設定変更',
    'ai.report_generated': 'AIレポート生成',
    'ai.chat_initiated': 'AIチャット開始',
    'auth.login': 'ログイン',
    'auth.logout': 'ログアウト',
    'auth.failed_login': 'ログイン失敗',
    'auth.password_changed': 'パスワード変更',
    'auth.password_reset_requested': 'パスワードリセット要求'
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

/**
 * 監査ログ設定を取得
 */
export async function getAuditLogSettings(
  organizationId: string
): Promise<{ data: AuditLogSettings | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('audit_log_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()

    return { data, error }
  } catch (error) {
    console.error('Error fetching audit log settings:', error)
    return { data: null, error }
  }
}

/**
 * 監査ログ設定を更新
 */
export async function updateAuditLogSettings(
  organizationId: string,
  settings: Partial<Pick<AuditLogSettings, 'retention_days' | 'auto_archive_enabled' | 'archive_to_cold_storage'>>
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('audit_log_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Failed to update audit log settings:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating audit log settings:', error)
    return { success: false, error }
  }
}

/**
 * アーカイブされた監査ログを取得
 */
export async function getArchivedAuditLogs(
  organizationId: string,
  filters?: AuditLogFilters
): Promise<{ data: AuditLogEntry[] | null; error: any }> {
  try {
    let query = supabase
      .from('audit_logs_archive')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    return { data, error }
  } catch (error) {
    console.error('Error fetching archived audit logs:', error)
    return { data: null, error }
  }
}
