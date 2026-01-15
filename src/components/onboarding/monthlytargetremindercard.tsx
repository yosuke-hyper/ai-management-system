import React from 'react';
import { Target, ArrowRight, Calendar, Wallet, CheckCircle, X } from 'lucide-react';

interface MonthlyTargetReminderCardProps {
  monthName: string;
  hasTargetSet: boolean;
  hasExpenseBaselineSet: boolean;
  isFirstWeekOfMonth: boolean;
  isFirstTimeUser: boolean;
  storeId?: string;
  onOpenTargetSettings?: () => void;
  onOpenExpenseSettings?: () => void;
  onDismiss?: () => void;
}

export const MonthlyTargetReminderCard: React.FC<MonthlyTargetReminderCardProps> = ({
  monthName,
  hasTargetSet,
  hasExpenseBaselineSet,
  isFirstWeekOfMonth,
  isFirstTimeUser,
  onOpenTargetSettings,
  onOpenExpenseSettings,
  onDismiss,
}) => {
  const bothSet = hasTargetSet && hasExpenseBaselineSet;
  const shouldShow = !bothSet && (isFirstWeekOfMonth || isFirstTimeUser);

  if (!shouldShow) {
    return null;
  }

  const formatMonthDisplay = (yyyymm: string) => {
    const [year, month] = yyyymm.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  };

  const getTitle = () => {
    if (isFirstTimeUser && !hasTargetSet && !hasExpenseBaselineSet) {
      return '初期設定を完了しましょう';
    }
    if (!hasTargetSet && !hasExpenseBaselineSet) {
      return '月初の設定を行いましょう';
    }
    if (!hasTargetSet) {
      return '月次目標を設定しましょう';
    }
    return '参考経費を設定しましょう';
  };

  const getDescription = () => {
    if (isFirstTimeUser && !hasTargetSet && !hasExpenseBaselineSet) {
      return '目標と経費の基準を設定すると、日々の達成度や利益がより正確に分析できます。';
    }
    if (!hasTargetSet && !hasExpenseBaselineSet) {
      return '新しい月が始まりました。今月の目標と経費基準を設定しましょう。';
    }
    if (!hasTargetSet) {
      return '今月の売上目標を設定すると、日々の達成度がグラフで確認できます。';
    }
    return '経費の基準値を設定すると、利益計算がより正確になります。';
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 relative">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-white/50"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
          {isFirstTimeUser ? (
            <span className="text-2xl">🎯</span>
          ) : (
            <Target className="w-6 h-6 text-emerald-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {isFirstTimeUser ? '初期設定' : '月初のおすすめ'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <Calendar className="w-3 h-3" />
              {formatMonthDisplay(monthName)}
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 text-lg">{getTitle()}</h3>

          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {getDescription()}
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {!hasTargetSet && onOpenTargetSettings && (
                <button
                  onClick={onOpenTargetSettings}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                >
                  <Target className="w-4 h-4" />
                  月次目標を設定
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {!hasExpenseBaselineSet && onOpenExpenseSettings && (
                <button
                  onClick={onOpenExpenseSettings}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  参考経費を設定
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className={`flex items-center gap-1.5 ${hasTargetSet ? 'text-emerald-600' : ''}`}>
                {hasTargetSet ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                )}
                月次目標
              </div>
              <div className={`flex items-center gap-1.5 ${hasExpenseBaselineSet ? 'text-emerald-600' : ''}`}>
                {hasExpenseBaselineSet ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                )}
                参考経費
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
