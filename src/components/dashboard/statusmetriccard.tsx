import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type MetricStatus = 'success' | 'warning' | 'danger';

interface StatusMetricCardProps {
  emoji: string;
  label: string;
  value: string;
  achievementRate: number;
  target: number;
  current: number;
  unit?: string;
  showRemaining?: boolean;
  additionalInfo?: string;
}

export const StatusMetricCard: React.FC<StatusMetricCardProps> = ({
  emoji,
  label,
  value,
  achievementRate,
  target,
  current,
  unit = '円',
  showRemaining = true,
  additionalInfo
}) => {
  const getStatus = (rate: number): MetricStatus => {
    if (rate >= 95) return 'success';
    if (rate >= 85) return 'warning';
    return 'danger';
  };

  const getStatusLabel = (rate: number): string => {
    if (rate >= 100) return '達成';
    if (rate >= 95) return '順調';
    if (rate >= 85) return '注意';
    return '要改善';
  };

  const status = getStatus(achievementRate);
  const statusLabel = getStatusLabel(achievementRate);
  const remaining = Math.max(0, target - current);

  const colorClasses = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-500',
      text: 'text-green-700 dark:text-green-400',
      badgeBg: 'bg-green-100 dark:bg-green-900',
      badgeText: 'text-green-800 dark:text-green-200',
      progressBg: 'bg-green-600'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      badgeBg: 'bg-yellow-100 dark:bg-yellow-900',
      badgeText: 'text-yellow-800 dark:text-yellow-200',
      progressBg: 'bg-yellow-600'
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-500',
      text: 'text-red-700 dark:text-red-400',
      badgeBg: 'bg-red-100 dark:bg-red-900',
      badgeText: 'text-red-800 dark:text-red-200',
      progressBg: 'bg-red-600'
    }
  };

  const colors = colorClasses[status];

  const formatRemaining = (value: number, unit: string) => {
    if (unit === '円') {
      if (value >= 1000) {
        return `+${formatCurrency(value).replace('¥', '¥')}`;
      }
      return `+${formatCurrency(value)}`;
    }
    return `+${formatNumber(value)}${unit}`;
  };

  return (
    <Card className={cn(
      'border-2 transition-all duration-300 hover:shadow-lg',
      colors.border,
      colors.bg
    )}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={label}>
              {emoji}
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {label}
            </span>
          </div>
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-bold',
            colors.badgeBg,
            colors.badgeText
          )}>
            {statusLabel}
          </div>
        </div>

        <div className="space-y-2">
          <div className={cn('text-2xl font-bold tabular-nums', colors.text)}>
            {value}
          </div>
          {additionalInfo && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {additionalInfo}
            </div>
          )}

          <div className="relative">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  colors.progressBg
                )}
                style={{ width: `${Math.min(achievementRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 tabular-nums">
              {achievementRate.toFixed(0)}%
            </span>
            {showRemaining && achievementRate < 100 && (
              <span className={cn('font-semibold tabular-nums', colors.text)}>
                {unit === '円' ? (
                  <>あと{formatCurrency(remaining)}</>
                ) : (
                  <>現在の客数: {formatNumber(Math.round(current))}{unit}/日</>
                )}
              </span>
            )}
            {achievementRate >= 100 && (
              <span className="font-semibold text-green-600 dark:text-green-400">
                ✅
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
