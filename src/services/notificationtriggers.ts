import { supabase } from '@/lib/supabase';
import { notificationService, NotificationTemplates } from './notificationservice';

/**
 * 通知トリガーサービス
 * 各種イベント発生時に自動的に通知を作成
 */

/**
 * AI使用量をチェックして、閾値に達した場合に通知
 */
export async function checkAndNotifyAIUsage(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    // 現在の使用状況を取得
    const { data: settings, error: settingsError } = await supabase
      .from('ai_usage_settings')
      .select('monthly_allocation')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('Failed to fetch AI usage settings:', settingsError);
      return;
    }

    const monthlyLimit = settings.monthly_allocation || 100;

    // 今月の使用回数を取得
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usageCount, error: countError } = await supabase
      .from('ai_usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) {
      console.error('Failed to count AI usage:', countError);
      return;
    }

    const currentUsage = usageCount || 0;
    const percentage = (currentUsage / monthlyLimit) * 100;

    // 既に通知済みかチェック（重複通知を防ぐ）
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .like('title', '%AI使用量%')
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    // 80%、90%、100%の閾値で通知
    const shouldNotify =
      (percentage >= 80 && percentage < 90 && !existingNotifications?.length) ||
      (percentage >= 90 && percentage < 100 && !existingNotifications?.length) ||
      (percentage >= 100 && !existingNotifications?.length);

    if (shouldNotify) {
      const template = NotificationTemplates.aiUsageThresholdReached(
        percentage,
        currentUsage,
        monthlyLimit
      );

      await notificationService.create({
        userId,
        organizationId,
        ...template,
      });

      console.log(`AI usage notification sent: ${percentage}% (${currentUsage}/${monthlyLimit})`);
    }
  } catch (error) {
    console.error('Error checking AI usage for notifications:', error);
  }
}

/**
 * トライアル期限をチェックして通知
 */
export async function checkAndNotifyTrialExpiring(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    // 組織のサブスクリプション情報を取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subError || !subscription) {
      return;
    }

    // トライアル中でない場合はスキップ
    if (subscription.status !== 'trialing') {
      return;
    }

    const trialEnd = new Date(subscription.trial_end || subscription.current_period_end);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 7日前、3日前、1日前に通知
    const shouldNotify = [7, 3, 1].includes(daysRemaining);

    if (shouldNotify) {
      // 同じ日に既に通知済みかチェック
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .like('title', '%トライアル%')
        .gte('created_at', today.toISOString());

      if (!existingNotifications?.length) {
        const template = NotificationTemplates.trialExpiring(
          daysRemaining,
          trialEnd.toLocaleDateString('ja-JP')
        );

        await notificationService.create({
          userId,
          organizationId,
          ...template,
        });

        console.log(`Trial expiring notification sent: ${daysRemaining} days remaining`);
      }
    }
  } catch (error) {
    console.error('Error checking trial expiration for notifications:', error);
  }
}

/**
 * 日次目標達成をチェックして通知
 */
export async function checkAndNotifyGoalAchievement(
  storeId: string,
  date: string
): Promise<void> {
  try {
    // 店舗情報を取得
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, organization_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return;
    }

    // その日の日報を取得
    const { data: report, error: reportError } = await supabase
      .from('daily_reports')
      .select('sales, target_sales')
      .eq('store_id', storeId)
      .eq('date', date)
      .maybeSingle();

    if (reportError || !report || !report.target_sales) {
      return;
    }

    const actualSales = report.sales || 0;
    const targetSales = report.target_sales;
    const achievementRate = (actualSales / targetSales) * 100;

    // 目標達成（100%以上）の場合のみ通知
    if (achievementRate >= 100) {
      // 組織の管理者とその店舗の担当者に通知
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, profiles!inner(role)')
        .eq('organization_id', store.organization_id)
        .in('profiles.role', ['admin', 'manager']);

      if (members && members.length > 0) {
        const template = NotificationTemplates.goalAchievement(
          store.name,
          achievementRate,
          targetSales,
          actualSales
        );

        // 各メンバーに通知を作成
        const notifications = members.map((member) =>
          notificationService.create({
            userId: member.user_id,
            organizationId: store.organization_id,
            ...template,
          })
        );

        await Promise.all(notifications);
        console.log(`Goal achievement notification sent for ${store.name}: ${achievementRate}%`);
      }
    }
  } catch (error) {
    console.error('Error checking goal achievement for notifications:', error);
  }
}

/**
 * 低パフォーマンス店舗を検出して通知
 */
