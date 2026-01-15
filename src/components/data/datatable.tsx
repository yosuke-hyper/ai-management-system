import React, { useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckCircle, Clock, Calculator, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, formatDate } from '@/lib/format'
import { DailyReportData, OperationType } from '@/types'
import { ExpenseBaselineDb, MonthlyExpenseDb } from '@/services/supabase'
import { MonthSelector } from '@/components/ui/month-selector'

interface DataTableProps {
  reports: DailyReportData[]
  period: 'daily' | 'weekly' | 'monthly'
  groupByStore?: boolean
  className?: string
  onPeriodClick?: (period: string) => void
  dailyTargets?: Record<string, number>
  baselineMap?: Map<string, ExpenseBaselineDb>
  monthlyExpenseMap?: Map<string, MonthlyExpenseDb>
  selectedMonth?: string
  onMonthChange?: (month: string | undefined) => void
  showMonthSelector?: boolean
}

interface ProcessedRow {
  period: string
  rawPeriodKey: string
  storeName: string
  storeId?: string
  operationType?: OperationType
  sales: number
  lunchSales?: number
  dinnerSales?: number
  purchase: number
  laborCost: number
  otherExpenses: number
  expenses: number
  grossProfit: number
  operatingProfit: number
  profitMargin: number
  reportCount: number
  targetSales?: number
  achievementRate?: number
  isAchieved?: boolean
  isMonthlyExpenseConfirmed: boolean
  usedBaseline: boolean
  expenseDataSource: 'confirmed' | 'tentative' | 'estimated'
}

