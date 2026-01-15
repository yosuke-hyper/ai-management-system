import { Card } from '../ui/card';
import { Building2, Store, Users, Zap, Database } from 'lucide-react';
import type { HealthMetrics } from '../../types/systemhealth';

interface ResourceUsageOverviewProps {
  metrics: HealthMetrics | null;
}

export function ResourceUsageOverview({ metrics }: ResourceUsageOverviewProps) {
  if (!metrics) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  const resources = [
    {
      icon: Building2,
      label: '組織数',
      value: metrics.statistics.totalOrganizations,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Store,
      label: '店舗数',
      value: metrics.statistics.totalStores,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Users,
      label: 'ユーザー数',
      value: metrics.statistics.totalUsers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Users,
      label: 'アクティブユーザー（24h）',
      value: metrics.statistics.activeUsers24h,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  const aiUsagePercent = metrics.resources.aiRequestsToday > 0
    ? Math.min((metrics.resources.aiRequestsToday / 1000) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          システムリソース使用状況
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.label}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
            >
              <div className={`p-2 rounded-lg ${resource.bgColor}`}>
                <resource.icon className={`h-5 w-5 ${resource.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{resource.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {resource.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          AI使用量（本日）
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                AIリクエスト数
              </span>
              <span className="text-sm font-bold text-gray-900">
                {metrics.resources.aiRequestsToday.toLocaleString()} / 1,000
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  aiUsagePercent > 80
                    ? 'bg-red-600'
                    : aiUsagePercent > 60
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${aiUsagePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              使用率: {aiUsagePercent.toFixed(1)}%
            </p>
          </div>

          {aiUsagePercent > 80 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                AI使用量が80%を超えています。制限に近づいています。
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          データベース概要
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">接続状態</span>
            <span className={`text-sm font-medium ${
              metrics.database.connected
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {metrics.database.connected ? '接続中' : '切断'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">総レコード数（推定）</span>
            <span className="text-sm font-medium text-gray-900">
              {(
                metrics.statistics.totalOrganizations +
                metrics.statistics.totalStores +
                metrics.statistics.totalUsers
              ).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">アクティビティ率</span>
            <span className="text-sm font-medium text-gray-900">
              {metrics.statistics.totalUsers > 0
                ? (
                    (metrics.statistics.activeUsers24h /
                      metrics.statistics.totalUsers) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
