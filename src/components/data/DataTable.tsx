import React, { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Trophy, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, formatDate } from '@/lib/format'
import { DailyReportData } from '@/types'
import { ExpenseBaselineDb } from '@/services/supabase'

interface DataTableProps {
  reports: DailyReportData[]
  period: 'daily' | 'weekly' | 'monthly'
  groupByStore?: boolean
  className?: string
  onPeriodClick?: (period: string) => void
  dailyTargets?: Record<string, number>
  baselineMap?: Map<string, ExpenseBaselineDb>
}

interface ProcessedRow {
  period: string
  rawPeriodKey: string
  storeName: string
  sales: number
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
}

// ✅ React.memo でラップして不要な再レンダを防ぐ
const DataTableImpl: React.FC<DataTableProps> = ({
  reports,
  period,
  groupByStore = true,
  className,
  onPeriodClick,
  dailyTargets = {},
  baselineMap = new Map()
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const handleExportCsv = () => {
    const headers = ['期間','店舗名','売上','目標達成','達成率','差額','仕入','人件費','その他経費','粗利益','営業利益','利益率','報告数']
    const rows = processedData.map(r => [
      r.period,
      r.storeName,
      r.sales,
      r.isAchieved !== undefined ? (r.isAchieved ? '達成' : '未達成') : '目標未設定',
      r.achievementRate !== undefined ? r.achievementRate.toFixed(1) + '%' : '-',
      r.targetSales !== undefined ? (r.sales - r.targetSales) : '-',
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
    const groupedData = new Map<string, {
      period: string
      storeName: string
      sales: number
      purchase: number
      laborCost: number
      otherExpenses: number
      count: number
    }>()

    // ✅ ログを最小限に
    // console.log('📊 DataTable: Processing data', {
    //   totalReports: reports.length,
    //   period,
    //   groupByStore
    // })

    reports.forEach(report => {
      const date = new Date(report.date)
      let key: string
      let rawKey: string
      let displayPeriod: string

      switch (period) {
        case 'daily':
          key = groupByStore ? `${report.date}-${report.storeId}` : report.date
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
        groupedData.set(key, {
          period: displayPeriod,
          rawPeriodKey: rawKey,
          storeName: reports.length > 0 && reports.every(r => r.storeId === reports[0].storeId)
            ? reports[0].storeName
            : (groupByStore ? report.storeName : '全店舗合計'),
          sales: 0,
          purchase: 0,
          laborCost: 0,
          otherExpenses: 0,
          count: 0
        })
      }

      const data = groupedData.get(key)!

      // 人件費とその他経費を個別に集計
      let laborCost = report.laborCost || 0
      let otherExpenses = (report.utilities || 0) + (report.rent || 0) + (report.consumables || 0) +
                           (report.promotion || 0) + (report.cleaning || 0) + (report.misc || 0) +
                           (report.communication || 0) + (report.others || 0)

      // その他経費が0の場合は参考経費を使用（月次管理モード対応）
      if (laborCost === 0 && otherExpenses === 0) {
        const yyyymm = report.date.slice(0, 7)
        const baselineKey = `${report.storeId}-${yyyymm}`
        const baseline = baselineMap.get(baselineKey)

        if (baseline) {
          const [year, month] = yyyymm.split('-').map(Number)
          const daysInMonth = new Date(year, month, 0).getDate()
          const openDays = baseline.open_days || daysInMonth
          const perDay = (value: number) => Math.round(value / Math.max(openDays, 1))

          laborCost = perDay((baseline.labor_cost_employee || 0) + (baseline.labor_cost_part_time || 0))
          otherExpenses = perDay((baseline.utilities || 0) + (baseline.rent || 0) +
            (baseline.consumables || 0) + (baseline.promotion || 0) + (baseline.cleaning || 0) +
            (baseline.misc || 0) + (baseline.communication || 0) + (baseline.others || 0))
        }
      }

      data.sales += report.sales
      data.purchase += Number(report.purchase) || 0
      data.laborCost += Number(laborCost) || 0
      data.otherExpenses += Number(otherExpenses) || 0
      data.count += 1
    })

    return Array.from(groupedData.values()).map(item => {
      const sales = Number(item.sales) || 0
      const purchase = Number(item.purchase) || 0
      const laborCost = Number(item.laborCost) || 0
      const otherExpenses = Number(item.otherExpenses) || 0
      const expenses = purchase + laborCost + otherExpenses
      const grossProfit = sales - purchase
      const operatingProfit = sales - expenses
      const profitMargin = sales > 0 ? (operatingProfit / sales) * 100 : 0

      const targetSales = dailyTargets[item.rawPeriodKey]
      const achievementRate = targetSales ? (sales / targetSales) * 100 : undefined
      const isAchieved = targetSales ? sales >= targetSales : undefined

      return {
        period: item.period,
        rawPeriodKey: item.rawPeriodKey,
        storeName: item.storeName,
        sales,
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
        isAchieved
      }
    })
  }, [reports, period, groupByStore, baselineMap, dailyTargets])

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
      cell: ({ row }) => (
        <div className="text-right font-medium text-blue-600">
          {formatCurrency(row.getValue('sales'))}
        </div>
      )
    },
    {
      accessorKey: 'isAchieved',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            目標達成
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
        const isAchieved = row.original.isAchieved
        const achievementRate = row.original.achievementRate
        const targetSales = row.original.targetSales
        const sales = row.original.sales

        if (targetSales === undefined) {
          return (
            <div className="text-center text-xs text-muted-foreground">
              目標未設定
            </div>
          )
        }

        const difference = sales - targetSales

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant={isAchieved ? "default" : "destructive"}
                className={`text-xs font-bold ${isAchieved ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {isAchieved ? (
                  <>
                    <Trophy className="h-3 w-3 mr-1" />
                    達成
                  </>
                ) : (
                  <>
                    <Target className="h-3 w-3 mr-1" />
                    未達成
                  </>
                )}
              </Badge>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {formatPercent(achievementRate || 0)}
            </div>
            <div className={`text-xs text-center font-medium ${
              isAchieved ? 'text-green-600' : 'text-red-600'
            }`}>
              {isAchieved ? '+' : ''}{formatCurrency(difference)}
            </div>
          </div>
        )
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
      cell: ({ row }) => (
        <div className="text-right font-medium text-orange-600">
          {formatCurrency(Number(row.getValue('laborCost')) || 0)}
        </div>
      )
    },
    {
      accessorKey: 'otherExpenses',
      header: 'その他経費',
      cell: ({ row }) => (
        <div className="text-right font-medium text-gray-600">
          {formatCurrency(Number(row.getValue('otherExpenses')) || 0)}
        </div>
      )
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
        pageSize: 7,
      },
    },
  })

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">
            詳細データ
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex-shrink-0 text-xs sm:text-sm">
            <span className="hidden sm:inline">CSV</span>エクスポート
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
        <div className="rounded-md border">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[800px]">
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

// ✅ React.memo でラップして props が安定している限り再レンダを防ぐ
export const DataTable = React.memo(DataTableImpl)