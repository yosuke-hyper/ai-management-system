import { supabase } from '@/lib/supabase'

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

interface CreateNotificationParams {
  userId: string
  organizationId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  expiresDays?: number
}

export const notificationService = {
  async create(params: CreateNotificationParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: params.userId,
        p_organization_id: params.organizationId,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_link: params.link || null,
        p_expires_days: params.expiresDays || 30
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Failed to create notification:', err)
      return null
    }
  },

  async createBulk(
    userIds: string[],
    organizationId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    expiresDays?: number
  ): Promise<boolean> {
    try {
      const promises = userIds.map(userId =>
        this.create({
          userId,
          organizationId,
          type,
          title,
          message,
          link,
          expiresDays
        })
      )

      await Promise.all(promises)
      return true
    } catch (err) {
      console.error('Failed to create bulk notifications:', err)
      return false
    }
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      return false
    }
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      return false
    }
  },

  async delete(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to delete notification:', err)
      return false
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return count || 0
    } catch (err) {
      console.error('Failed to get unread count:', err)
      return 0
    }
  },

  async deleteExpired(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('delete_expired_notifications')
      if (error) throw error
      return true
    } catch (err) {
      console.error('Failed to delete expired notifications:', err)
      return false
    }
  }
}

export const NotificationTemplates = {
  dailyReportReminder: (userName: string) => ({
    type: 'info' as NotificationType,
    title: '日報未入力のリマインダー',
    message: `${userName}さん、本日の日報がまだ入力されていません。`,
    link: '/dashboard/report/new'
  }),

  targetAchieved: (storeName: string, percentage: number) => ({
    type: 'success' as NotificationType,
    title: '目標達成',
    message: `${storeName}が月次目標の${percentage}%を達成しました！`,
    link: '/dashboard/targets'
  }),

  aiUsageLimit: (percentage: number) => ({
    type: 'warning' as NotificationType,
    title: 'AI使用量の警告',
    message: `今月のAI使用量が${percentage}%に達しました。プランのアップグレードをご検討ください。`,
    link: '/dashboard/subscription'
  }),

  memberInvited: (inviterName: string, organizationName: string) => ({
    type: 'info' as NotificationType,
    title: '組織に招待されました',
    message: `${inviterName}さんから「${organizationName}」に招待されました。`,
    link: '/dashboard/organization'
  }),

  reportGenerated: (reportType: string, storeName: string) => ({
    type: 'success' as NotificationType,
    title: 'AIレポート生成完了',
    message: `${storeName}の${reportType}レポートが生成されました。`,
    link: '/dashboard/ai-reports'
  }),

  lowPerformance: (storeName: string, percentage: number) => ({
    type: 'warning' as NotificationType,
    title: '売上目標未達の警告',
    message: `${storeName}の売上が目標の${percentage}%です。対策をご検討ください。`,
    link: `/dashboard/daily?store=${storeName}`
  }),

  trialExpiring: (daysRemaining: number, expiryDate: string) => ({
    type: 'warning' as NotificationType,
    title: `トライアル期間が残り${daysRemaining}日です`,
    message: `トライアル期間は${expiryDate}に終了します。継続してご利用いただくには、有料プランへのアップグレードをお願いします。`,
    link: '/dashboard/subscription'
  }),

  paymentFailed: (amount: number) => ({
    type: 'error' as NotificationType,
    title: '支払いに失敗しました',
    message: `サブスクリプションの支払い（¥${amount.toLocaleString()}）が失敗しました。お支払い方法をご確認ください。`,
    link: '/dashboard/subscription'
  }),

  goalAchievement: (storeName: string, achievementRate: number, targetSales: number, actualSales: number) => ({
    type: 'success' as NotificationType,
    title: `🎉 ${storeName}が目標達成！`,
    message: `本日の売上目標を達成しました！目標: ¥${targetSales.toLocaleString()}、実績: ¥${actualSales.toLocaleString()}（達成率: ${Math.floor(achievementRate)}%）`,
    link: '/dashboard/daily',
    expiresDays: 7
  }),

  newMember: (newMemberName: string, newMemberEmail: string, roleLabel: string) => ({
    type: 'info' as NotificationType,
    title: '新しいメンバーが追加されました',
    message: `${newMemberName}さん（${newMemberEmail}）が${roleLabel}として組織に参加しました。`,
    link: '/dashboard/organization'
  }),

  invitationSent: (invitedEmail: string, roleLabel: string) => ({
    type: 'success' as NotificationType,
    title: '招待メールを送信しました',
    message: `${invitedEmail}さんに${roleLabel}としての招待メールを送信しました。`,
    link: '/dashboard/organization',
    expiresDays: 3
  }),

  storeLimitReached: (currentStoreCount: number, limit: number) => ({
    type: 'warning' as NotificationType,
    title: '店舗数が上限に達しました',
    message: `現在のプランでは最大${limit}店舗まで登録できます（現在: ${currentStoreCount}店舗）。追加の店舗を登録するには、プランのアップグレードが必要です。`,
    link: '/dashboard/subscription'
  }),

  systemMaintenance: (maintenanceDate: string, duration: string) => ({
    type: 'info' as NotificationType,
    title: 'システムメンテナンスのお知らせ',
    message: `${maintenanceDate}より${duration}、システムメンテナンスを実施します。この間、一部機能がご利用いただけません。`,
  }),

  exportCompleted: (exportType: string, recordCount: number) => ({
    type: 'success' as NotificationType,
    title: 'データエクスポートが完了しました',
    message: `${exportType}のエクスポートが完了しました（${recordCount}件）。ダウンロードの準備ができました。`,
    expiresDays: 1
  }),

  aiUsageThresholdReached: (percentage: number, currentUsage: number, limit: number) => ({
    type: percentage >= 100 ? 'error' as NotificationType : 'warning' as NotificationType,
    title: percentage >= 100 ? 'AI使用量が上限に達しました' : `AI使用量が${Math.floor(percentage)}%に到達しました`,
    message: percentage >= 100
      ? `今月のAI使用量が上限に達しました（${currentUsage}/${limit}回）。追加のAI機能は来月まで利用できません。`
      : `今月のAI使用量が上限の${Math.floor(percentage)}%に達しました（${currentUsage}/${limit}回）。プランのアップグレードをご検討ください。`,
    link: '/dashboard/subscription'
  })
}
