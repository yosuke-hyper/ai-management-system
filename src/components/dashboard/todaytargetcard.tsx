import React from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TodayTargetCardProps {
  currentSales: number;
  targetSales: number;
  averageCustomerPrice: number;
  date?: string;
}

export const TodayTargetCard: React.FC<TodayTargetCardProps> = ({
  currentSales,
  targetSales,
  averageCustomerPrice,
  date
}) => {
  const achievementRate = targetSales > 0 ? (currentSales / targetSales) * 100 : 0;
  const remainingSales = Math.max(0, targetSales - currentSales);
  const remainingCustomers = averageCustomerPrice > 0
    ? Math.ceil(remainingSales / averageCustomerPrice)
    : 0;

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'danger';
  };

  const getStatusMessage = (rate: number) => {
    if (rate >= 100) return '目標達成おめでとうございます！';
    if (rate >= 90) return '順調です！このペースを維持しましょう';
    if (rate >= 70) return 'もう一息！頑張りましょう';
    return '要注意：売上強化が必要です';
  };

  const statusColor = getStatusColor(achievementRate);
  const statusMessage = getStatusMessage(achievementRate);

  const colorClasses = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-500',
      text: 'text-green-700 dark:text-green-400',
      progressBg: 'bg-green-600'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      progressBg: 'bg-yellow-600'
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-500',
      text: 'text-red-700 dark:text-red-400',
      progressBg: 'bg-red-600'
    }
  };

  const colors = colorClasses[statusColor];

  const displayDate = date || new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <Card className={cn(
      'border-2 transition-all duration-300',
      colors.border,
      colors.bg
    )}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', colors.bg)}>
              <Target className={cn('w-6 h-6', colors.text)} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              🎯 今日の目標進捗
            </h2>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {displayDate}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-4xl font-bold tabular-nums', colors.text)}>
                {formatCurrency(currentSales)}
              </span>
              <span className="text-xl text-gray-500 dark:text-gray-400">/</span>
              <span className="text-2xl font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                {formatCurrency(targetSales)}
              </span>
            </div>
            <div className={cn('text-3xl font-bold tabular-nums', colors.text)}>
              {achievementRate.toFixed(0)}%
            </div>
          </div>

          <div className="relative">
            <Progress
              value={Math.min(achievementRate, 100)}
              className={cn('h-4', colors.bg)}
            />
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                colors.progressBg
              )}
              style={{ width: `${Math.min(achievementRate, 100)}%` }}
            />
          </div>
        </div>

        {achievementRate < 100 && (
          <div className={cn(
            'p-4 rounded-lg border-2',
            colors.border,
            'bg-white dark:bg-gray-800'
          )}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  💰 目標まで
                </span>
                <span className={cn('text-2xl font-bold tabular-nums', colors.text)}>
                  あと {formatCurrency(remainingSales)}
                </span>
              </div>
              {remainingCustomers > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    👥 客単価{formatCurrency(averageCustomerPrice)}なら
                  </span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    あと約 {remainingCustomers}組
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          achievementRate >= 100 ? 'bg-green-100 dark:bg-green-900' : colors.bg
        )}>
          {achievementRate >= 100 ? (
            <span className="text-2xl">🎉</span>
          ) : achievementRate >= 90 ? (
            <span className="text-2xl">✅</span>
          ) : achievementRate >= 70 ? (
            <span className="text-2xl">💪</span>
          ) : (
            <span className="text-2xl">⚠️</span>
          )}
          <span className={cn(
            'text-sm font-semibold',
            achievementRate >= 100 ? 'text-green-700 dark:text-green-300' : colors.text
          )}>
            {statusMessage}
          </span>
        </div>
      </div>
    </Card>
  );
};
