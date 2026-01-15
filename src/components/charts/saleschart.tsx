import React from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MonthSelector } from '@/components/ui/month-selector'
import { X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { DailyReportData, OperationType } from '@/types'
import { DailyExpenseReference } from '@/hooks/useexpensebaseline'

interface SalesChartProps {
  reports: DailyReportData[]
  period: 'daily' | 'weekly' | 'monthly'
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void
  targetSales?: number
  className?: string
  /** 表示するデータ点の最大数（例：月次=12, 週次=26, 日次=30 など） */
  maxPoints?: number
  onDataPointClick?: (period: string) => void
  expenseBaseline?: DailyExpenseReference
  /** 日次表示用: 特定の月でフィルタリング（YYYY-MM形式） */
  selectedMonth?: string
  onMonthChange?: (month: string | undefined) => void
}

const SalesChartComponent: React.FC<SalesChartProps> = ({
  reports,
  period,
  onPeriodChange,
  targetSales,
  className,
  maxPoints,
  onDataPointClick,
  expenseBaseline,
  selectedMonth,
  onMonthChange
}) => {
  const [viewMode, setViewMode] = React.useState<'total' | 'breakdown'>('total')
  // Process data for chart
  const chartData = React.useMemo(() => {
    // 日次表示で月が選択されている場合、その月のデータのみをフィルタリング
    let filteredReports = reports
    if (period === 'daily' && selectedMonth) {
      filteredReports = reports.filter(report => {
        const reportMonth = report.date.slice(0, 7)
        return reportMonth === selectedMonth
      })
    }

    const groupedData = new Map<string, {
      date: string
      sales: number
      lunchSales: number
      dinnerSales: number
      profit: number
      purchase: number
      count: number
    }>()

    filteredReports.forEach(report => {
      const date = new Date(report.date)
      let key: string

      switch (period) {
        case 'daily':
          key = report.date
          break
        case 'weekly':
          const weekStart = new Date(date)
          const dow = (date.getDay() + 6) % 7 // 月曜=0
          weekStart.setDate(date.getDate() - dow)
          key = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, { date: key, sales: 0, lunchSales: 0, dinnerSales: 0, profit: 0, purchase: 0, count: 0 })
      }

      const data = groupedData.get(key)!

      data.sales += report.sales
      data.purchase += report.purchase
      data.count += 1

      // Track lunch and dinner separately
      if (report.operationType === 'lunch') {
        data.lunchSales += report.sales
      } else if (report.operationType === 'dinner') {
        data.dinnerSales += report.sales
      } else if (report.operationType === 'full_day') {
        // For full_day, count as dinner
        data.dinnerSales += report.sales
      }
    })

    // 参考経費を使用して営業利益を計算
    const sorted = Array.from(groupedData.values()).map(data => {
      let otherExpenses = 0

      // 参考経費が提供されている場合
      if (expenseBaseline && expenseBaseline.sumOther > 0) {
        // 日次の場合: データポイントの日数分の参考経費
        otherExpenses = expenseBaseline.sumOther * data.count
      }

      // 営業利益 = 売上 - 仕入 - その他経費
      const profit = data.sales - data.purchase - otherExpenses

      return {
        ...data,
        profit
      }
    }).sort((a, b) => a.date.localeCompare(b.date))

    // 日次表示で月が選択されている場合は全データを表示、それ以外は制限を適用
    if (period === 'daily' && selectedMonth) {
      return sorted
    }

    const limit = maxPoints ?? (period === 'monthly' ? 12 : period === 'weekly' ? 26 : 30)
    return sorted.slice(-limit)
  }, [reports, period, expenseBaseline, selectedMonth])

  const formatXAxisLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      case 'weekly':
        return `${date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}週`
      case 'monthly':
        return date.toLocaleDateString('ja-JP', { year: '2-digit', month: 'short' })
      default:
        return dateStr
    }
  }

  // 利用可能な月のリストを生成（日次表示のみ、現在の月を含む）
  const availableMonths = React.useMemo(() => {
    if (period !== 'daily') return []
    const monthsSet = new Set<string>()

    // Add current month to always show it as an option
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    monthsSet.add(currentMonth)

    reports.forEach(report => {
      const month = report.date.slice(0, 7)
      monthsSet.add(month)
    })
    return Array.from(monthsSet).sort().reverse()
  }, [reports, period])

  // グラフタイトルの生成
  const chartTitle = React.useMemo(() => {
    if (period === 'daily' && selectedMonth) {
      const [year, month] = selectedMonth.split('-')
      return `${year}年${parseInt(month)}月の売上推移`
    }
    return '売上推移'
  }, [period, selectedMonth])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg font-semibold">
              {chartTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'total' | 'breakdown')}>
                <TabsList className="h-8">
                  <TabsTrigger value="total" className="text-xs">合計</TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs">ランチ/ディナー</TabsTrigger>
                </TabsList>
              </Tabs>
              {onPeriodChange && (
                <Tabs value={period} onValueChange={onPeriodChange as any}>
                  <TabsList className="h-8">
                    <TabsTrigger value="daily" className="text-xs">日次</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs">週次</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs">月次</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </div>
          {period === 'daily' && onMonthChange && availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={onMonthChange}
                availableMonths={availableMonths}
                className="flex-1"
              />
              {selectedMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMonthChange(undefined)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4 mr-1" />
                  クリア
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[500px]">
            {viewMode === 'total' ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisLabel}
                    className="text-muted-foreground text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                    className="text-muted-foreground text-xs"
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name
                    ]}
                    labelFormatter={formatXAxisLabel}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {targetSales && (
                    <ReferenceLine
                      y={targetSales}
                      stroke="hsl(var(--ring))"
                      strokeDasharray="4 4"
                      label="目標"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="売上"
                    stroke="#6366f1"
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                    onClick={(data: any) => {
                      if (onDataPointClick && data?.payload) {
                        onDataPointClick(data.payload.date)
                      }
                    }}
                    style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="営業利益"
                    stroke="#10b981"
                    fill="url(#profitGradient)"
                    strokeWidth={2}
                    onClick={(data: any) => {
                      if (onDataPointClick && data?.payload) {
                        onDataPointClick(data.payload.date)
                      }
                    }}
                    style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxisLabel}
                    className="text-muted-foreground text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                    className="text-muted-foreground text-xs"
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const label = name === 'lunchSales' ? 'ランチ売上' : 'ディナー売上'
                      return [formatCurrency(value), label]
                    }}
                    labelFormatter={formatXAxisLabel}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend
                    formatter={(value: string) => value === 'lunchSales' ? 'ランチ売上' : 'ディナー売上'}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  {targetSales && (
                    <ReferenceLine
                      y={targetSales}
                      stroke="hsl(var(--ring))"
                      strokeDasharray="4 4"
                      label="目標"
                    />
                  )}
                  <Bar
                    dataKey="lunchSales"
                    stackId="sales"
                    fill="#f59e0b"
                    onClick={(data: any) => {
                      if (onDataPointClick && data?.payload) {
                        onDataPointClick(data.payload.date)
                      }
                    }}
                    style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  />
                  <Bar
                    dataKey="dinnerSales"
                    stackId="sales"
                    fill="#6366f1"
                    onClick={(data: any) => {
                      if (onDataPointClick && data?.payload) {
                        onDataPointClick(data.payload.date)
                      }
                    }}
                    style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const SalesChart = React.memo(SalesChartComponent)