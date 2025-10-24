import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { type DailyReportData } from '@/types'
import { getDailyReports, getMonthlyExpenses } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface ReportFilters {
  storeId?: string
  dateFrom?: string
  dateTo?: string
  period?: 'daily' | 'weekly' | 'monthly'
}

export const useReports = (filters: ReportFilters = {}) => {
  const [data, setData] = useState<DailyReportData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // ✅ 安定キー：依存の変化だけ検知（参照安定）
  const stableKey = useMemo(
    () => JSON.stringify({
      s: filters.storeId ?? '',
      f: filters.dateFrom ?? '',
      t: filters.dateTo ?? '',
      p: filters.period ?? '',
      u: user?.id ?? ''
    }),
    [filters.storeId, filters.dateFrom, filters.dateTo, filters.period, user?.id]
  )

  // ✅ 古いリクエストを中断するためのAbortController
  const abortRef = useRef<AbortController | null>(null)

  const fetchReports = useCallback(async (signal: AbortSignal, key: string) => {
    // ✅ keyから値を復元（クロージャで古い値を掴まない）
    const params = JSON.parse(key) as { s: string; f: string; t: string; p: string; u: string }

    // ✅ ログを最小限に
    // console.log('🔄 useReports: fetchReports called', { key, params })

    if (!params.u) {
      // ユーザーがいない場合は空データ
      setData([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setIsError(false)
      setError(null)

      // Supabaseから日次報告を取得
      const { data: reportsData, error: reportsError } = await getDailyReports({
        storeId: params.s || undefined,
        dateFrom: params.f || undefined,
        dateTo: params.t || undefined,
        userId: params.u
      })

      // ✅ 中断されていたらsetStateしない（古いレスポンスの反映防止）
      if (signal.aborted) {
        // console.log('⚠️ useReports: Request aborted')
        return
      }

      if (reportsError) {
        throw new Error(reportsError.message)
      }

      let filteredData = reportsData || []
      let uniqueLocalCount = 0

      // ローカルストレージの既存データも取得（移行期間用）
      const localReports: DailyReportData[] = JSON.parse(localStorage.getItem('userReports') || '[]')
      if (localReports.length > 0) {
        // console.log('📦 useReports: ローカルデータも含めます:', localReports.length, '件')
        // ローカルデータをマージする際、storeIdでフィルタリング
        const filteredLocal = localReports.filter(r => {
          if (params.s && params.s !== 'all' && r.storeId !== params.s) return false
          if (params.f && r.date < params.f) return false
          if (params.t && r.date > params.t) return false
          return true
        })

        // console.log('📦 ローカルデータフィルター結果', {
        //   totalLocal: localReports.length,
        //   filteredLocal: filteredLocal.length,
        //   filters: params,
        //   sampleDates: filteredLocal.slice(0, 5).map(r => r.date)
        // })

        // 重複を防ぐ：同じdate+storeIdの組み合わせがSupabaseにある場合はローカルを除外
        const uniqueLocal = filteredLocal.filter(localReport => {
          return !filteredData.some(supabaseReport =>
            supabaseReport.date === localReport.date &&
            supabaseReport.storeId === localReport.storeId
          )
        })

        if (uniqueLocal.length > 0) {
          uniqueLocalCount = uniqueLocal.length
          // console.log('📦 重複を除外後:', uniqueLocalCount, '件のローカルデータを追加')
          filteredData = [...filteredData, ...uniqueLocal]
        }
      }

      // 月次経費データは日報リストに混ぜない
      // 月次経費は別途MonthlyExpenseForm等で管理

      // 日付順にソート
      filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // console.log('📊 useReports: 最終データ', {
      //   total: filteredData.length,
      //   supabase: (reportsData || []).length,
      //   local: uniqueLocalCount,
      //   sample: filteredData[0] // 最新の1件をサンプル表示
      // })

      // ✅ 中断チェック
      if (signal.aborted) return
      setData(filteredData)
    } catch (err) {
      // ✅ 中断チェック
      if (signal.aborted) return
      setIsError(true)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      // ✅ 中断チェック
      if (!signal.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('🎯 useReports: useEffect triggered', { stableKey })

    // ✅ 旧リクエストを必ず中断
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    fetchReports(controller.signal, stableKey)

    return () => {
      console.log('🧹 useReports: Cleanup - aborting')
      controller.abort()
    }
  }, [stableKey])

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchReports
  }
}