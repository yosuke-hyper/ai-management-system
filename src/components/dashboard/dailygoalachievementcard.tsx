import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MonthlyTarget {
  targetSales: number
  targetCostRate: number
  targetLaborRate: number
  targetProfitMargin: number
}

interface DailyMetrics {
  sales: number
  costRate: number
  laborRate: number
  profitMargin?: number
}

interface DailyGoalAchievementCardProps {
  monthlyTarget: MonthlyTarget
  todayMetrics: DailyMetrics
  operatingDaysInMonth: number
  currentDayOfMonth: number
  daysAchievedThisMonth: number
  className?: string
}

interface GoalItem {
  label: string
  target: number | string
  actual: number | string
  isAchieved: boolean
  type: 'currency' | 'percent'
  priority: 'high' | 'medium' | 'low'
}

export const DailyGoalAchievementCard: React.FC<DailyGoalAchievementCardProps> = ({
  monthlyTarget,
  todayMetrics,
  operatingDaysInMonth,
  currentDayOfMonth,
  daysAchievedThisMonth,
  className
}) => {
  const dailyGoals = useMemo(() => {
    const dailySalesTarget = Math.ceil(monthlyTarget.targetSales / operatingDaysInMonth)

    const goals: GoalItem[] = [
      {
        label: '売上',
        target: dailySalesTarget,
        actual: todayMetrics.sales,
        isAchieved: todayMetrics.sales >= dailySalesTarget,
        type: 'currency',
        priority: 'high'
      },
      {
        label: '原価率',
        target: monthlyTarget.targetCostRate,
        actual: todayMetrics.costRate,
        isAchieved: todayMetrics.costRate <= monthlyTarget.targetCostRate,
        type: 'percent',
        priority: 'high'
      },
      {
        label: '人件費率',
        target: monthlyTarget.targetLaborRate,
        actual: todayMetrics.laborRate,
        isAchieved: todayMetrics.laborRate <= monthlyTarget.targetLaborRate,
        type: 'percent',
        priority: 'medium'
      }
    ]

    return goals
  }, [monthlyTarget, todayMetrics, operatingDaysInMonth])

  const achievedCount = dailyGoals.filter(g => g.isAchieved).length
  const allAchieved = achievedCount === dailyGoals.length
  const monthlyProgress = Math.round((daysAchievedThisMonth / currentDayOfMonth) * 100)

  const remainingDays = operatingDaysInMonth - currentDayOfMonth
  const requiredAchievementDays = operatingDaysInMonth - daysAchievedThisMonth

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      allAchieved
        ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-emerald-100'
        : 'bg-gradient-to-br from-slate-50 to-white',
      className
    )}>
      {allAchieved && (
        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
          <Sparkles className="w-full h-full text-emerald-500" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            今日の必達目標
          </CardTitle>
          <Badge
            variant={allAchieved ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              allAchieved
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : achievedCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : ''
            )}
          >
            {achievedCount}/{dailyGoals.length} 達成
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          月次目標から自動計算された、今日クリアすべき指標
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {dailyGoals.map((goal, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg transition-colors',
                goal.isAchieved
                  ? 'bg-emerald-100/50 border border-emerald-200'
                  : 'bg-white border border-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                {goal.isAchieved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-700">{goal.label}</p>
                  <p className="text-xs text-muted-foreground">
                    目標: {goal.type === 'currency'
                      ? formatCurrency(goal.target as number)
                      : `${goal.target}%以下`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-bold',
                  goal.isAchieved ? 'text-emerald-600' : 'text-slate-600'
                )}>
                  {goal.type === 'currency'
                    ? formatCurrency(goal.actual as number)
                    : formatPercent(goal.actual as number)
                  }
                </p>
                {!goal.isAchieved && goal.type === 'currency' && (
                  <p className="text-xs text-amber-600">
                    あと {formatCurrency((goal.target as number) - (goal.actual as number))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">今月の達成状況</span>
            </div>
            <span className="text-sm font-bold text-blue-600">
              {daysAchievedThisMonth}日 / {currentDayOfMonth}日
            </span>
          </div>
          <Progress value={monthlyProgress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>達成率 {monthlyProgress}%</span>
            <span>残り{remainingDays}営業日</span>
          </div>
        </div>

        {requiredAchievementDays > remainingDays && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-amber-700">
                月次目標達成には、残り全日の達成が必要です
              </p>
              <p className="text-amber-600 mt-1">
                あと{requiredAchievementDays}日の達成が必要 / 残り{remainingDays}営業日
              </p>
            </div>
          </div>
        )}

        {allAchieved && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-medium text-emerald-700">
              本日の目標をすべて達成しました！この調子で月次目標をクリアしましょう
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const DailyGoalAchievementCardCompact: React.FC<DailyGoalAchievementCardProps> = ({
  monthlyTarget,
  todayMetrics,
  operatingDaysInMonth,
  currentDayOfMonth,
  daysAchievedThisMonth,
  className
}) => {
  const dailySalesTarget = Math.ceil(monthlyTarget.targetSales / operatingDaysInMonth)

  const goals = [
    {
      label: '売上',
      achieved: todayMetrics.sales >= dailySalesTarget,
      icon: '💰'
    },
    {
      label: '原価率',
      achieved: todayMetrics.costRate <= monthlyTarget.targetCostRate,
      icon: '📦'
    },
    {
      label: '人件費率',
      achieved: todayMetrics.laborRate <= monthlyTarget.targetLaborRate,
      icon: '👥'
    }
  ]

  const achievedCount = goals.filter(g => g.achieved).length
  const allAchieved = achievedCount === goals.length

  return (
    <Card className={cn(
      'cursor-pointer hover:shadow-md transition-all',
      allAchieved ? 'border-emerald-300 bg-emerald-50/50' : '',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              allAchieved ? 'bg-emerald-100' : 'bg-slate-100'
            )}>
              <Target className={cn(
                'w-5 h-5',
                allAchieved ? 'text-emerald-600' : 'text-slate-500'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium">今日の必達目標</p>
              <div className="flex items-center gap-1 mt-1">
                {goals.map((goal, i) => (
                  <span
                    key={i}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      goal.achieved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {goal.icon} {goal.achieved ? '達成' : '未達'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={allAchieved ? 'default' : 'secondary'}
              className={allAchieved ? 'bg-emerald-500' : ''}
            >
              {achievedCount}/{goals.length}
            </Badge>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