// ✅ React.memo でラップして不要な再レンダを防ぐ
const DataTableImpl: React.FC<DataTableProps> = ({
  reports,
  period,
  groupByStore = true,
  className,
  onPeriodClick,
  dailyTargets = {},
  baselineMap = new Map(),
  monthlyExpenseMap = new Map(),
  selectedMonth,
  onMonthChange,
  showMonthSelector = false
}) => {
  console.log('🎯 DataTable コンポーネント実行開始', {
    reportsLength: reports.length,
    period,
    monthlyExpenseMapSize: monthlyExpenseMap.size,
    baselineMapSize: baselineMap.size
  })

  const navigate = useNavigate()
  const [sorting, setSorting] = React.useState<SortingState>([])

  // デバッグ: レポートデータを確認
  useEffect(() => {
    console.log('📊 DataTable レンダリング開始')
    console.log('📊 DataTable データ:', {
      reportsCount: reports.length,
      period,
      selectedMonth,
      groupByStore,
      sampleReport: reports[0],
      dailyTargets,
      baselineMapSize: baselineMap.size,
      monthlyExpenseMapSize: monthlyExpenseMap.size
    })
  }, [reports, period, selectedMonth, groupByStore, dailyTargets, baselineMap, monthlyExpenseMap])

  // デバッグ: processedData確認は useMemo 内で実行

  // Map を安定化（キーが変わっていなければ古いインスタンスを再利用）
  const baselineMapRef = useRef<Map<string, ExpenseBaselineDb>>(baselineMap)
  const monthlyExpenseMapRef = useRef<Map<string, MonthlyExpenseDb>>(monthlyExpenseMap)
  const dailyTargetsRef = useRef<Record<string, number>>(dailyTargets)

  const baselineMapKeys = useMemo(
    () => Array.from(baselineMap.keys()).sort().join(','),
    [baselineMap]
  )
  const monthlyExpenseMapKeys = useMemo(
    () => Array.from(monthlyExpenseMap.keys()).sort().join(','),
    [monthlyExpenseMap]
  )
  const dailyTargetsKeys = useMemo(
    () => Object.keys(dailyTargets).sort().join(','),
    [dailyTargets]
  )

  // キーが変わっていなければ古い参照を保持
  if (baselineMapKeys === Array.from(baselineMapRef.current.keys()).sort().join(',')) {
    // キーが同じなら参照を更新しない
  } else {
    baselineMapRef.current = baselineMap
  }

  if (monthlyExpenseMapKeys === Array.from(monthlyExpenseMapRef.current.keys()).sort().join(',')) {
    // キーが同じなら参照を更新しない
  } else {
    monthlyExpenseMapRef.current = monthlyExpenseMap
  }

  if (dailyTargetsKeys === Object.keys(dailyTargetsRef.current).sort().join(',')) {
    // キーが同じなら参照を更新しない
  } else {
    dailyTargetsRef.current = dailyTargets
  }

  const handleExportCsv = () => {
    const headers = ['期間','店舗名','売上','仕入','人件費','その他経費','粗利益','営業利益','利益率','報告数']
    const rows = processedData.map(r => [
      r.period,
      r.storeName,
      r.sales,
      r.purchase,
      r.laborCost,
      r.otherExpenses,
      r.grossProfit,
      r.operatingProfit,
      r.profitMargin.toFixed(1),
      r.reportCount
    ])
    const csv = [headers, ...rows].map(cols => 
      cols.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports_${period}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Process data for table
  const processedData = React.useMemo((): ProcessedRow[] => {
    console.log('🔍 processedData generation:', {
      reportsCount: reports.length,
      selectedMonth,
      period,
      groupByStore
    })

    // Filter reports by selected month if applicable
    let filteredReports = reports
    if (selectedMonth) {
      filteredReports = reports.filter(report => {
        const reportMonth = report.date.slice(0, 7) // Extract YYYY-MM
        return reportMonth === selectedMonth
      })
      console.log('🔍 After month filter:', filteredReports.length, 'reports')
    }

    // まず日ごとに経費をグループ化（週次・月次の場合に重要）
    const dailyPurchaseMap = new Map<string, number>()
    const dailyLaborMap = new Map<string, number>()
    const dailyOtherExpensesMap = new Map<string, number>()

    filteredReports.forEach(report => {
      const dailyKey = groupByStore ? `${report.date}-${report.storeId}` : report.date

      // 仕入れ: 同じ日の最大値を使用（ランチとディナーで重複カウント防止）
      const reportPurchase = Number(report.purchase) || 0
      if (reportPurchase > 0) {
        dailyPurchaseMap.set(dailyKey, Math.max(dailyPurchaseMap.get(dailyKey) || 0, reportPurchase))
      }

      // 人件費: 同じ日の最大値を使用（ランチとディナーで重複カウント防止）
      const reportLaborCost = Number(report.laborCost) || 0
      if (reportLaborCost > 0) {
        dailyLaborMap.set(dailyKey, Math.max(dailyLaborMap.get(dailyKey) || 0, reportLaborCost))
      }

      // その他経費: 同じ日の最大値を使用（ランチとディナーで重複カウント防止）
      const reportOtherExpenses =
        (report.utilities || 0) +
        (report.rent || 0) +
        (report.consumables || 0) +
        (report.promotion || 0) +
        (report.cleaning || 0) +
        (report.misc || 0) +
        (report.communication || 0) +
        (report.others || 0)
      if (reportOtherExpenses > 0) {
        dailyOtherExpensesMap.set(dailyKey, Math.max(dailyOtherExpensesMap.get(dailyKey) || 0, reportOtherExpenses))
      }
    })

    const groupedData = new Map<string, {
      period: string
      rawPeriodKey: string
      storeName: string
      storeId: string
      operationType?: OperationType
      sales: number
      lunchSales: number
      dinnerSales: number
      purchase: number
      laborCost: number
      otherExpenses: number
      count: number
      hasMonthlyExpense: boolean
      usedBaseline: boolean
      dailyPurchases: Set<string> // 日ごとの仕入れを追跡
    }>()

    filteredReports.forEach(report => {
      const date = new Date(report.date)
      let key: string
      let rawKey: string
      let displayPeriod: string

      switch (period) {
        case 'daily':
          // 日別の場合は営業時間帯を含めずにグループ化（同じ日付・店舗でまとめる）
          key = groupByStore ? `${report.date}-${report.storeId}` : `${report.date}`
          rawKey = report.date
          displayPeriod = formatDate(date)
          break
        case 'weekly':
          const weekStart = new Date(date)
          const dow = (date.getDay() + 6) % 7
          weekStart.setDate(date.getDate() - dow)
          key = groupByStore ? `${weekStart.toISOString().split('T')[0]}-${report.storeId}` : weekStart.toISOString().split('T')[0]
          rawKey = weekStart.toISOString().split('T')[0]
          displayPeriod = `${formatDate(weekStart)}週`
          break
        case 'monthly':
          key = groupByStore ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${report.storeId}` : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          rawKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          displayPeriod = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
          break
      }

      if (!groupedData.has(key)) {
        // 店舗名の決定ロジック:
        // 1. groupByStoreがtrueの場合: 各レポートの店舗名
        // 2. 全レポートが同じ店舗IDの場合: その店舗名
        // 3. それ以外: '全店舗合計'
        let displayStoreName: string
        if (groupByStore) {
          displayStoreName = report.storeName
        } else if (reports.length > 0 && reports.every(r => r.storeId === reports[0].storeId)) {
          displayStoreName = reports[0].storeName
        } else {
          displayStoreName = '全店舗合計'
        }

        groupedData.set(key, {
          period: displayPeriod,
          rawPeriodKey: rawKey,
          storeName: displayStoreName,
          storeId: report.storeId,
          operationType: undefined, // 日別でも営業時間帯は保存しない
          sales: 0,
          lunchSales: 0,
          dinnerSales: 0,
          purchase: 0,
          laborCost: 0,
          otherExpenses: 0,
          count: 0,
          hasMonthlyExpense: false,
          usedBaseline: false,
          dailyPurchases: new Set()
        })
      }

      const data = groupedData.get(key)!

      // 売上を集計
      data.sales += report.sales
      // 営業時間帯別の売上も記録
      if (report.operationType === 'lunch') {
        data.lunchSales += report.sales
      } else if (report.operationType === 'dinner') {
        data.dinnerSales += report.sales
      }

      // 日ごとの経費キーを記録（週次・月次で合算するため）
      const dailyKey = groupByStore ? `${report.date}-${report.storeId}` : report.date
      data.dailyPurchases.add(dailyKey)
      data.count += 1

      // 月次経費が存在する場合はフラグを立てる
      const yyyymm = report.date.slice(0, 7)
      const expenseKey = `${report.storeId}__${yyyymm}`
      const monthlyExpense = monthlyExpenseMapRef.current.get(expenseKey)
      if (monthlyExpense) {
        data.hasMonthlyExpense = true
      }
    })

    // 日ごとの経費を合算して最終的な金額を計算
    groupedData.forEach((data) => {
      data.purchase = Array.from(data.dailyPurchases).reduce((sum, dailyKey) => {
        return sum + (dailyPurchaseMap.get(dailyKey) || 0)
      }, 0)
      data.laborCost = Array.from(data.dailyPurchases).reduce((sum, dailyKey) => {
        return sum + (dailyLaborMap.get(dailyKey) || 0)
      }, 0)
      data.otherExpenses = Array.from(data.dailyPurchases).reduce((sum, dailyKey) => {
        return sum + (dailyOtherExpensesMap.get(dailyKey) || 0)
      }, 0)
    })

    // 経費を計算して適用（グループ化後に1回だけ）
    groupedData.forEach((data, key) => {
      const yyyymm = data.rawPeriodKey.slice(0, 7)
      const expenseKey = `${data.storeId}__${yyyymm}`
      const monthlyExpense = monthlyExpenseMapRef.current.get(expenseKey)
      const baseline = baselineMapRef.current.get(expenseKey)

      // 月次表示以外の場合、日割り経費を計算して上書き
      if (period !== 'monthly' && (monthlyExpense || baseline)) {
        const [year, month] = yyyymm.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()
        const openDays = baseline?.open_days || daysInMonth
        const perDay = (value: number) => Math.round(value / Math.max(openDays, 1))

        let dailyLaborCost = 0
        let dailyOtherExpenses = 0

        if (monthlyExpense) {
          // 月次経費入力がある場合
          dailyLaborCost = perDay((monthlyExpense.labor_cost_employee || 0) + (monthlyExpense.labor_cost_part_time || 0))
          dailyOtherExpenses = perDay(
            (monthlyExpense.utilities || 0) +
            (monthlyExpense.rent || 0) +
            (monthlyExpense.consumables || 0) +
            (monthlyExpense.promotion || 0) +
            (monthlyExpense.cleaning || 0) +
            (monthlyExpense.misc || 0) +
            (monthlyExpense.communication || 0) +
            (monthlyExpense.others || 0)
          )
        } else if (baseline) {
          // 参考経費がある場合
          dailyLaborCost = perDay((baseline.labor_cost_employee || 0) + (baseline.labor_cost_part_time || 0))
          dailyOtherExpenses = perDay(
            (baseline.utilities || 0) +
            (baseline.rent || 0) +
            (baseline.consumables || 0) +
            (baseline.promotion || 0) +
            (baseline.cleaning || 0) +
            (baseline.misc || 0) +
            (baseline.communication || 0) +
            (baseline.others || 0)
          )
        }

        // 日報データに経費がない場合のみ、計算した経費を使用
        if (data.laborCost === 0 && dailyLaborCost > 0) {
          data.laborCost = dailyLaborCost
        }
        if (data.otherExpenses === 0 && dailyOtherExpenses > 0) {
          data.otherExpenses = dailyOtherExpenses
        }
      }
    })

    // 月次表示の場合：月次経費入力データがある場合は、集計値を月次経費で上書き
    if (period === 'monthly') {
      groupedData.forEach((data, key) => {
        const expenseKey = `${data.storeId}__${data.rawPeriodKey}`
        const monthlyExpense = monthlyExpenseMapRef.current.get(expenseKey)
        const baseline = baselineMapRef.current.get(expenseKey)

        if (monthlyExpense) {
          // 月次経費入力データが存在する場合は、入力値をそのまま使用（優先度1）
          const monthlyLaborCost = (monthlyExpense.labor_cost_employee || 0) + (monthlyExpense.labor_cost_part_time || 0)
          const monthlyOtherExpenses =
            (monthlyExpense.utilities || 0) +
            (monthlyExpense.rent || 0) +
            (monthlyExpense.consumables || 0) +
            (monthlyExpense.promotion || 0) +
            (monthlyExpense.cleaning || 0) +
            (monthlyExpense.misc || 0) +
            (monthlyExpense.communication || 0) +
            (monthlyExpense.others || 0)

          console.log('✅ DataTable: 月次経費を直接適用（確定値）', {
            key: expenseKey,
            storeName: data.storeName,
            month: data.rawPeriodKey,
            beforeLaborCost: data.laborCost,
            afterLaborCost: monthlyLaborCost,
            beforeOtherExpenses: data.otherExpenses,
            afterOtherExpenses: monthlyOtherExpenses
          })

          // 月次経費で上書き
          data.laborCost = monthlyLaborCost
          data.otherExpenses = monthlyOtherExpenses
          data.hasMonthlyExpense = true
        } else if (data.laborCost === 0 && data.otherExpenses === 0 && baseline) {
          // 月次経費が未入力かつ日報にも経費が入力されていない場合、参考経費を使用（優先度3）
          const baselineLaborCost = (baseline.labor_cost_employee || 0) + (baseline.labor_cost_part_time || 0)
          const baselineOtherExpenses =
            (baseline.utilities || 0) +
            (baseline.rent || 0) +
            (baseline.consumables || 0) +
            (baseline.promotion || 0) +
            (baseline.cleaning || 0) +
            (baseline.misc || 0) +
            (baseline.communication || 0) +
            (baseline.others || 0)

          console.log('📋 DataTable: 参考経費を適用（暫定値）', {
            key: expenseKey,
            storeName: data.storeName,
            month: data.rawPeriodKey,
            baselineLaborCost,
            baselineOtherExpenses,
            baselineOpenDays: baseline.open_days
          })

          // 参考経費で上書き
          data.laborCost = baselineLaborCost
          data.otherExpenses = baselineOtherExpenses
          data.hasMonthlyExpense = false
          data.usedBaseline = true
        } else {
          // 月次経費が未入力だが日報に経費が入力されている場合、日次データの合算を使用（優先度2）
          console.log('📊 DataTable: 日次データの合算を使用（日報入力値）', {
            key: expenseKey,
            storeName: data.storeName,
            month: data.rawPeriodKey,
            dailyLaborCost: data.laborCost,
            dailyOtherExpenses: data.otherExpenses,
            dailyPurchase: data.purchase,
            daysCount: data.dailyPurchases.size,
            hasBaseline: !!baseline
          })
        }
      })
    }

    const result = Array.from(groupedData.values()).map(item => {
      const sales = Number(item.sales) || 0
      const purchase = Number(item.purchase) || 0
      const laborCost = Number(item.laborCost) || 0
      const otherExpenses = Number(item.otherExpenses) || 0
      const expenses = purchase + laborCost + otherExpenses
      const grossProfit = sales - purchase
      const operatingProfit = sales - expenses
      const profitMargin = sales > 0 ? (operatingProfit / sales) * 100 : 0

      const targetSales = dailyTargetsRef.current[item.rawPeriodKey]
      const achievementRate = targetSales ? (sales / targetSales) * 100 : undefined
      const isAchieved = targetSales ? sales >= targetSales : undefined

      // データソースを判定
      const isMonthlyExpenseConfirmed = item.hasMonthlyExpense || false
      let expenseDataSource: 'confirmed' | 'tentative' | 'estimated'
      if (isMonthlyExpenseConfirmed) {
        expenseDataSource = 'confirmed'
      } else if (laborCost > 0 || otherExpenses > 0) {
        expenseDataSource = 'tentative'
      } else {
        expenseDataSource = 'estimated'
      }

      return {
        period: item.period,
        rawPeriodKey: item.rawPeriodKey,
        storeName: item.storeName,
        storeId: item.storeId,
        sales,
        lunchSales: item.lunchSales > 0 ? item.lunchSales : undefined,
        dinnerSales: item.dinnerSales > 0 ? item.dinnerSales : undefined,
        purchase,
        laborCost,
        otherExpenses,
        expenses,
        grossProfit,
        operatingProfit,
        profitMargin,
        reportCount: item.count,
        targetSales,
        achievementRate,
        isAchieved,
        isMonthlyExpenseConfirmed,
        usedBaseline: item.usedBaseline,
        expenseDataSource
      }
    })

    console.log('🔍 processedData result:', {
      groupedDataSize: groupedData.size,
      resultCount: result.length,
      sampleResult: result[0]
    })

    return result
  }, [reports, period, groupByStore, baselineMapKeys, monthlyExpenseMapKeys, dailyTargetsKeys, selectedMonth])

  // ✅ columns をメモ化（再レンダを防ぐ）
  const columns = useMemo((): ColumnDef<ProcessedRow>[] => [
    {
      accessorKey: 'period',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            期間
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => (
        <div
          className={`font-medium ${
            onPeriodClick ? 'text-primary cursor-pointer hover:underline' : ''
          }`}
          onClick={() => {
            if (onPeriodClick) {
              onPeriodClick(row.original.rawPeriodKey)
            }
          }}
        >
          {row.getValue('period')}
        </div>
      )
    },
    {
      accessorKey: 'storeName',
      header: '店舗名',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('storeName')}
        </div>
      )
    },
    {
      accessorKey: 'sales',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            売上
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const sales = row.getValue('sales') as number
        const lunchSales = row.original.lunchSales
        const dinnerSales = row.original.dinnerSales

        // ランチとディナーの両方がある場合は分けて表示
        if (lunchSales !== undefined && dinnerSales !== undefined) {
          return (
            <div className="space-y-1">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">🌤️</span>
                  <span className="font-medium text-blue-600">{formatCurrency(lunchSales)}</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-sm mt-1">
                  <span className="text-xs text-muted-foreground">🌙</span>
                  <span className="font-medium text-blue-600">{formatCurrency(dinnerSales)}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground pt-1 border-t">
                合計: {formatCurrency(sales)}
              </div>
            </div>
          )
        }
        // ランチのみ
        else if (lunchSales !== undefined) {
          return (
            <div className="space-y-1">
              <div className="text-right font-medium text-blue-600">
                {formatCurrency(sales)}
              </div>
              <div className="text-xs text-right text-muted-foreground">
                🌤️ ランチのみ
              </div>
            </div>
          )
        }
        // ディナーのみ
        else if (dinnerSales !== undefined) {
          return (
            <div className="space-y-1">
              <div className="text-right font-medium text-blue-600">
                {formatCurrency(sales)}
              </div>
              <div className="text-xs text-right text-muted-foreground">
                🌙 ディナーのみ
              </div>
            </div>
          )
        }
        // 営業時間帯情報なし（週別・月別表示）
        else {
          return (
            <div className="text-right font-medium text-blue-600">
              {formatCurrency(sales)}
            </div>
          )
        }
      }
    },
    {
      accessorKey: 'purchase',
      header: '仕入',
      cell: ({ row }) => (
        <div className="text-right font-medium text-red-600">
          {formatCurrency(Number(row.getValue('purchase')) || 0)}
        </div>
      )
    },
    {
      accessorKey: 'laborCost',
      header: '人件費',
      cell: ({ row }) => {
        const dataSource = row.original.expenseDataSource
        const value = Number(row.getValue('laborCost')) || 0

        return (
          <div className="space-y-1">
            <div className="text-right font-medium text-orange-600">
              {formatCurrency(value)}
            </div>
            <div className="flex justify-end">
              {dataSource === 'confirmed' && (
                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  確定
                </Badge>
              )}
              {dataSource === 'tentative' && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  暫定
                </Badge>
              )}
              {dataSource === 'estimated' && (
                <Badge variant="outline" className="text-xs">
                  <Calculator className="h-3 w-3 mr-1" />
                  見積
                </Badge>
              )}
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'otherExpenses',
      header: 'その他経費',
      cell: ({ row }) => {
        const dataSource = row.original.expenseDataSource
        const value = Number(row.getValue('otherExpenses')) || 0

        return (
          <div className="space-y-1">
            <div className="text-right font-medium text-gray-600">
              {formatCurrency(value)}
            </div>
            <div className="flex justify-end">
              {dataSource === 'confirmed' && (
                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  確定
                </Badge>
              )}
              {dataSource === 'tentative' && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  <Clock className="h-3 w-3 mr-1" />
                  暫定
                </Badge>
              )}
              {dataSource === 'estimated' && (
                <Badge variant="outline" className="text-xs">
                  <Calculator className="h-3 w-3 mr-1" />
                  見積
                </Badge>
              )}
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'grossProfit',
      header: '粗利益',
      cell: ({ row }) => {
        const value = row.getValue('grossProfit') as number
        return (
          <div className={`text-right font-medium ${
            value >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(value)}
          </div>
        )
      }
    },
    {
      accessorKey: 'operatingProfit',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            営業利益
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = row.getValue('operatingProfit') as number
        return (
          <div className={`text-right font-medium ${
            value >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(value)}
          </div>
        )
      }
    },
    {
      accessorKey: 'profitMargin',
      header: '利益率',
      cell: ({ row }) => {
        const value = row.getValue('profitMargin') as number
        return (
          <div className="text-right">
            <Badge 
              variant={value >= 15 ? 'default' : value >= 10 ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {formatPercent(value)}
            </Badge>
          </div>
        )
      }
    },
    {
      accessorKey: 'reportCount',
      header: '報告数',
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {row.getValue('reportCount')}件
        </div>
      )
    },
    {
      id: 'actions',
      header: 'アクション',
      cell: ({ row }) => {
        const isMonthlyView = period === 'monthly'
        const dataSource = row.original.expenseDataSource
        const rawPeriodKey = row.original.rawPeriodKey
        const storeId = row.original.storeId

        if (!isMonthlyView || !storeId) return null

        const handleExpenseClick = () => {
          navigate(`/monthly-expense?store=${storeId}&month=${rawPeriodKey}`)
        }

        return (
          <div className="flex justify-center">
            {dataSource === 'confirmed' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpenseClick}
                className="text-xs h-7 px-2"
              >
                <Edit className="h-3 w-3 mr-1" />
                経費編集
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpenseClick}
                className="text-xs h-7 px-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                経費確定
              </Button>
            )}
          </div>
        )
      }
    }
  ], [onPeriodClick]) // ✅ onPeriodClick が変わったときのみ再生成

  const table = useReactTable({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
  })

  // Get available months from reports (including current month)
  const availableMonths = useMemo(() => {
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
  }, [reports])

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-semibold truncate">
              詳細データ
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex-shrink-0 text-xs sm:text-sm">
              <span className="hidden sm:inline">CSV</span>エクスポート
            </Button>
          </div>
          {showMonthSelector && onMonthChange && availableMonths.length > 0 && (
            <div className="flex items-center justify-between">
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={onMonthChange}
                availableMonths={availableMonths}
              />
              {selectedMonth && (
                <div className="text-sm text-muted-foreground">
                  {reports.filter(r => r.date.slice(0, 7) === selectedMonth).length}件のレポート
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
        <div className="rounded-md border mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="h-10 sm:h-12 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs sm:text-sm">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2 sm:p-4 align-middle text-xs sm:text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center">
                      データがありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} 件中{' '}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )} 件を表示
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">前へ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">次へ</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 一時的にReact.memoを無効化してデバッグ
export const DataTable = DataTableImpl
// export const DataTable = React.memo(DataTableImpl)