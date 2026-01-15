import { Card } from '../ui/card';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AlertItem } from '../../types/systemhealth';

interface SystemAlertsPanelProps {
  alerts: AlertItem[];
  maxDisplay?: number;
}

export function SystemAlertsPanel({ alerts, maxDisplay = 10 }: SystemAlertsPanelProps) {
  const displayAlerts = alerts.slice(0, maxDisplay);

  const getSeverityConfig = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: '重大',
        };
      case 'high':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: '高',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: '中',
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: '低',
        };
    }
  };

  if (displayAlerts.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          システムアラート
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-3 bg-green-100 rounded-full mb-3">
            <AlertCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-gray-600">アラートはありません</p>
          <p className="text-sm text-gray-500 mt-1">
            システムは正常に動作しています
          </p>
        </div>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          システムアラート
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
              重大: {criticalCount}
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
              高: {highCount}
            </span>
          )}
          {mediumCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
              中: {mediumCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {displayAlerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(alert.timestamp), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-900 break-words">
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      カテゴリ: {getCategoryLabel(alert.category)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > maxDisplay && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            他 {alerts.length - maxDisplay} 件のアラートがあります
          </p>
        </div>
      )}
    </Card>
  );
}

function getCategoryLabel(category: AlertItem['category']): string {
  const labels = {
    error: 'エラー',
    performance: 'パフォーマンス',
    resource: 'リソース',
    security: 'セキュリティ',
  };
  return labels[category];
}
