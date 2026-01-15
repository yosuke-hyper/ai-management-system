import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type InsightType = 'success' | 'warning' | 'info' | 'alert';

export interface TodayInsight {
  type: InsightType;
  title: string;
  value?: string;
  change?: number;
  message: string;
  action?: {
    label: string;
    path: string;
  };
}

interface TodayInsightCardProps {
  insight: TodayInsight;
}

const insightStyles: Record<
  InsightType,
  { bg: string; border: string; icon: typeof TrendingUp; iconColor: string }
> = {
  success: {
    bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
    border: 'border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    icon: Lightbulb,
    iconColor: 'text-blue-600',
  },
  alert: {
    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
  },
};

export const TodayInsightCard: React.FC<TodayInsightCardProps> = ({ insight }) => {
  const navigate = useNavigate();
  const style = insightStyles[insight.type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-5`}>
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            insight.type === 'success'
              ? 'bg-green-100'
              : insight.type === 'warning'
              ? 'bg-amber-100'
              : insight.type === 'alert'
              ? 'bg-red-100'
              : 'bg-blue-100'
          }`}
        >
          <Icon className={`w-6 h-6 ${style.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              今日のポイント
            </span>
            {insight.change !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  insight.change >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {insight.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {insight.change >= 0 ? '+' : ''}
                {insight.change.toFixed(1)}%
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 text-lg">{insight.title}</h3>

          {insight.value && (
            <p className="text-2xl font-bold text-gray-900 mt-1">{insight.value}</p>
          )}

          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{insight.message}</p>

          {insight.action && (
            <button
              onClick={() => navigate(insight.action!.path)}
              className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {insight.action.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const THRESHOLDS = {
  foodCostRateWarning: 38,
  laborCostRateWarning: 38,
  salesDropAlert: 0.7,
  salesGoodIncrease: 1.25,
};

export function generateTodayInsight(
  sales?: number,
  previousSales?: number,
  foodCostRate?: number,
  laborCostRate?: number,
  targetSales?: number
): TodayInsight {
  if (!sales || sales === 0) {
    return {
      type: 'info',
      title: 'データを入力しましょう',
      message: '今日の売上を入力すると、リアルタイムで分析結果が表示されます。',
      action: {
        label: '日報を入力',
        path: '/dashboard/report',
      },
    };
  }

  if (targetSales && sales >= targetSales) {
    const achievement = ((sales / targetSales) * 100).toFixed(0);
    return {
      type: 'success',
      title: '目標達成!',
      value: `${achievement}%`,
      change: previousSales ? ((sales - previousSales) / previousSales) * 100 : undefined,
      message: `本日の売上目標を達成しました。この調子で明日も頑張りましょう!`,
    };
  }

  if (previousSales && sales > previousSales * THRESHOLDS.salesGoodIncrease) {
    const changePercent = ((sales - previousSales) / previousSales) * 100;
    return {
      type: 'success',
      title: '売上好調!',
      value: `${sales.toLocaleString()}円`,
      change: changePercent,
      message: `前日比${changePercent.toFixed(0)}%増。好調をキープしましょう!`,
    };
  }

  if (previousSales && sales < previousSales * THRESHOLDS.salesDropAlert) {
    const changePercent = ((sales - previousSales) / previousSales) * 100;
    return {
      type: 'warning',
      title: '売上が前日より減少',
      value: `${sales.toLocaleString()}円`,
      change: changePercent,
      message: `前日比${Math.abs(changePercent).toFixed(0)}%減。天候・曜日の影響も考慮してみてください。`,
    };
  }

  if (foodCostRate && foodCostRate > THRESHOLDS.foodCostRateWarning) {
    return {
      type: 'warning',
      title: '原価率が高め',
      value: `${foodCostRate.toFixed(1)}%`,
      message: `原価率${foodCostRate.toFixed(1)}%。仕入れ内容を確認してみましょう。`,
      action: {
        label: '詳細を確認',
        path: '/dashboard/daily',
      },
    };
  }

  if (laborCostRate && laborCostRate > THRESHOLDS.laborCostRateWarning) {
    return {
      type: 'warning',
      title: '人件費率が高め',
      value: `${laborCostRate.toFixed(1)}%`,
      message: `人件費率${laborCostRate.toFixed(1)}%。シフトを確認してみてください。`,
    };
  }

  return {
    type: 'info',
    title: '本日の売上',
    value: `${sales.toLocaleString()}円`,
    change: previousSales ? ((sales - previousSales) / previousSales) * 100 : undefined,
    message: '順調に営業が進んでいます。',
  };
}
