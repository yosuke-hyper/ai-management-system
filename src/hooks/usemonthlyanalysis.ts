import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { generateMockMonthlyRollup, type MonthlyRollup } from '@/lib/mock'
import { useAuth } from '@/contexts/authcontext'
import { ric, cic } from '@/lib/idle'
import { getDailyReports, getMonthlyExpenses } from '@/services/supabase'

export function useMonthlyAnalysis(storeId: string | 'all') {
  const { isDemoMode, user } = useAuth()
  const [rows, setRows] = useState<MonthlyRollup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const inflight = useRef(false)
  const idleId = useRef<any>(null)

  useEffect(() => {
    let aborted = false
    if (inflight.current) return
    inflight.current = true
    setIsLoading(true)

    const sid = storeId === 'all' ? undefined : storeId

    // デモモード：モックデータを使用
    if (isDemoMode) {
      const initial = generateMockMonthlyRollup(30, sid)

      if (!aborted) {
        startTransition(() => setRows(initial))
        setIsLoading(false)
      }

      idleId.current = ric(() => {
        if (aborted) return
        const full = generateMockMonthlyRollup(90, sid)
        startTransition(() => setRows(full))
      })
    } else {
      // 本番モード：Supabaseから実データを取得
      const loadRealData = async () => {
        try {
          // 過去12ヶ月分のデータを取得
          const now = new Date()
          const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
          const dateFrom = startDate.toISOString().split('T')[0]
          const dateTo = now.toISOString().split('T')[0]

          // 日報データを取得
          const { data: reports } = await getDailyReports({
            storeId: sid,
            dateFrom,
            dateTo
          })

          // 月次経費データを取得（組織全体で共有）
          const { data: expenses } = await getMonthlyExpenses({
            storeId: sid
          })

          // 月次経費をマップに変換
          const expenseMap = new Map<string, any>()
          expenses?.forEach(exp => {
            const key = `${exp.store_id}-${exp.month}`
            expenseMap.set(key, exp)
          })

          console.log('📊 useMonthlyAnalysis: 月次経費データ', {
            expenseCount: expenses?.length || 0,
            expenseKeys: Array.from(expenseMap.keys())
          })

          // 日報を月次でグループ化
          const monthlyMap = new Map<string, MonthlyRollup>()

          reports?.forEach(report => {
            const yyyymm = report.date.slice(0, 7)
            const key = `${report.store_id}-${yyyymm}`

            if (!monthlyMap.has(key)) {
              monthlyMap.set(key, {
                storeId: report.store_id,
                storeName: report.store_name || '',
                ym: yyyymm,
                days: 0,
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
                others: 0,
                customers: 0
              })
            }

            const monthly = monthlyMap.get(key)!
            monthly.days += 1
            monthly.sales += report.sales
            monthly.purchase += report.purchase
            monthly.laborCost += report.labor_cost
            monthly.utilities += report.utilities || 0
            monthly.rent += report.rent || 0
            monthly.consumables += report.consumables || 0
            monthly.promotion += report.promotion || 0
            monthly.cleaning += report.cleaning || 0
            monthly.misc += report.misc || 0
            monthly.communication += report.communication || 0
            monthly.others += report.others || 0
            monthly.customers += report.customers || 0
          })

          // 月次経費データで上書き（入力されている場合）
          console.log('📊 useMonthlyAnalysis: 月次集計前', {
            monthlyKeys: Array.from(monthlyMap.keys()),
            monthlyCount: monthlyMap.size
          })

          monthlyMap.forEach((monthly, key) => {
            const expense = expenseMap.get(key)
            if (expense) {
              console.log('✅ 月次経費適用:', {
                key,
                month: monthly.ym,
                store: monthly.storeName,
                expense: {
                  laborCost: expense.labor_cost_employee + expense.labor_cost_part_time,
                  utilities: expense.utilities,
                  rent: expense.rent
                }
              })
              // 月次経費が入力されている場合は、それで上書き
              monthly.laborCost = expense.labor_cost_employee + expense.labor_cost_part_time
              monthly.utilities = expense.utilities
              monthly.rent = expense.rent || 0
              monthly.consumables = expense.consumables || 0
              monthly.promotion = expense.promotion
              monthly.cleaning = expense.cleaning
              monthly.misc = expense.misc
              monthly.communication = expense.communication
              monthly.others = expense.others
            }
          })

          const rollupData = Array.from(monthlyMap.values())

          if (!aborted) {
            startTransition(() => setRows(rollupData))
            setIsLoading(false)
          }
        } catch (error) {
          console.error('❌ useMonthlyAnalysis: データ取得エラー:', error)
          if (!aborted) {
            setRows([])
            setIsLoading(false)
          }
        }
      }

      loadRealData()
    }

    return () => {
      aborted = true
      inflight.current = false
      if (idleId.current) {
        cic(idleId.current)
        idleId.current = null
      }
    }
  }, [storeId, isDemoMode, user?.id])

  const kpi = useMemo(() => {
    let sales = 0
    let gp = 0
    let purchase = 0
    for (const r of rows) {
      sales += r.sales
      purchase += r.purchase
    }
    gp = sales - purchase
    return {
      sales,
      grossProfit: gp,
      margin: sales ? gp / sales : 0
    }
  }, [rows])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.ym.localeCompare(b.ym) || a.storeId.localeCompare(b.storeId))
  }, [rows])

  return { rows: sorted, kpi, isLoading: isLoading || isPending }
}
