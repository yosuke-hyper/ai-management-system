import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrendingUp, Wallet, PiggyBank, Percent, FileText, CreditCard as Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { ExpensePie } from '@/components/charts/ExpensePie'
import { DataTable } from '@/components/data/DataTable'
import { KpiBullets } from '@/components/charts/KpiBullets'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { DailyTargetInput } from '@/components/Dashboard/DailyTargetInput'
import { useReports } from '@/hooks/useReports'
import { useKpis } from '@/hooks/useKpis'
import { useExpenseBaseline } from '@/hooks/useExpenseBaseline'
import { useTargets } from '@/hooks/useTargets'
import { useDailyTarget } from '@/hooks/useDailyTarget'
import { formatCurrency, formatPercent } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { deleteDailyReport, getDailyTargets } from '@/services/supabase'

export const DashboardDaily: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const storeId = sp.get('store') || 'all'
  const { user, canAccessStore } = useAuth()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reportListPage, setReportListPage] = useState(0)
  const reportsPerPage = 7

  // ✅ onPeriodClick をメモ化
  const handlePeriodClick = useCallback((date: string) => {
    setSelectedDate(date)
  }, [])

  // 日報削除処理
  const handleDelete = async (reportId: string, reportDate: string) => {
    if (!confirm(`${reportDate}の日報を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return
    }

    setDeleting(reportId)
    try {
      const { error } = await deleteDailyReport(reportId)
      if (error) {
        console.error('削除エラー:', error)
        alert('日報の削除に失敗しました')
      } else {
        console.log('✅ 日報を削除しました:', reportId)
        // データを再読み込み
        refetch()
      }
    } catch (e) {
      console.error('削除エラー:', e)
      alert('日報の削除に失敗しました')
    } finally {
      setDeleting(null)
    }
  }

  // 権限チェック
  useEffect(() => {
    if (!user) return

    // 全店舗表示はadminのみ許可
    if (storeId === 'all' && user.role !== 'admin') {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/daily?store=${accessibleStores[0]}`, { replace: true })
      }
      return
    }

    // 特定店舗選択時の権限チェック
    if (storeId !== 'all' && !canAccessStore(storeId)) {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/daily?store=${accessibleStores[0]}`, { replace: true })
      } else if (user.role !== 'admin') {
        navigate('/dashboard/daily', { replace: true })
      }
    }
  }, [storeId, user?.id, user?.role, canAccessStore, navigate])

  // Get today's data
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 今月のデータ（月初から今日まで）
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // フィルターオブジェクトをメモ化
  const todayFilters = useMemo(() => ({
    storeId,
    dateFrom: today,
    dateTo: today
  }), [storeId, today])

  const yesterdayFilters = useMemo(() => ({
    storeId,
    dateFrom: yesterday,
    dateTo: yesterday
  }), [storeId, yesterday])

  const weekFilters = useMemo(() => ({
    storeId,
    dateFrom: sevenDaysAgo,
    dateTo: today
  }), [storeId, sevenDaysAgo, today])

  const allReportsFilters = useMemo(() => ({
    storeId,
    dateFrom: thirtyDaysAgo,
    dateTo: today
  }), [storeId, thirtyDaysAgo, today])

  const { data: todayReports, isLoading, isError, error, refetch } = useReports(todayFilters)
  const { data: yesterdayReports } = useReports(yesterdayFilters)
  const { data: weekReports } = useReports(weekFilters)
  const { data: allReports } = useReports(allReportsFilters)

  // 過去30日間の日別目標を取得
  const [dailyTargets, setDailyTargets] = React.useState<Record<string, number>>({})

  // デバッグ: dailyTargetsの状態を監視
  React.useEffect(() => {
    console.log('📊 dailyTargets状態更新:', dailyTargets)
  }, [dailyTargets])

  React.useEffect(() => {
    const fetchDailyTargets = async () => {
      if (storeId === 'all') {
        console.log('🎯 日別目標取得スキップ: 全店舗表示')
        return
      }

      console.log('🎯 日別目標を取得中...', { storeId, dateFrom: thirtyDaysAgo, dateTo: today })
      const { data, error } = await getDailyTargets({
        storeId,
        dateFrom: thirtyDaysAgo,
        dateTo: today
      })

      console.log('🎯 日別目標取得結果:', { data, error })

      if (data && !error) {
        const targetsMap: Record<string, number> = {}
        data.forEach((target: any) => {
          targetsMap[target.date] = target.target_sales
        })
        console.log('🎯 日別目標マップ:', targetsMap)
        setDailyTargets(targetsMap)
      }
    }

    fetchDailyTargets()
  }, [storeId, thirtyDaysAgo, today])

  const { data: monthReports } = useReports({
    storeId,
    dateFrom: monthStart,
    dateTo: today
  })

  // 参考経費データを取得
  const { expenseBaseline } = useExpenseBaseline(storeId !== 'all' ? storeId : undefined, currentYYYYMM)

  // 目標データを取得
  const { getTargetForStore, getAllStoresTarget } = useTargets(storeId, currentYYYYMM)

  // 日別目標データを取得（本日のみ、選択日は対象外）
  const displayDate = selectedDate || today
  const { target: dailyTarget, saveTarget: saveDailyTarget, isLoading: dailyTargetLoading } = useDailyTarget(
    storeId !== 'all' ? storeId : null,
    displayDate
  )

  // 月の経過日数を計算（今日が何日目か）
  const daysIntoMonth = now.getDate()

  const todayKpis = useKpis(todayReports, yesterdayReports)
  const weekKpis = useKpis(weekReports)
  const monthKpis = useKpis(monthReports)

  // 店舗またはall店舗の目標を取得
  const currentTarget = useMemo(() => {
    if (storeId === 'all') {
      return getAllStoresTarget()
    } else {
      const target = getTargetForStore(storeId)
      return target ? {
        targetSales: target.targetSales,
        targetProfit: target.targetProfit,
        targetProfitMargin: target.targetProfitMargin,
        targetCostRate: target.targetCostRate,
        targetLaborRate: target.targetLaborRate
      } : null
    }
  }, [storeId, getTargetForStore, getAllStoresTarget])

  // 選択された日付のデータを取得
  const selectedDateReports = React.useMemo(() => {
    return selectedDate
      ? weekReports.filter(r => r.date === selectedDate)
      : todayReports
  }, [selectedDate, weekReports, todayReports])

  const selectedDateYesterday = React.useMemo(() => {
    return selectedDate
      ? new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : yesterday
  }, [selectedDate, yesterday])

  const selectedDateYesterdayReports = React.useMemo(() => {
    return weekReports.filter(r => r.date === selectedDateYesterday)
  }, [weekReports, selectedDateYesterday])

  // 選択された日付のKPIを常に計算（Hooksのルールに従う）
  const selectedDateKpis = useKpis(selectedDateReports, selectedDateYesterdayReports)

  // 表示用のKPIを選択日付または本日で切り替え
  const displayKpis = selectedDate ? selectedDateKpis : todayKpis

  // その他経費を計算（参考経費を使用）
  const otherExpenses = React.useMemo(() => {
    // 実際のその他経費を計算
    const actualOtherExpenses = selectedDateReports.reduce((sum, report) => {
      return sum + report.utilities + report.promotion + report.cleaning +
             report.misc + report.communication + report.others +
             (report.rent || 0) + (report.consumables || 0)
    }, 0)

    // 実際の経費がある場合はそれを使用、なければ参考経費を使用
    if (actualOtherExpenses > 0) {
      return actualOtherExpenses
    }

    // 参考経費から1日あたりの経費を計算
    if (expenseBaseline && expenseBaseline.sumOther > 0) {
      return expenseBaseline.sumOther
    }

    return 0
  }, [selectedDateReports, expenseBaseline])

  // 営業利益を計算（粗利益 - その他経費）
  const operatingProfit = React.useMemo(() => {
    return displayKpis.grossProfit - otherExpenses
  }, [displayKpis.grossProfit, otherExpenses])

  // 選択された日付の本日の経費を計算（仕入+その他経費）
  const selectedDateExpenses = React.useMemo(() => {
    return displayKpis.purchaseTotal + otherExpenses
  }, [displayKpis.purchaseTotal, otherExpenses])

  // 目標達成状況を計算（将来の機能拡張用に保持）
  const targetAchievement = React.useMemo((): {
    targetSales: number
    actualSales: number
    achievementRate: number
    isAchieved: boolean
    difference: number
  } | null => {
    if (!dailyTarget || dailyTarget.targetSales === 0) {
      return null
    }

    const actualSales = displayKpis.totalSales
    const targetSales = dailyTarget.targetSales
    const achievementRate = (actualSales / targetSales) * 100
    const isAchieved = actualSales >= targetSales
    const difference = actualSales - targetSales

    return {
      targetSales,
      actualSales,
      achievementRate,
      isAchieved,
      difference
    }
  }, [dailyTarget, displayKpis.totalSales])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError && error) {
    return (
      <ErrorState
        title="データの読み込みに失敗しました"
        message={error}
        onRetry={refetch}
      />
    )
  }

  if (weekReports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="データがありません"
        description="日次報告を作成すると、ここにダッシュボードが表示されます。"
        action={{
          label: "サンプルデータを生成",
          onClick: () => window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            日次ダッシュボード
            {storeId === 'all' ? (
              <Badge variant="default" className="ml-2 bg-blue-600">
                全店舗集計
              </Badge>
            ) : (
              user?.role !== 'admin' && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {user?.role === 'manager' ? '店長権限' : 'スタッフ権限'}
                </Badge>
              )
            )}
            {selectedDate && (
              <Badge variant="default" className="ml-2 bg-purple-600">
                {selectedDate} のデータ
              </Badge>
            )}
          </h1>
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(null)}
            >
              本日に戻る
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          分析期間: {new Date(displayDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-muted-foreground text-sm">
          {storeId === 'all'
            ? '全登録店舗の本日の業績と過去7日間のトレンド分析（合計値）'
            : '本日の業績と過去7日間のトレンド分析'
          }
          {storeId !== 'all' && user?.role !== 'admin' && (
            <span className="text-blue-600 ml-2">（担当店舗データ）</span>
          )}
        </p>
      </div>

      {/* 日別売上目標入力 */}
      {storeId !== 'all' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            {!selectedDate ? (
              <DailyTargetInput
                date={today}
                storeId={storeId}
                currentTarget={dailyTarget?.targetSales || null}
                onSave={saveDailyTarget}
                isLoading={dailyTargetLoading}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedDate}の売上目標
                  </span>
                </div>
                {dailyTargets[selectedDate] ? (
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(dailyTargets[selectedDate])}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    目標未設定
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label={selectedDate ? `${selectedDate}の売上` : "本日の売上"}
          value={formatCurrency(displayKpis.totalSales)}
          delta={displayKpis.salesGrowth !== undefined ? {
            value: displayKpis.salesGrowth,
            isPositive: displayKpis.salesGrowth >= 0,
            label: "前日比"
          } : undefined}
          icon={TrendingUp}
          tone="info"
          hint={`${displayKpis.reportCount}件の報告`}
          details={displayKpis.totalCustomers > 0 ? [
            { label: '平均客単価', value: formatCurrency(displayKpis.averageTicket) },
            { label: '客数', value: `${displayKpis.totalCustomers.toLocaleString()}人` }
          ] : [
            { label: '客数データ', value: '未入力' }
          ]}
        />

        <MetricCard
          label={selectedDate ? `${selectedDate}の経費` : "本日の経費"}
          value={formatCurrency(selectedDateExpenses)}
          icon={Wallet}
          tone="danger"
          hint="仕入+その他経費"
          details={[
            { label: '仕入', value: `${formatCurrency(displayKpis.purchaseTotal)} (${formatPercent(displayKpis.purchaseRate)})` },
            { label: 'その他経費', value: formatCurrency(otherExpenses) }
          ]}
        />

        <MetricCard
          label={selectedDate ? `${selectedDate}の粗利益` : "本日の粗利益"}
          value={formatCurrency(displayKpis.grossProfit)}
          icon={PiggyBank}
          tone={displayKpis.grossProfit >= 0 ? "success" : "danger"}
          hint="売上 - 仕入"
          details={[
            { label: '原価率', value: formatPercent(displayKpis.purchaseRate) },
            { label: '粗利率', value: formatPercent(100 - displayKpis.purchaseRate) }
          ]}
        />

        <MetricCard
          label={selectedDate ? `${selectedDate}の営業利益` : "本日の営業利益"}
          value={formatCurrency(operatingProfit)}
          delta={displayKpis.profitGrowth !== undefined ? {
            value: displayKpis.profitGrowth,
            isPositive: displayKpis.profitGrowth >= 0,
            label: "前日比"
          } : undefined}
          icon={Percent}
          tone={operatingProfit >= 0 ? "success" : "danger"}
          hint={`利益率 ${formatPercent(displayKpis.totalSales > 0 ? (operatingProfit / displayKpis.totalSales) * 100 : 0)}`}
          details={[
            { label: '粗利益', value: formatCurrency(displayKpis.grossProfit) },
            { label: 'その他経費', value: formatCurrency(otherExpenses) }
          ]}
        />
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart
          reports={weekReports}
          period="daily"
          targetSales={todayKpis.averageDailySales * 1.2} // 20% above average as target
          expenseBaseline={expenseBaseline}
        />
        <ExpensePie
          reports={monthReports}
          period="monthly"
          title="今月の経費内訳"
          expenseBaseline={expenseBaseline}
          daysCount={daysIntoMonth}
        />
      </div>

      {/* Data Table */}
      <DataTable
        reports={allReports}
        period="daily"
        groupByStore={false}
        onPeriodClick={handlePeriodClick}
        dailyTargets={dailyTargets}
        baselineMap={new Map()}
      />

      {/* 日報リスト（編集可能） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            日報一覧
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {allReports.length}件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">日報データがありません</p>
          ) : (
            <>
              <div className="space-y-3">
                {allReports.slice(reportListPage * reportsPerPage, (reportListPage + 1) * reportsPerPage).map((report) => {
                const grossProfit = report.sales - report.purchase
                const grossProfitMargin = report.sales > 0 ? (grossProfit / report.sales) * 100 : 0

                return (
                  <div key={report.id} className="flex flex-col p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedDate(report.date)}
                          className={`font-medium text-sm sm:text-base hover:text-blue-600 transition-colors ${selectedDate === report.date ? 'text-purple-600 underline' : ''}`}
                        >
                          {report.date}
                        </button>
                        <Badge variant="outline" className="text-xs">{report.storeName}</Badge>
                        {report.staffName && <span className="text-xs sm:text-sm text-muted-foreground">by {report.staffName}</span>}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">売上: {formatCurrency(report.sales)}</span>
                          {dailyTargets[report.date] && (
                            <Badge
                              variant={report.sales >= dailyTargets[report.date] ? "default" : "destructive"}
                              className={report.sales >= dailyTargets[report.date] ? "bg-green-600" : ""}
                            >
                              {report.sales >= dailyTargets[report.date] ? "達成" : "未達成"}
                            </Badge>
                          )}
                        </div>
                        <span className="text-red-600">仕入: {formatCurrency(report.purchase)}</span>
                        <span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          粗利益: {formatCurrency(grossProfit)} ({formatPercent(grossProfitMargin)})
                        </span>
                      </div>
                      {report.reportText && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{report.reportText}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/report?id=${report.id}`)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(report.id, report.date)}
                        disabled={deleting === report.id}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {deleting === report.id ? '削除中...' : '削除'}
                      </Button>
                    </div>
                  </div>
                )
              })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {allReports.length} 件中{' '}
                  {reportListPage * reportsPerPage + 1}-
                  {Math.min((reportListPage + 1) * reportsPerPage, allReports.length)} 件を表示
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportListPage(prev => Math.max(0, prev - 1))}
                    disabled={reportListPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    前へ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportListPage(prev => prev + 1)}
                    disabled={(reportListPage + 1) * reportsPerPage >= allReports.length}
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}