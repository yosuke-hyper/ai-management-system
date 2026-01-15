import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * 定期的に実行される通知チェックEdge Function
 *
 * - AI使用量の監視（80%, 90%, 100%閾値）
 * - トライアル期限の監視（7日前、3日前、1日前）
 * - 低パフォーマンス店舗の検出
 *
 * Cron Jobから毎時実行される想定
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      aiUsageChecks: 0,
      trialChecks: 0,
      performanceChecks: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // ======================================
    // 1. AI使用量チェック
    // ======================================
    try {
      // 全組織を取得
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name');

      if (organizations && organizations.length > 0) {
        for (const org of organizations) {
          try {
            // 組織の管理者を取得
            const { data: admins } = await supabase
              .from('organization_members')
              .select('user_id')
              .eq('organization_id', org.id)
              .eq('profiles.role', 'admin')
              .limit(1);

            if (!admins || admins.length === 0) continue;

            const adminUserId = admins[0].user_id;

            // 使用量設定を取得
            const { data: settings } = await supabase
              .from('ai_usage_settings')
              .select('monthly_allocation')
              .eq('organization_id', org.id)
              .maybeSingle();

            const monthlyLimit = settings?.monthly_allocation || 100;

            // 今月の使用回数を取得
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: usageCount } = await supabase
              .from('ai_usage_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', org.id)
              .gte('created_at', startOfMonth.toISOString());

            const currentUsage = usageCount || 0;
            const percentage = (currentUsage / monthlyLimit) * 100;

            // 既に通知済みかチェック（今月）
            const { data: existingNotifications } = await supabase
              .from('notifications')
              .select('id, title')
              .eq('user_id', adminUserId)
              .eq('organization_id', org.id)
              .like('title', '%AI使用量%')
              .gte('created_at', startOfMonth.toISOString())
              .order('created_at', { ascending: false })
              .limit(1);

            // 80%, 90%, 100%の閾値で通知
            let shouldNotify = false;
            let notifyAt = 0;

            if (percentage >= 100 && (!existingNotifications?.length || !existingNotifications[0].title.includes('上限'))) {
              shouldNotify = true;
              notifyAt = 100;
            } else if (percentage >= 90 && percentage < 100 && (!existingNotifications?.length || !existingNotifications[0].title.includes('90'))) {
              shouldNotify = true;
              notifyAt = 90;
            } else if (percentage >= 80 && percentage < 90 && (!existingNotifications?.length || !existingNotifications[0].title.includes('80'))) {
              shouldNotify = true;
              notifyAt = 80;
            }

            if (shouldNotify) {
              const type = notifyAt >= 100 ? 'error' : 'warning';
              const title = notifyAt >= 100
                ? 'AI使用量が上限に達しました'
                : `AI使用量が${notifyAt}%に到達しました`;
              const message = notifyAt >= 100
                ? `今月のAI使用量が上限に達しました（${currentUsage}/${monthlyLimit}回）。追加のAI機能は来月まで利用できません。`
                : `今月のAI使用量が上限の${notifyAt}%に達しました（${currentUsage}/${monthlyLimit}回）。プランのアップグレードをご検討ください。`;

              await supabase.from('notifications').insert({
                user_id: adminUserId,
                organization_id: org.id,
                type,
                title,
                message,
                link: '/dashboard/subscription',
                read: false,
              });

              results.notificationsSent++;
              console.log(`AI usage notification sent to ${org.name}: ${notifyAt}%`);
            }

            results.aiUsageChecks++;
          } catch (orgError) {
            console.error(`Error checking AI usage for ${org.name}:`, orgError);
            results.errors.push(`AI usage check failed for ${org.name}`);
          }
        }
      }
    } catch (error) {
      console.error('AI usage check error:', error);
      results.errors.push('AI usage check failed');
    }

    // ======================================
    // 2. トライアル期限チェック
    // ======================================
    try {
      // トライアル中のサブスクリプションを取得
      const { data: trialSubs } = await supabase
        .from('subscriptions')
        .select('organization_id, trial_end, current_period_end')
        .eq('status', 'trialing');

      if (trialSubs && trialSubs.length > 0) {
        const now = new Date();

        for (const sub of trialSubs) {
          try {
            const trialEnd = new Date(sub.trial_end || sub.current_period_end);
            const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // 7日前、3日前、1日前に通知
            if ([7, 3, 1].includes(daysRemaining)) {
              // 組織の管理者を取得
              const { data: admins } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('organization_id', sub.organization_id)
                .eq('profiles.role', 'admin');

              if (admins && admins.length > 0) {
                // 今日既に通知済みかチェック
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: existingNotifications } = await supabase
                  .from('notifications')
                  .select('id')
                  .eq('organization_id', sub.organization_id)
                  .like('title', '%トライアル%')
                  .gte('created_at', today.toISOString());

                if (!existingNotifications || existingNotifications.length === 0) {
                  // 各管理者に通知
                  const notifications = admins.map((admin) =>
                    supabase.from('notifications').insert({
                      user_id: admin.user_id,
                      organization_id: sub.organization_id,
                      type: 'warning',
                      title: `トライアル期間が残り${daysRemaining}日です`,
                      message: `トライアル期間は${trialEnd.toLocaleDateString('ja-JP')}に終了します。継続してご利用いただくには、有料プランへのアップグレードをお願いします。`,
                      link: '/dashboard/subscription',
                      read: false,
                    })
                  );

                  await Promise.all(notifications);
                  results.notificationsSent += admins.length;
                  console.log(`Trial expiring notification sent: ${daysRemaining} days remaining`);
                }
              }
            }

            results.trialChecks++;
          } catch (subError) {
            console.error(`Error checking trial for organization ${sub.organization_id}:`, subError);
            results.errors.push(`Trial check failed for org ${sub.organization_id}`);
          }
        }
      }
    } catch (error) {
      console.error('Trial expiring check error:', error);
      results.errors.push('Trial check failed');
    }

    // ======================================
    // 3. 昨日の低パフォーマンス店舗チェック
    // ======================================
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 昨日の日報で目標未達の店舗を取得（70%未満）
      const { data: lowPerformanceReports } = await supabase
        .from('daily_reports')
        .select('store_id, sales, target_sales, stores!inner(name, organization_id)')
        .eq('date', yesterdayStr)
        .not('target_sales', 'is', null);

      if (lowPerformanceReports && lowPerformanceReports.length > 0) {
        for (const report of lowPerformanceReports) {
          try {
            const actualSales = report.sales || 0;
            const targetSales = report.target_sales;
            const achievementRate = (actualSales / targetSales) * 100;

            if (achievementRate < 70) {
              const store = report.stores as any;

              // 組織の管理者のみに通知
              const { data: admins } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('organization_id', store.organization_id)
                .eq('profiles.role', 'admin');

              if (admins && admins.length > 0) {
                const notifications = admins.map((admin) =>
                  supabase.from('notifications').insert({
                    user_id: admin.user_id,
                    organization_id: store.organization_id,
                    type: 'warning',
                    title: '売上目標未達の警告',
                    message: `${store.name}の売上が目標の${Math.round(achievementRate)}%です。対策をご検討ください。`,
                    link: `/dashboard/daily?store=${report.store_id}`,
                    read: false,
                  })
                );

                await Promise.all(notifications);
                results.notificationsSent += admins.length;
                console.log(`Low performance notification sent for ${store.name}: ${achievementRate}%`);
              }
            }

            results.performanceChecks++;
          } catch (reportError) {
            console.error(`Error checking performance for store ${report.store_id}:`, reportError);
            results.errors.push(`Performance check failed for store ${report.store_id}`);
          }
        }
      }
    } catch (error) {
      console.error('Performance check error:', error);
      results.errors.push('Performance check failed');
    }

    // ======================================
    // 結果を返す
    // ======================================
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Checked ${results.aiUsageChecks} orgs for AI usage, ${results.trialChecks} subscriptions for trial expiry, ${results.performanceChecks} reports for performance. Sent ${results.notificationsSent} notifications.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Notification check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
