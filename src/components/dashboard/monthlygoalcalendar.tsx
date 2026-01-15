import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayStatus {
  date: string
  isOperatingDay: boolean
  isHoliday: boolean
  sales: number
  targetSales: number
  costRate: number
  targetCostRate: number
  laborRate: number
  targetLaborRate: number
  allGoalsAchieved: boolean
  salesAchieved: boolean
  costRateAchieved: boolean
  laborRateAchieved: boolean
}

interface MonthlyGoalCalendarProps {
  year: number
  month: number
  dayStatuses: DayStatus[]
  monthlyTargetSales: number
  currentMonthlySales: number
  operatingDaysInMonth: number
  className?: string
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export const MonthlyGoalCalendar: React.FC<MonthlyGoalCalendarProps> = ({
  year,
  month,
  dayStatuses,
  monthlyTargetSales,
  currentMonthlySales,
  operatingDaysInMonth,
  className
}) => {
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const statusMap = new Map(dayStatuses.map(d => [d.date, d]))

    const weeks: (DayStatus | null)[][] = []
    let currentWeek: (DayStatus | null)[] = []

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const status = statusMap.get(dateStr) || null
      currentWeek.push(status)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    return weeks
  }, [year, month, dayStatuses])

  const stats = useMemo(() => {
    const operatingDays = dayStatuses.filter(d => d.isOperatingDay && !d.isHoliday)
    const achievedDays = operatingDays.filter(d => d.allGoalsAchieved)
    const today = new Date()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    const currentDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate()
    const passedOperatingDays = operatingDays.filter(d => {
      const dayNum = parseInt(d.date.split('-')[2])
      return dayNum <= currentDay
    })

    return {
      totalOperatingDays: operatingDaysInMonth,
      passedDays: passedOperatingDays.length,
      achievedDays: achievedDays.length,
      achievementRate: passedOperatingDays.length > 0
        ? Math.round((achievedDays.length / passedOperatingDays.length) * 100)
        : 0,
      remainingDays: operatingDaysInMonth - passedOperatingDays.length,
      salesProgress: monthlyTargetSales > 0
        ? Math.round((currentMonthlySales / monthlyTargetSales) * 100)
        : 0
    }
  }, [dayStatuses, operatingDaysInMonth, year, month, monthlyTargetSales, currentMonthlySales])

  const [hoveredDay, setHoveredDay] = useState<DayStatus | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const getDayColor = (status: DayStatus | null, dayOfWeek: number) => {
    if (!status) return 'bg-transparent'
    if (status.isHoliday) return 'bg-slate-100 text-slate-400'
    if (!status.isOperatingDay) return 'bg-slate-50 text-slate-300'

    const today = new Date()
    const statusDate = new Date(status.date)
    const isFuture = statusDate > today

    if (isFuture) {
      return 'bg-slate-50 border-dashed border-slate-200'
    }

    if (status.allGoalsAchieved) {
      return 'bg-emerald-100 border-emerald-300 text-emerald-700'
    }

    if (status.salesAchieved || status.costRateAchieved || status.laborRateAchieved) {
      return 'bg-amber-50 border-amber-200 text-amber-700'
    }

    return 'bg-red-50 border-red-200 text-red-600'
  }

  const getStatusLabel = (status: DayStatus): { label: string; color: string } => {
    const today = new Date()
    const statusDate = new Date(status.date)
    const isFuture = statusDate > today

    if (status.isHoliday) return { label: '休業日', color: 'text-slate-500' }
    if (!status.isOperatingDay) return { label: '営業日外', color: 'text-slate-400' }
    if (isFuture) return { label: '未営業', color: 'text-slate-400' }
    if (status.allGoalsAchieved) return { label: '達成', color: 'text-emerald-600' }
    if (status.salesAchieved || status.costRateAchieved || status.laborRateAchieved) {
      return { label: '一部', color: 'text-amber-600' }
    }
    return { label: '未達', color: 'text-red-600' }
  }

  const handleMouseEnter = (e: React.MouseEvent, day: DayStatus) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top })
    setHoveredDay(day)
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
  }

  return (
    <Card className={className}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            {month}月の達成カレンダー
          </CardTitle>
          <Badge
            variant={stats.achievementRate >= 80 ? 'default' : 'secondary'}
            className={cn(
              'text-xs px-1.5 py-0',
              stats.achievementRate >= 80 && 'bg-emerald-500'
            )}
          >
            {stats.achievementRate}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={cn(
                'text-center text-xs font-medium py-1.5',
                i === 0 && 'text-red-500',
                i === 6 && 'text-blue-500'
              )}
            >
              {label}
            </div>
          ))}

          {calendarData.flatMap((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const dayNum = day ? parseInt(day.date.split('-')[2]) : null
              const today = new Date()
              const isPastDay = day && new Date(day.date) <= today && day.isOperatingDay && !day.isHoliday
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    'h-10 w-full flex flex-col items-center justify-center rounded text-xs border transition-all relative',
                    day ? getDayColor(day, dayIndex) : 'bg-transparent border-transparent',
                    day && !day.isHoliday && day.isOperatingDay && 'hover:shadow cursor-pointer'
                  )}
                  onMouseEnter={isPastDay ? (e) => handleMouseEnter(e, day) : undefined}
                  onMouseLeave={isPastDay ? handleMouseLeave : undefined}
                >
                  {dayNum && (
                    <span className="font-medium leading-none">{dayNum}</span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {hoveredDay && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-3 min-w-[180px] pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y - 8,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="text-xs font-medium text-slate-600 mb-2 pb-1.5 border-b">
              {hoveredDay.date.replace(/-/g, '/')}
              <span className={cn('ml-2 font-semibold', getStatusLabel(hoveredDay).color)}>
                {getStatusLabel(hoveredDay).label}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">売上</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {(hoveredDay.sales / 10000).toFixed(1)}万 / {(hoveredDay.targetSales / 10000).toFixed(1)}万
                  </span>
                  {hoveredDay.salesAchieved ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">原価率</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {hoveredDay.costRate.toFixed(1)}% / {hoveredDay.targetCostRate.toFixed(1)}%以下
                  </span>
                  {hoveredDay.costRateAchieved ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">人件費率</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {hoveredDay.laborRate.toFixed(1)}% / {hoveredDay.targetLaborRate.toFixed(1)}%以下
                  </span>
                  {hoveredDay.laborRateAchieved ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
            <span>達成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200" />
            <span>一部</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200" />
            <span>未達</span>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">売上進捗</span>
            <span className="font-medium">{stats.salesProgress}%</span>
          </div>
          <Progress value={stats.salesProgress} className="h-2" />

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="py-2 bg-emerald-50 rounded">
              <div className="text-base font-bold text-emerald-600">{stats.achievedDays}</div>
              <div className="text-[11px] text-emerald-700">達成</div>
            </div>
            <div className="py-2 bg-red-50 rounded">
              <div className="text-base font-bold text-red-600">{stats.passedDays - stats.achievedDays}</div>
              <div className="text-[11px] text-red-700">未達</div>
            </div>
            <div className="py-2 bg-blue-50 rounded">
              <div className="text-base font-bold text-blue-600">{stats.remainingDays}</div>
              <div className="text-[11px] text-blue-700">残り</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
