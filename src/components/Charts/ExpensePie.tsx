import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { DailyReportData } from '@/types'
import { DailyExpenseReference } from '@/hooks/useExpenseBaseline'

interface ExpensePieProps {
  reports: DailyReportData[]
  period?: 'daily' | 'weekly' | 'monthly'
  className?: string
  title?: string
  expenseBaseline?: DailyExpenseReference
  daysCount?: number
}

const COLORS = {
  '仕入': '#ef4444',        // red-500
  'その他経費': '#f59e0b',  // amber-500
  '営業利益': '#10b981'      // emerald-500 (green for profit)
}

export const ExpensePie: React.FC<ExpensePieProps> = ({
  reports,
  period = 'daily',
  className,
  title,
  expenseBaseline,
  daysCount
}) => {
  const expenseData = React.useMemo(() => {
    const totals = reports.reduce((acc, report) => ({
      sales: acc.sales + report.sales,
      purchase: acc.purchase + report.purchase,
      laborCost: acc.laborCost + report.laborCost,
      utilities: acc.utilities + report.utilities,
      rent: acc.rent + (report.rent || 0),
      consumables: acc.consumables + (report.consumables || 0),
      promotion: acc.promotion + report.promotion,
      cleaning: acc.cleaning + report.cleaning,
      misc: acc.misc + report.misc,
      communication: acc.communication + report.communication,
      others: acc.others + report.others
    }), {
      sales: 0,
      purchase: 0,
      laborCost: 0,
      utilities: 0,
      rent: 0,
      consumables: 0,
      promotion: 0,
      cleaning: 0,
      misc: 0,
      communication: 0,
      others: 0
    })

    // 実際にデータがある日数を計算（ユニークな日付の数）
    const uniqueDates = new Set(reports.map(r => r.date))
    const actualDaysCount = uniqueDates.size

    // その他経費の合計を計算
    let otherExpenses = totals.laborCost + totals.utilities + totals.rent +
                        totals.consumables + totals.promotion + totals.cleaning +
                        totals.misc + totals.communication + totals.others

    // 参考経費が提供されている場合、それを使用（実際のデータ日数を優先）
    if (expenseBaseline && expenseBaseline.sumOther > 0) {
      // 実際にデータがある日数分の参考経費を計算
      const effectiveDays = actualDaysCount > 0 ? actualDaysCount : (daysCount || 0)
      otherExpenses = expenseBaseline.sumOther * effectiveDays
    }

    // 営業利益 = 売上 - 仕入 - その他経費
    const operatingProfit = totals.sales - totals.purchase - otherExpenses

    return [
      { name: '仕入', value: totals.purchase },
      { name: 'その他経費', value: otherExpenses },
      { name: '営業利益', value: operatingProfit > 0 ? operatingProfit : 0 }
    ].filter(item => item.value > 0)
  }, [reports, expenseBaseline, daysCount])

  const total = expenseData.reduce((sum, item) => sum + item.value, 0)

  const getTitle = () => {
    if (title) return title
    switch (period) {
      case 'daily':
        return '経費内訳（過去7日間）'
      case 'weekly':
        return '経費内訳（過去30日間）'
      case 'monthly':
        return '経費内訳（過去3ヶ月）'
      default:
        return '経費内訳'
    }
  }

  const totalSales = reports.reduce((sum, report) => sum + report.sales, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <div className="text-sm text-muted-foreground">合計売上</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalSales)}</div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expenseData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
            >
              {expenseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${formatCurrency(value)} (${((value / total) * 100).toFixed(1)}%)`
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '14px' }}
              formatter={(value, entry) => {
                const itemValue = entry.payload?.value || 0
                const percentage = total > 0 ? ((itemValue / total) * 100).toFixed(1) : '0.0'
                return `${value}: ${formatCurrency(itemValue)} (${percentage}%)`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}