import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatPercent } from '@/lib/format'

type Item = {
  label: string
  actual: number
  target: number
  format: 'currency' | 'percent'
}
export const KpiBullets: React.FC<{ items: Item[] }> = ({ items }) => {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">目標進捗（バレット）</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {items.map((it, i) => {
          const ratio = it.target > 0 ? Math.min(100, (it.actual / it.target) * 100) : 0
          const fmt = (n: number) => it.format === 'currency' ? formatCurrency(n) : formatPercent(n)
          const tone =
            ratio >= 100 ? 'text-green-600' :
            ratio >= 80  ? 'text-yellow-600' : 'text-red-600'
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{it.label}</span>
                <span className={`font-medium ${tone}`}>{fmt(it.actual)} / 目標 {fmt(it.target)}</span>
              </div>
              <Progress value={ratio} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}