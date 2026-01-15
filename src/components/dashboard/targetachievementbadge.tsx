import React from 'react'
import { Trophy, TrendingUp, Target as TargetIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TargetAchievement } from '@/types'

interface TargetAchievementBadgeProps {
  achievement: TargetAchievement
  showDetails?: boolean
  className?: string
}

export const TargetAchievementBadge: React.FC<TargetAchievementBadgeProps> = ({
  achievement,
  showDetails = false,
  className
}) => {
  const { targetSales, actualSales, achievementRate, isAchieved, difference } = achievement

  if (targetSales === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {isAchieved ? (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white border-green-700 px-3 py-1 text-sm font-bold animate-pulse">
            <Trophy className="h-4 w-4 mr-1" />
            目標達成
          </Badge>
          {showDetails && (
            <span className="text-xs text-green-700 font-medium">
              達成率 {formatPercent(achievementRate)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-500 text-blue-700 px-3 py-1 text-sm">
            <TargetIcon className="h-4 w-4 mr-1" />
            進捗 {formatPercent(achievementRate)}
          </Badge>
          {showDetails && (
            <span className="text-xs text-muted-foreground">
              あと {formatCurrency(Math.abs(difference))}
            </span>
          )}
        </div>
      )}

      {showDetails && (
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">目標:</span>
            <span className="font-mono">{formatCurrency(targetSales)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">実績:</span>
            <span className="font-mono font-medium">{formatCurrency(actualSales)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">差額:</span>
            <span className={cn('font-mono font-medium', difference >= 0 ? 'text-green-600' : 'text-blue-600')}>
              {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
            </span>
          </div>
        </div>
      )}

      {!showDetails && (
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isAchieved ? 'bg-green-600' : 'bg-blue-500'
            )}
            style={{ width: `${Math.min(achievementRate, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
