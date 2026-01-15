import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid, LabelList } from 'recharts'
import { DailyReportData } from '@/types'
import { formatCurrency } from '@/lib/format'
import { DailyExpenseReference } from '@/hooks/useexpensebaseline'

const ProfitWaterfallComponent: React.FC<{
  reports: DailyReportData[]
  expenseBaseline?: DailyExpenseReference
  adjustedLaborCost?: number
}> = ({ reports, expenseBaseline, adjustedLaborCost }) => {
  const totals = useMemo(() => {
    const dailyGroups = new Map<string, {
      sales: number
      purchase: number
      labor: number
      utilities: number
      rent: number
      consumables: number
      promotion: number
      cleaning: number
      misc: number
      communication: number
      others: number
    }>()

    reports.forEach(r => {
      const key = r.date

      if (!dailyGroups.has(key)) {
        dailyGroups.set(key, {
          sales: 0, purchase: 0, labor: 0, utilities: 0, rent: 0,
          consumables: 0, promotion: 0, cleaning: 0, misc: 0, communication: 0, others: 0
        })
      }

      const group = dailyGroups.get(key)!
      group.sales += r.sales
      if (r.purchase > 0) {
        group.purchase = Math.max(group.purchase, r.purchase)
      }
      group.labor += r.laborCost
      group.utilities += r.utilities
      group.rent += r.rent || 0
      group.consumables += r.consumables || 0
      group.promotion += r.promotion
      group.cleaning += r.cleaning
      group.misc += r.misc
      group.communication += r.communication
      group.others += r.others
    })

    const actualTotals = Array.from(dailyGroups.values()).reduce((a, g) => {
      a.sales += g.sales
      a.purchase += g.purchase
      a.labor += g.labor
      a.utilities += g.utilities
      a.rent += g.rent
      a.consumables += g.consumables
      a.promotion += g.promotion
      a.cleaning += g.cleaning
      a.misc += g.misc
      a.communication += g.communication
      a.others += g.others
      return a
    }, {
      sales:0, purchase:0, labor:0, utilities:0, rent:0, consumables:0, promotion:0, cleaning:0, misc:0, communication:0, others:0
    })

    // 調整済み人件費がある場合は使用
    if (adjustedLaborCost !== undefined && adjustedLaborCost > 0) {
      actualTotals.labor = adjustedLaborCost
    }

    // ユニークな日付の数を計算（参考経費の日数として使用）
    const uniqueDaysCount = dailyGroups.size

    // 参考経費がある場合、実際の経費がゼロの項目は参考経費を使用
    if (expenseBaseline && uniqueDaysCount > 0) {
      if (actualTotals.utilities === 0) actualTotals.utilities = (expenseBaseline.utilities || 0) * uniqueDaysCount
      if (actualTotals.rent === 0) actualTotals.rent = (expenseBaseline.rent || 0) * uniqueDaysCount
      if (actualTotals.consumables === 0) actualTotals.consumables = (expenseBaseline.consumables || 0) * uniqueDaysCount
      if (actualTotals.promotion === 0) actualTotals.promotion = (expenseBaseline.promotion || 0) * uniqueDaysCount
      if (actualTotals.cleaning === 0) actualTotals.cleaning = (expenseBaseline.cleaning || 0) * uniqueDaysCount
      if (actualTotals.misc === 0) actualTotals.misc = (expenseBaseline.misc || 0) * uniqueDaysCount
      if (actualTotals.communication === 0) actualTotals.communication = (expenseBaseline.communication || 0) * uniqueDaysCount
      if (actualTotals.others === 0) actualTotals.others = (expenseBaseline.others || 0) * uniqueDaysCount
    }

    return actualTotals
  }, [reports, expenseBaseline, adjustedLaborCost])

  // ウォーターフォール用データ作成
  const steps = [
    { name: '売上', value: totals.sales },
    { name: '仕入', value: -totals.purchase },
    { name: '人件費', value: -totals.labor },
    { name: '光熱費', value: -totals.utilities },
    { name: '家賃', value: -totals.rent },
    { name: '消耗品費', value: -totals.consumables },
    { name: '販促費', value: -totals.promotion },
    { name: '清掃費', value: -totals.cleaning },
    { name: '雑費', value: -totals.misc },
    { name: '通信費', value: -totals.communication },
    { name: 'その他', value: -totals.others },
  ]
  let running = 0
  const data = steps.map(s => {
    const base = Math.max(0, running) // 見た目を整えるため簡易オフセット
    running += s.value
    return { name: s.name, base, delta: s.value }
  })
  const operatingProfit = running

  // 最終「営業利益」
  data.push({ name: '営業利益', base: Math.min(data[data.length-1].base + data[data.length-1].delta, 0), delta: operatingProfit })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">損益ウォーターフォール</CardTitle>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short'
          })} 現在
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[600px]">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis tickFormatter={(v)=>`¥${(v/10000).toFixed(0)}万`} className="text-xs" />
                <Tooltip
                  formatter={(v: number, key) => [formatCurrency(key === 'delta' ? v as number : 0), key === 'delta' ? '金額' : '']}
                  labelFormatter={(l) => l}
                  contentStyle={{ background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:6 }}
                />
                {/* base: 透明オフセット */}
                <Bar dataKey="base" stackId="a" fill="transparent" />
                {/* delta: 実バー */}
                <Bar dataKey="delta" stackId="a" fill="hsl(var(--primary))">
                  <LabelList dataKey="delta" position="top" formatter={(v: number)=> (v>=0?'+':'') + (v/10000).toFixed(0) + '万'} className="text-xs" />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const ProfitWaterfall = React.memo(ProfitWaterfallComponent)