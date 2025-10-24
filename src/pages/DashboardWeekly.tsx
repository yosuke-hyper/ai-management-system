import React, { useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrendingUp, Wallet, PiggyBank, Percent, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { ExpensePie } from '@/components/charts/ExpensePie'
import { DataTable } from '@/components/data/DataTable'
import { KpiBullets } from '@/components/charts/KpiBullets'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { useReports } from '@/hooks/useReports'
import { useKpis } from '@/hooks/useKpis'
import { useExpenseBaseline } from '@/hooks/useExpenseBaseline'
import { useTargets } from '@/hooks/useTargets'
import { formatCurrency, formatPercent } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'

export const DashboardWeekly: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const storeId = sp.get('store') || 'all'
  const { user, canAccessStore } = useAuth()
  const currentPeriod = new Date().toISOString().substring(0, 7)
  const { expenseBaseline } = useExpenseBaseline(storeId, currentPeriod)
  const { getTargetForStore, getAllStoresTarget } = useTargets(storeId, currentPeriod)

  // 権限チェック
  useEffect(() => {
    if (!user) return

    // 全店舗表示はadminのみ許可
    if (storeId === 'all' && user.role !== 'admin') {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/weekly?store=${accessibleStores[0]}`, { replace: true })
      }
      return
    }

    // 特定店舗選択時の権限チェック
    if (storeId !== 'all' && !canAccessStore(storeId)) {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/weekly?store=${accessibleStores[0]}`, { replace: true })
      } else if (user.role !== 'admin') {
        navigate('/dashboard/weekly', { replace: true })
      }
    }
  }, [storeId, user?.id, user?.role, canAccessStore, navigate])

  // Get this week's data - 日付計算は一度だけ実行
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd, twoWeeksStart, now } = useMemo(() => {
    const currentDate = new Date()
    const weekStart = new Date(currentDate)
    weekStart.setDate(currentDate.getDate() - currentDate.getDay())

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(weekStart.getDate() - 7)

    const prevWeekEnd = new Date(weekStart)
    prevWeekEnd.setDate(weekStart.getDate() - 1)

    const twoWeeksAgo = new Date(currentDate)
    twoWeeksAgo.setDate(currentDate.getDate() - 13)

    return {
      thisWeekStart: weekStart,
      thisWeekEnd: weekEnd,
      lastWeekStart: prevWeekStart,
      lastWeekEnd: prevWeekEnd,
      twoWeeksStart: twoWeeksAgo,
      now: currentDate
    }
  }, [])

  // フィルターオブジェクトをメモ化
  const thisWeekFilters = useMemo(() => ({
    storeId,
    dateFrom: thisWeekStart.toISOString().split('T')[0],
    dateTo: thisWeekEnd.toISOString().split('T')[0]
  }), [storeId, thisWeekStart, thisWeekEnd])

  const lastWeekFilters = useMemo(() => ({
    storeId,
    dateFrom: lastWeekStart.toISOString().split('T')[0],
    dateTo: lastWeekEnd.toISOString().split('T')[0]
  }), [storeId, lastWeekStart, lastWeekEnd])

  const twoWeeksFilters = useMemo(() => ({
    storeId,
    dateFrom: twoWeeksStart.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0]
  }), [storeId, twoWeeksStart, now])

  const monthFilters = useMemo(() => ({
    storeId,
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0]
  }), [storeId])

  const { data: thisWeekReports, isLoading, isError, error, refetch } = useReports(thisWeekFilters)
  const { data: lastWeekReports } = useReports(lastWeekFilters)
  const { data: twoWeeksReports } = useReports(twoWeeksFilters)
  const { data: monthReports } = useReports(monthFilters)

  const thisWeekKpis = useKpis(thisWeekReports, lastWeekReports)
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

  // その他経費を計算（人件費を除く）
  const otherExpenses = useMemo(() => {
    return thisWeekReports.reduce((sum, report) => {
      return sum + report.utilities + report.promotion + report.cleaning +
             report.misc + report.communication + report.others +
             (report.rent || 0) + (report.consumables || 0)
    }, 0)
  }, [thisWeekReports])

  // 今週の経費を計算（仕入+その他経費）
  const weekExpenses = useMemo(() => {
    return thisWeekKpis.purchaseTotal + otherExpenses
  }, [thisWeekKpis.purchaseTotal, otherExpenses])

  // 営業利益を計算（粗利益 - その他経費）
  const operatingProfit = useMemo(() => {
    return thisWeekKpis.grossProfit - otherExpenses
  }, [thisWeekKpis.grossProfit, otherExpenses])

  // FLコスト（仕入+人件費）を計算
  const flCost = useMemo(() => {
    return thisWeekKpis.purchaseTotal + thisWeekKpis.laborTotal
  }, [thisWeekKpis.purchaseTotal, thisWeekKpis.laborTotal])

  // 週次目標を計算（月次目標を週換算）
  const weeklyTargets = useMemo(() => {
    if (!currentTarget) return null
    const weeksInMonth = 4.33
    return {
      targetSales: currentTarget.targetSales / weeksInMonth,
      targetFLCost: (currentTarget.targetSales / weeksInMonth) * ((currentTarget.targetCostRate + currentTarget.targetLaborRate) / 100),
      targetOperatingProfit: (currentTarget.targetSales / weeksInMonth) * (currentTarget.targetProfitMargin / 100)
    }
  }, [currentTarget])

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

  if (monthReports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="データがありません"
        description="日次報告を作成すると、ここに週次ダッシュボードが表示されます。"
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
        <h1 className="text-2xl font-bold text-foreground mb-2">
          週次ダッシュボード
          {storeId === 'all' && (
            <Badge variant="default" className="ml-2 bg-blue-600">
              全店舗集計
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          分析期間: {thisWeekStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} 〜 {thisWeekEnd.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-muted-foreground text-sm">
          {storeId === 'all'
            ? '全登録店舗の今週の業績と過去30日間のトレンド分析（合計値）'
            : '今週の業績と過去30日間のトレンド分析'
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="今週の売上"
          value={formatCurrency(thisWeekKpis.totalSales)}
          delta={thisWeekKpis.salesGrowth !== undefined ? {
            value: thisWeekKpis.salesGrowth,
            isPositive: thisWeekKpis.salesGrowth >= 0,
            label: "先週比"
          } : undefined}
          icon={TrendingUp}
          tone="info"
          hint={`${thisWeekKpis.reportCount}件の報告`}
          details={thisWeekKpis.totalCustomers > 0 ? [
            { label: '平均客単価', value: formatCurrency(thisWeekKpis.averageTicket) },
            { label: '客数', value: `${thisWeekKpis.totalCustomers.toLocaleString()}人` }
          ] : [
            { label: '客数データ', value: '未入力' }
          ]}
        />

        <MetricCard
          label="今週の経費"
          value={formatCurrency(weekExpenses)}
          icon={Wallet}
          tone="danger"
          hint="仕入+その他経費"
          details={[
            { label: '仕入', value: `${formatCurrency(thisWeekKpis.purchaseTotal)} (${formatPercent(thisWeekKpis.purchaseRate)})` },
            { label: 'その他経費', value: formatCurrency(otherExpenses) }
          ]}
        />

        <MetricCard
          label="今週の粗利益"
          value={formatCurrency(thisWeekKpis.grossProfit)}
          icon={PiggyBank}
          tone={thisWeekKpis.grossProfit >= 0 ? "success" : "danger"}
          hint="売上 - 仕入"
          details={[
            { label: '原価率', value: formatPercent(thisWeekKpis.purchaseRate) },
            { label: '粗利率', value: formatPercent(100 - thisWeekKpis.purchaseRate) }
          ]}
        />

        <MetricCard
          label="今週の営業利益"
          value={formatCurrency(operatingProfit)}
          delta={thisWeekKpis.profitGrowth !== undefined ? {
            value: thisWeekKpis.profitGrowth,
            isPositive: thisWeekKpis.profitGrowth >= 0,
            label: "先週比"
          } : undefined}
          icon={Percent}
          tone={operatingProfit >= 0 ? "success" : "danger"}
          hint={`利益率 ${formatPercent(thisWeekKpis.totalSales > 0 ? (operatingProfit / thisWeekKpis.totalSales) * 100 : 0)}`}
          details={[
            { label: '粗利益', value: formatCurrency(thisWeekKpis.grossProfit) },
            { label: 'その他経費', value: formatCurrency(otherExpenses) }
          ]}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart
          reports={monthReports}
          period="weekly"
          targetSales={thisWeekKpis.averageDailySales * 7 * 1.15} // 15% above weekly average
          expenseBaseline={expenseBaseline}
        />
        <ExpensePie
          reports={twoWeeksReports}
          period="weekly"
          title="過去2週間の経費内訳"
          expenseBaseline={expenseBaseline}
          daysCount={14}
        />
      </div>

      {/* Data Table */}
      <DataTable reports={monthReports} period="weekly" groupByStore={false} baselineMap={new Map()} />
    </div>
  )
}