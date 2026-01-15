import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useSystemHealth } from '../../hooks/usesystemhealth';
import { useAuth } from '../../contexts/authcontext';
import { SystemStatusBadge } from './systemstatusbadge';
import { HealthMetricCard } from './healthmetriccard';
import { PerformanceMetrics } from './performancemetrics';
import { ResourceUsageOverview } from './resourceusageoverview';
import { SystemAlertsPanel } from './systemalertspanel';
import {
  Activity,
  Database,
  Users,
  AlertCircle,
  RefreshCw,
  Clock,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export function SystemHealthDashboard() {
  const { isDemoMode, user } = useAuth();
  const { metrics, alerts, loading, error, lastUpdate, refresh } = useSystemHealth({
    autoRefresh: true,
    refreshInterval: 30000,
  });
  const [refreshing, setRefreshing] = useState(false);

  const isUsingMockData = isDemoMode || !user?.isSuperAdmin;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">システムヘルス情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">
              システムヘルス情報の取得に失敗しました
            </p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              再試行
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            システムヘルスダッシュボード
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            システム全体の健全性とパフォーマンスを監視
          </p>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                最終更新:{' '}
                {formatDistanceToNow(lastUpdate, {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>
          )}

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </div>

      {isUsingMockData && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                {isDemoMode ? 'デモモード' : '参考データ表示中'}
              </h4>
              <p className="text-sm text-blue-800">
                {isDemoMode
                  ? 'デモモードのため、サンプルデータを表示しています。実際のシステムヘルス情報を確認するには、スーパー管理者としてログインしてください。'
                  : 'スーパー管理者権限が必要です。実際のシステムヘルス情報を確認するには、スーパー管理者アカウントでログインしてください。'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {metrics && (
        <>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              システムステータス:
            </span>
            <SystemStatusBadge status={metrics.status} size="lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthMetricCard
              title="データベース接続"
              value={metrics.database.connected ? '正常' : '切断'}
              icon={Database}
              status={metrics.database.connected ? 'healthy' : 'critical'}
              subtitle="接続状態"
            />

            <HealthMetricCard
              title="アクティブユーザー"
              value={metrics.statistics.activeUsers24h}
              icon={Users}
              status="healthy"
              subtitle="過去24時間"
            />

            <HealthMetricCard
              title="エラー数"
              value={metrics.errors.last24Hours}
              icon={AlertCircle}
              status={
                metrics.errors.critical24h > 10
                  ? 'critical'
                  : metrics.errors.critical24h > 5
                  ? 'warning'
                  : 'healthy'
              }
              subtitle="過去24時間"
            />

            <HealthMetricCard
              title="平均応答時間"
              value={`${metrics.performance.avgResponseTime.toFixed(0)}ms`}
              icon={Activity}
              status={
                metrics.performance.avgResponseTime > 1000
                  ? 'critical'
                  : metrics.performance.avgResponseTime > 500
                  ? 'warning'
                  : 'healthy'
              }
              subtitle="API応答時間"
            />
          </div>
        </>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="resources">リソース</TabsTrigger>
          <TabsTrigger value="alerts">
            アラート
            {alerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {alerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <PerformanceMetrics hours={24} />
            </div>
            <div>
              <ResourceUsageOverview metrics={metrics} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="mt-6">
            <PerformanceMetrics hours={24} />
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="mt-6">
            <ResourceUsageOverview metrics={metrics} />
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="mt-6">
            <SystemAlertsPanel alerts={alerts} maxDisplay={20} />
          </div>
        </TabsContent>
      </Tabs>

      {metrics && metrics.status !== 'healthy' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">
                システムに問題が検出されました
              </h4>
              <p className="text-sm text-yellow-800">
                {metrics.status === 'critical'
                  ? '重大な問題が発生しています。早急な対応が必要です。'
                  : 'システムに警告レベルの問題があります。監視を続けてください。'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
