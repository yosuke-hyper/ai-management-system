import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { KPIData } from '@/hooks/useKpis'
import { formatPercent } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

type Props = {
  kpis: KPIData
  targetCostRate?: number
  targetLaborRate?: number
}

export const AlertsPanel: React.FC<Props> = ({ kpis, targetCostRate, targetLaborRate }) => {
  const alerts: Array<{ level: 'warn'|'danger'; title: string; desc: string }> = []

  // 目標値がある場合は目標値を使用、なければデフォルト値
  const costRateThreshold = targetCostRate || 32
  const laborRateThreshold = targetLaborRate || 27
  const primeCostThreshold = costRateThreshold + laborRateThreshold

  if (kpis.purchaseRate > costRateThreshold) alerts.push({ level:'danger', title:'原価率が高い', desc:`現在 ${formatPercent(kpis.purchaseRate)}（目標 ${formatPercent(costRateThreshold)}以下）` })
  if (kpis.laborRate > laborRateThreshold) alerts.push({ level:'danger', title:'人件費率が高い', desc:`現在 ${formatPercent(kpis.laborRate)}（目標 ${formatPercent(laborRateThreshold)}以下）` })
  if (kpis.primeCostRate > primeCostThreshold) alerts.push({ level:'warn', title:'プライムコストが高い', desc:`現在 ${formatPercent(kpis.primeCostRate)}（目標 ${formatPercent(primeCostThreshold)}以下）` })
  if (kpis.operatingProfit < 0) alerts.push({ level:'danger', title:'営業赤字', desc:'費用が売上を上回っています' })

  const ok = alerts.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">アラート</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ok ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            重大なアラートはありません。
          </div>
        ) : alerts.map((a, i)=>(
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${a.level==='danger' ? 'bg-red-50' : 'bg-yellow-50'}`}>
            <AlertCircle className={`h-4 w-4 ${a.level==='danger'?'text-red-600':'text-yellow-600'}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.desc}</div>
            </div>
            <Badge variant={a.level==='danger'?'destructive':'secondary'}>{a.level==='danger'?'重要':'注意'}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}