export async function checkAndNotifyLowPerformance(
  storeId: string,
  date: string
): Promise<void> {
  try {
    // 店舗情報を取得
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, organization_id')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return;
    }

    // その日の日報を取得
    const { data: report, error: reportError } = await supabase
      .from('daily_reports')
      .select('sales, target_sales')
      .eq('store_id', storeId)
      .eq('date', date)
      .maybeSingle();

    if (reportError || !report || !report.target_sales) {
      return;
    }

    const actualSales = report.sales || 0;
    const targetSales = report.target_sales;
    const achievementRate = (actualSales / targetSales) * 100;

    // 目標の70%未満の場合に警告通知
    if (achievementRate < 70) {
      // 組織の管理者とその店舗の担当者に通知
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, profiles!inner(role)')
        .eq('organization_id', store.organization_id)
        .in('profiles.role', ['admin', 'manager']);

      if (members && members.length > 0) {
        const template = NotificationTemplates.lowPerformance(
          store.name,
          Math.round(achievementRate)
        );

        // 管理者にのみ通知（スタッフには送らない）
        const notifications = members
          .filter((m) => (m.profiles as any).role === 'admin')
          .map((member) =>
            notificationService.create({
              userId: member.user_id,
              organizationId: store.organization_id,
              ...template,
            })
          );

        await Promise.all(notifications);
        console.log(`Low performance notification sent for ${store.name}: ${achievementRate}%`);
      }
    }
  } catch (error) {
    console.error('Error checking low performance for notifications:', error);
  }
}

/**
 * 新メンバー追加時に管理者全員に通知
 */
export async function notifyNewMemberAdded(
  organizationId: string,
  newMemberUserId: string,
  newMemberEmail: string,
  newMemberRole: string
): Promise<void> {
  try {
    // 新メンバーの情報を取得
    const { data: newMemberProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', newMemberUserId)
      .single();

    const newMemberName = newMemberProfile?.name || newMemberEmail;

    // 組織の管理者を取得
    const { data: admins } = await supabase
      .from('organization_members')
      .select('user_id, profiles!inner(role)')
      .eq('organization_id', organizationId)
      .eq('profiles.role', 'admin')
      .neq('user_id', newMemberUserId); // 新メンバー自身は除外

    if (admins && admins.length > 0) {
      const roleLabels: Record<string, string> = {
        admin: '管理者',
        manager: '店長',
        staff: 'スタッフ',
      };

      const template = NotificationTemplates.newMember(
        newMemberName,
        newMemberEmail,
        roleLabels[newMemberRole] || newMemberRole
      );

      // 各管理者に通知
      const notifications = admins.map((admin) =>
        notificationService.create({
          userId: admin.user_id,
          organizationId,
          ...template,
        })
      );

      await Promise.all(notifications);
      console.log(`New member notification sent: ${newMemberName}`);
    }
  } catch (error) {
    console.error('Error sending new member notification:', error);
  }
}

/**
 * AIレポート生成完了時に通知
 */
export async function notifyReportGenerated(
  reportId: string,
  organizationId: string
): Promise<void> {
  try {
    // レポート情報を取得
    const { data: report, error: reportError } = await supabase
      .from('ai_generated_reports')
      .select('title, report_type, store_id, stores(name)')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return;
    }

    const reportTypeLabels = {
      daily: '日次',
      weekly: '週次',
      monthly: '月次',
    };

    const storeName = report.store_id && report.stores
      ? (report.stores as any).name
      : '全店舗';

    // 組織の管理者とマネージャーに通知
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, profiles!inner(role)')
      .eq('organization_id', organizationId)
      .in('profiles.role', ['admin', 'manager']);

    if (members && members.length > 0) {
      const template = NotificationTemplates.reportGenerated(
        reportTypeLabels[report.report_type as keyof typeof reportTypeLabels] || report.report_type,
        storeName
      );

      // 各メンバーに通知
      const notifications = members.map((member) =>
        notificationService.create({
          userId: member.user_id,
          organizationId,
          ...template,
          link: `/dashboard/ai-reports?id=${reportId}`,
        })
      );

      await Promise.all(notifications);
      console.log(`Report generated notification sent: ${report.title}`);
    }
  } catch (error) {
    console.error('Error sending report generated notification:', error);
  }
}

/**
 * 店舗数上限到達時に管理者に通知
 */
export async function notifyStoreLimitReached(
  userId: string,
  organizationId: string,
  currentStoreCount: number,
  limit: number
): Promise<void> {
  try {
    const template = NotificationTemplates.storeLimitReached(currentStoreCount, limit);

    await notificationService.create({
      userId,
      organizationId,
      ...template,
    });

    console.log(`Store limit notification sent: ${currentStoreCount}/${limit}`);
  } catch (error) {
    console.error('Error sending store limit notification:', error);
  }
}

/**
 * データエクスポート完了時に通知
 */
export async function notifyExportCompleted(
  userId: string,
  organizationId: string,
  exportType: string,
  recordCount: number
): Promise<void> {
  try {
    const template = NotificationTemplates.exportCompleted(exportType, recordCount);

    await notificationService.create({
      userId,
      organizationId,
      ...template,
    });

    console.log(`Export completed notification sent: ${exportType} (${recordCount} records)`);
  } catch (error) {
    console.error('Error sending export completed notification:', error);
  }
}

export const notificationTriggers = {
  checkAndNotifyAIUsage,
  checkAndNotifyTrialExpiring,
  checkAndNotifyGoalAchievement,
  checkAndNotifyLowPerformance,
  notifyNewMemberAdded,
  notifyReportGenerated,
  notifyStoreLimitReached,
  notifyExportCompleted,
};
