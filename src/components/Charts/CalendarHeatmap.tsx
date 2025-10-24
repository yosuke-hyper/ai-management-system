import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DailyReportData } from '@/types'
import { formatCurrency } from '@/lib/format'

export const CalendarHeatmap: React.FC<{ reports: DailyReportData[] }> = ({ reports }) => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-11
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const daysInMonth = last.getDate()
  const firstWeekDay = first.getDay() // 0 Sun

  const salesByDay = useMemo(() => {
    const map = new Map<number, number>()
    reports.forEach(r => {
      const d = new Date(r.date)
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate()
        map.set(day, (map.get(day) || 0) + r.sales)
      }
    })
    return map
  }, [reports, y, m])

  const max = Math.max(1, ...Array.from(salesByDay.values()))

  const cells: Array<{ day?: number; value?: number }> = []
  for (let i = 0; i < firstWeekDay; i++) cells.push({})
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, value: salesByDay.get(d) || 0 })

  const color = (v: number) => {
    const alpha = Math.min(1, (v / max) * 0.9 + 0.1)
    return `rgba(59,130,246,${alpha})` // Tailwind blue-500 に近い
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{now.toLocaleDateString('ja-JP',{year:'numeric',month:'long'})} 売上ヒートマップ</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['日','月','火','水','木','金','土'].map((w,i)=>(
            <div key={i} className="text-xs text-muted-foreground text-center py-1">{w}</div>
          ))}
          {cells.map((c, i) => (
            <div
              key={i}
              className="h-16 rounded-md flex flex-col items-center justify-center text-xs p-1"
              style={{ backgroundColor: c.day ? color(c.value || 0) : 'transparent', color: c.day ? 'white' : 'inherit' }}
              title={c.day ? `${c.day}日: ${formatCurrency(c.value || 0)}` : ''}
            >
              {c.day && (
                <>
                  <div className="font-medium">{c.day}</div>
                  <div className="text-xs font-mono leading-tight">
                    {c.value > 0 ? `¥${(c.value / 10000).toFixed(0)}万` : '0'}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>低</span>
          <div className="h-3 flex-1 rounded" style={{background:'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.9))'}} />
          <span>高</span>
        </div>
      </CardContent>
    </Card>
  )
}