import React, { useMemo } from 'react';
import { Flame, Sparkles, Target as TargetIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AiAvatar } from '@/components/avatar/aiavatar';
import { useAvatar } from '@/contexts/avatarcontext';

interface MonthlyProgressCardProps {
  currentSales: number;
  targetSales: number;
  currentProfit: number;
  targetProfit: number;
  daysRemaining: number;
  monthName?: string;
}

export const MonthlyProgressCard: React.FC<MonthlyProgressCardProps> = ({
  currentSales,
  targetSales,
  currentProfit,
  targetProfit,
  daysRemaining,
  monthName
}) => {
  const { equippedItems } = useAvatar();
  const salesAchievement = targetSales > 0 ? (currentSales / targetSales) * 100 : 0;
  const profitAchievement = targetProfit > 0 ? (currentProfit / targetProfit) * 100 : 0;

  const remainingSales = Math.max(0, targetSales - currentSales);
  const requiredDailySales = daysRemaining > 0 ? remainingSales / daysRemaining : 0;

  // 確変モード（月の目標達成）
  const isVictoryMode = salesAchievement >= 100;

  // アバターの表情を決定（月の達成率ベース）
  const avatarEmotion = useMemo(() => {
    if (isVictoryMode) return 'happy';
    if (salesAchievement >= 70) return 'normal';
    if (salesAchievement >= 40) return 'thinking';
    return 'sad';
  }, [isVictoryMode, salesAchievement]);

  // アバターのメッセージ
  const avatarMessage = useMemo(() => {
    if (isVictoryMode) {
      return '月の目標達成だワン！ 素晴らしい！';
    }
    if (salesAchievement >= 80) {
      return `残り${formatCurrency(remainingSales)}で達成だワン！`;
    }
    if (salesAchievement >= 50) {
      return `あと${salesAchievement.toFixed(0)}%で達成だワン！ 頑張ろう！`;
    }
    return `今月は${formatCurrency(requiredDailySales)}/日必要だワン！`;
  }, [isVictoryMode, salesAchievement, remainingSales, requiredDailySales]);

  // 月末着地予想（売上）
  const projectedSales = currentSales + (requiredDailySales * daysRemaining);
  const projectedAchievement = targetSales > 0 ? (projectedSales / targetSales) * 100 : 0;

  // 月末着地予想（営業利益）
  const daysElapsed = Math.max(1, 30 - daysRemaining); // 経過日数（最低1日）
  const dailyAverageProfit = daysElapsed > 0 ? currentProfit / daysElapsed : 0; // 1日あたり平均利益
  const projectedProfit = currentProfit + (dailyAverageProfit * daysRemaining); // 月末予想利益
  const projectedProfitAchievement = targetProfit > 0 ? (projectedProfit / targetProfit) * 100 : 0;


  const displayMonth = monthName || new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <>
      <style>
        {`
          @keyframes sparkle {
            0%, 100% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes rainbow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .sparkle {
            animation: sparkle 2s ease-in-out infinite;
          }
          .rainbow-bg {
            background: linear-gradient(270deg, #fbbf24, #f59e0b, #fbbf24);
            background-size: 200% 200%;
            animation: rainbow 3s ease infinite;
          }
        `}
      </style>

      <Card className={cn(
        "relative border-2 transition-all duration-500",
        isVictoryMode
          ? "border-yellow-400 shadow-2xl shadow-yellow-400/50"
          : "border-blue-300 bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950"
      )}>
        {isVictoryMode && (
          <>
            <div className="absolute inset-0 rainbow-bg opacity-20"></div>
            {[...Array(6)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute sparkle text-yellow-400"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.3}s`
                }}
                size={24}
              />
            ))}
          </>
        )}

        <div className="relative p-8 space-y-6">
          {/* ヒーローエリア：月の目標達成度 */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TargetIcon className={cn(
                "w-6 h-6",
                isVictoryMode ? "text-yellow-500" : "text-blue-600 dark:text-blue-400"
              )} />
              <h2 className={cn(
                "text-xl font-bold",
                isVictoryMode ? "text-yellow-600 dark:text-yellow-400" : "text-blue-900 dark:text-blue-100"
              )}>
                {isVictoryMode ? '月の目標達成！' : '今月の目標'}
              </h2>
            </div>

            {isVictoryMode ? (
              <div className="space-y-1">
                <div className="text-6xl font-black text-yellow-500 drop-shadow-lg">
                  達成！
                </div>
                <div className="text-lg text-gray-700 dark:text-gray-300">
                  目標：{formatCurrency(targetSales)}
                </div>
                <div className="text-md text-gray-600 dark:text-gray-400">
                  実績：{formatCurrency(currentSales)} ({salesAchievement.toFixed(1)}%)
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  目標まであと
                </div>
                <div className="text-7xl font-black text-blue-600 dark:text-blue-400 drop-shadow-lg tabular-nums">
                  {formatCurrency(remainingSales).replace('¥', '')}
                  <span className="text-2xl">円</span>
                </div>
                <div className="text-lg text-gray-700 dark:text-gray-300">
                  目標：{formatCurrency(targetSales)} / 残り{daysRemaining}日
                </div>
                <div className="text-md font-bold text-blue-600 dark:text-blue-400">
                  必要日商：{formatCurrency(requiredDailySales)}
                </div>
              </div>
            )}
          </div>

          {/* クエスト進行バー */}
          <div className="relative pt-8 pb-4">
            {/* アバター + 吹き出し */}
            <div
              className="absolute -top-2 transition-all duration-700 ease-out z-10"
              style={{
                left: `calc(${Math.min(salesAchievement, 100)}% - 30px)`,
                transform: 'translateX(0)'
              }}
            >
              {/* 吹き出し */}
              <div className={cn(
                "absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg whitespace-nowrap text-sm font-bold",
                isVictoryMode
                  ? "bg-yellow-400 text-yellow-900"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-blue-500"
              )}>
                {avatarMessage}
                <div className={cn(
                  "absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent",
                  isVictoryMode ? "border-t-yellow-400" : "border-t-blue-500"
                )}></div>
              </div>

              {/* アバター */}
              <div className="relative">
                <AiAvatar emotion={avatarEmotion} size={60} fixed={false} className="drop-shadow-xl" enableHelpChat={false} equippedItems={equippedItems} />
                {isVictoryMode && (
                  <Flame className="absolute -top-2 -right-2 w-6 h-6 text-orange-500 animate-bounce" />
                )}
              </div>
            </div>

            {/* プログレスバー */}
            <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div
                className={cn(
                  "h-full transition-all duration-700 ease-out relative",
                  isVictoryMode
                    ? "rainbow-bg"
                    : "bg-gradient-to-r from-blue-400 to-blue-600"
                )}
                style={{ width: `${Math.min(salesAchievement, 100)}%` }}
              >
                {isVictoryMode && (
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                )}
              </div>
            </div>

            {/* バーの両端ラベル */}
            <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span>0%</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                目標 100%
              </span>
            </div>

            {/* 現在の達成率表示 */}
            <div className="text-center mt-3">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {salesAchievement.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                達成
              </span>
            </div>
          </div>

          {/* 月末着地予想と利益情報 */}
          <div className="pt-4 border-t border-blue-200 dark:border-blue-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 月末着地予想 */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                月末着地予想
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {formatCurrency(projectedSales)}
              </div>
              <div className={cn(
                "mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold",
                projectedAchievement >= 100
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              )}>
                {projectedAchievement >= 100 ? '達成見込み' : '未達成'}
              </div>
            </div>

            {/* 営業利益の月末着地予想 */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                営業利益 月末着地予想
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {formatCurrency(projectedProfit)}
              </div>
              <div className={cn(
                "mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold",
                projectedProfitAchievement >= 100
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : projectedProfitAchievement >= 80
                  ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              )}>
                {projectedProfitAchievement >= 100 ? '達成見込み' : projectedProfitAchievement >= 80 ? '要注意' : '未達成'}
              </div>
              {targetProfit > 0 && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  目標: {formatCurrency(targetProfit)}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
