import React from 'react';
import { Lightbulb, TrendingUp, Users, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface ActionSuggestion {
  emoji: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface ActionSuggestionsCardProps {
  currentHour: number;
  salesAchievement: number;
  customerCountAchievement: number;
  averageSpendingAchievement: number;
  remainingSales: number;
  remainingCustomers: number;
  requiredAverageSpendingIncrease: number;
}

export const ActionSuggestionsCard: React.FC<ActionSuggestionsCardProps> = ({
  currentHour,
  salesAchievement,
  customerCountAchievement,
  averageSpendingAchievement,
  remainingSales,
  remainingCustomers,
  requiredAverageSpendingIncrease
}) => {
  const getTimeOfDayMessage = (hour: number): string => {
    if (hour < 11) return '🌅 開店準備';
    if (hour < 14) return '🍽️ ランチタイム';
    if (hour < 17) return '☕ 中休み';
    if (hour < 22) return '🌙 ディナータイム';
    return '🌟 営業終了';
  };

  const generateSuggestions = (): ActionSuggestion[] => {
    const suggestions: ActionSuggestion[] = [];

    if (salesAchievement >= 100) {
      suggestions.push({
        emoji: '🎉',
        title: '目標達成おめでとうございます！',
        description: 'このペースを維持して、さらなる売上アップを目指しましょう',
        priority: 'high'
      });
      return suggestions;
    }

    if (currentHour >= 11 && currentHour < 14) {
      if (salesAchievement < 40) {
        suggestions.push({
          emoji: '⚡',
          title: 'ランチタイムの売上強化',
          description: `あと${formatCurrency(remainingSales)}必要です。回転率アップと追加注文の提案を`,
          priority: 'high'
        });
      }

      if (customerCountAchievement < 90) {
        suggestions.push({
          emoji: '👥',
          title: '客数を増やしましょう',
          description: `あと約${remainingCustomers}組のお客様が必要です`,
          priority: 'high'
        });
      }

      if (averageSpendingAchievement < 90) {
        suggestions.push({
          emoji: '🍽️',
          title: '客単価アップの工夫',
          description: 'サイドメニューやドリンクセットをおすすめしましょう',
          priority: 'medium'
        });
      }
    }

    if (currentHour >= 14 && currentHour < 17) {
      suggestions.push({
        emoji: '📊',
        title: 'ランチの振り返り',
        description: 'ディナーに向けて準備と仕込みの時間です',
        priority: 'low'
      });

      if (salesAchievement < 50) {
        suggestions.push({
          emoji: '🎯',
          title: 'ディナーで巻き返しを',
          description: `ディナーで${formatCurrency(remainingSales)}の売上が必要です`,
          priority: 'high'
        });
      }
    }

    if (currentHour >= 17 && currentHour < 22) {
      if (salesAchievement < 80) {
        suggestions.push({
          emoji: '🌙',
          title: 'ディナータイム本番',
          description: `目標達成まであと${formatCurrency(remainingSales)}です`,
          priority: 'high'
        });
      }

      if (averageSpendingAchievement < 90 && requiredAverageSpendingIncrease > 0) {
        suggestions.push({
          emoji: '🍷',
          title: '客単価を上げる提案',
          description: `1人あたり${formatCurrency(requiredAverageSpendingIncrease)}アップで目標達成`,
          priority: 'high'
        });

        suggestions.push({
          emoji: '🍰',
          title: 'デザート・ドリンクの提案',
          description: '食後のデザートやコーヒーをおすすめしましょう',
          priority: 'medium'
        });
      }

      if (customerCountAchievement < 85) {
        suggestions.push({
          emoji: '📞',
          title: '予約のフォロー',
          description: '予約のお客様への確認連絡と当日予約の受付',
          priority: 'medium'
        });
      }
    }

    if (currentHour >= 10 && currentHour < 11) {
      suggestions.push({
        emoji: '✨',
        title: '開店準備を万全に',
        description: `今日の目標は${formatCurrency(remainingSales + (remainingSales * salesAchievement / 100))}です`,
        priority: 'medium'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        emoji: '💪',
        title: 'もう一息で目標達成',
        description: `あと${formatCurrency(remainingSales)}で目標達成です。頑張りましょう！`,
        priority: 'high'
      });
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();
  const timeMessage = getTimeOfDayMessage(currentHour);

  const priorityColors = {
    high: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      border: 'border-orange-500',
      text: 'text-orange-700 dark:text-orange-300',
      badge: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
    },
    medium: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    },
    low: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      border: 'border-gray-500',
      text: 'text-gray-700 dark:text-gray-300',
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  };

  return (
    <Card className="border-2 border-purple-500 bg-purple-50 dark:bg-purple-950">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            💡 今のおすすめアクション
          </h2>
        </div>

        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {timeMessage}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const colors = priorityColors[suggestion.priority];
            return (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md',
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0" role="img">
                    {suggestion.emoji}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn('font-bold text-sm', colors.text)}>
                        {suggestion.title}
                      </h3>
                      {suggestion.priority === 'high' && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0',
                          colors.badge
                        )}>
                          重要
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
