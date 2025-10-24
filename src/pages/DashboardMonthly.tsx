import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrendingUp, Wallet, PiggyBank, Percent, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { ExpensePie } from '@/components/charts/ExpensePie'
import { DataTable } from '@/components/data/DataTable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiBullets } from '@/components/charts/KpiBullets'
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap'
import { ProfitWaterfall } from '@/components/charts/ProfitWaterfall'
import { AlertsPanel } from '@/components/alerts/AlertsPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { useReports } from '@/hooks/useReports'
import { useKpis } from '@/hooks/useKpis'
import { useExpenseBaseline } from '@/hooks/useExpenseBaseline'
import { useTargets } from '@/hooks/useTargets'
import { formatCurrency, formatPercent } from '@/lib/format'
import { ProfitLossModal } from '@/components/analysis/ProfitLossModal'
import { useAuth } from '@/contexts/AuthContext'

export const DashboardMonthly: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const storeId = sp.get('store') || 'all'
  const { user, canAccessStore } = useAuth()

  // 今月のデータ（KPI用）- 日付計算は一度だけ実行
  const { now, thisMonthStart, today, currentYYYYMM, lastMonthStart, lastMonthEnd, currentYear, currentMonth } = useMemo(() => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthStart = new Date(year, month, 1)
    const todayStr = currentDate.toISOString().split('T')[0]
    const yyyymm = `${year}-${String(month + 1).padStart(2, '0')}`
    const prevMonthStart = new Date(year, month - 1, 1)
    const prevMonthEnd = new Date(year, month, 0)

    return {
      now: currentDate,
      thisMonthStart: monthStart,
      today: todayStr,
      currentYYYYMM: yyyymm,
      lastMonthStart: prevMonthStart,
      lastMonthEnd: prevMonthEnd,
      currentYear: year,
      currentMonth: month
    }
  }, [])

  console.log('🗓️ DashboardMonthly: Date range', {
    now: now.toISOString(),
    thisMonthStart: thisMonthStart.toISOString().split('T')[0],
    today,
    month: now.getMonth() + 1,
    year: now.getFullYear()
  })
  const { getTargetForStore, getAllStoresTarget } = useTargets(storeId, currentYYYYMM)
  const { expenseBaseline, monthlyExpenseBaseline } = useExpenseBaseline(storeId, currentYYYYMM)

  // 権限チェック
  useEffect(() => {
    if (!user) return

    // 全店舗表示はadminのみ許可
    if (storeId === 'all' && user.role !== 'admin') {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/monthly?store=${accessibleStores[0]}`, { replace: true })
      }
      return
    }

    // 特定店舗選択時の権限チェック
    if (storeId !== 'all' && !canAccessStore(storeId)) {
      const accessibleStores = user.storeIds || []
      if (accessibleStores.length > 0) {
        navigate(`/dashboard/monthly?store=${accessibleStores[0]}`, { replace: true })
      } else if (user.role !== 'admin') {
        navigate('/dashboard/monthly', { replace: true })
      }
    }
  }, [storeId, user?.id, user?.role, canAccessStore, navigate])

  // 表示範囲：3/6/12ヶ月（デフォルト3ヶ月）
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(3)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // ✅ onPeriodClick をメモ化（DataTable の columns 再生成を防ぐ）
  const handlePeriodClick = useCallback((period: string) => {
    setSelectedMonth(period)
  }, [])

  // フィルターオブジェクトをメモ化して無限ループを防ぐ
  const thisMonthFilters = useMemo(() => ({
    storeId,
    dateFrom: thisMonthStart.toISOString().split('T')[0],
    dateTo: today
  }), [storeId, thisMonthStart, today])

  const lastMonthFilters = useMemo(() => ({
    storeId,
    dateFrom: lastMonthStart.toISOString().split('T')[0],
    dateTo: lastMonthEnd.toISOString().split('T')[0]
  }), [storeId, lastMonthStart, lastMonthEnd])

  const { data: thisMonthReports, isLoading, isError, error, refetch } = useReports(thisMonthFilters)
  const { data: lastMonthReports } = useReports(lastMonthFilters)

  // 表示範囲分のデータ（グラフ/テーブル/円グラフ用）
  const rangeStartDate = useMemo(() => {
    // ✅ 日付文字列として計算（Dateオブジェクトを依存配列に入れない）
    const year = currentYear
    const month = currentMonth - (rangeMonths - 1)
    return new Date(year, month, 1).toISOString().split('T')[0]
  }, [currentYear, currentMonth, rangeMonths])

  const rangeFilters = useMemo(() => ({
    storeId,
    dateFrom: rangeStartDate,
    dateTo: today
  }), [storeId, rangeStartDate, today])

  const { data: rangeReports } = useReports(rangeFilters)

  const thisMonthKpis = useKpis(thisMonthReports, lastMonthReports)
  const yearKpis = useKpis(rangeReports)

  // ✅ DataTable用: rangeReports全体のbaselineMapを作成
  const baselineMap = useMemo(() => {
    const map = new Map<string, import('@/services/supabase').ExpenseBaselineDb>()
    // 必要な月×店舗の組み合わせを収集
    const keysNeeded = new Set<string>()
    rangeReports.forEach(r => {
      const yyyymm = r.date.slice(0, 7)
      keysNeeded.add(`${r.storeId}-${yyyymm}`)
    })
    // ※ 今は空のMapを返す（次のステップで実装）
    return map
  }, [rangeReports])

  // 月次のその他経費を計算（参考経費を使用、人件費を除外）
  const thisMonthOtherExpenses = useMemo(() => {
    // 実際のその他経費を計算（人件費は含まない）
    const actualOtherExpenses = thisMonthReports.reduce((sum, report) => {
      return sum + report.utilities + report.promotion + report.cleaning +
             report.misc + report.communication + report.others +
             (report.rent || 0) + (report.consumables || 0)
    }, 0)

    // 実際の経費がある場合はそれを使用、なければ参考経費を使用
    if (actualOtherExpenses > 0) {
      return actualOtherExpenses
    }

    // 参考経費から日数分の経費を計算（人件費を除外）
    if (expenseBaseline && expenseBaseline.sumOther > 0) {
      // sumOtherには人件費が含まれていないことを確認
      return expenseBaseline.sumOther * thisMonthReports.length
    }

    return 0
  }, [thisMonthReports, expenseBaseline])

  // 月次の人件費と営業利益を再計算
  const adjustedThisMonthKpis = useMemo(() => {
    // 参考経費から日数に応じた月の想定人件費を計算
    const daysInMonth = thisMonthReports.length
    const monthlyLaborCostFromBaseline = monthlyExpenseBaseline.laborCost > 0
      ? (monthlyExpenseBaseline.laborCost / 30) * daysInMonth
      : 0

    // 実際の人件費（日報入力値）
    const actualLaborCost = thisMonthKpis.laborTotal

    // どちらか大きい方を使用（または参考経費がない場合は実際の値）
    const adjustedLaborCost = monthlyLaborCostFromBaseline > 0
      ? monthlyLaborCostFromBaseline
      : actualLaborCost

    // FLコストと率を再計算
    const adjustedPrimeCost = thisMonthKpis.purchaseTotal + adjustedLaborCost
    const adjustedLaborRate = thisMonthKpis.totalSales > 0 ? (adjustedLaborCost / thisMonthKpis.totalSales) * 100 : 0
    const adjustedPrimeCostRate = thisMonthKpis.totalSales > 0 ? (adjustedPrimeCost / thisMonthKpis.totalSales) * 100 : 0

    // 営業利益を再計算（粗利益 - 人件費 - その他経費）
    const operatingProfit = thisMonthKpis.grossProfit - adjustedLaborCost - thisMonthOtherExpenses
    const profitMargin = thisMonthKpis.totalSales > 0 ? (operatingProfit / thisMonthKpis.totalSales) * 100 : 0

    return {
      ...thisMonthKpis,
      laborTotal: adjustedLaborCost,
      laborRate: adjustedLaborRate,
      primeCost: adjustedPrimeCost,
      primeCostRate: adjustedPrimeCostRate,
      operatingProfit,
      profitMargin
    }
  }, [thisMonthKpis, thisMonthOtherExpenses, monthlyExpenseBaseline, thisMonthReports])

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
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

  if (rangeReports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="データがありません"
        description="日次報告を作成すると、ここに月次ダッシュボードが表示されます。"
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
          月次ダッシュボード
          {storeId === 'all' && (
            <Badge variant="default" className="ml-2 bg-blue-600">
              全店舗集計
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">
          分析期間: {thisMonthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} 〜 {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-muted-foreground text-sm">
          {storeId === 'all'
            ? `全登録店舗の今月の業績と過去${rangeMonths}ヶ月のトレンド分析（合計値）`
            : `今月の業績と過去${rangeMonths}ヶ月のトレンド分析`
          }
        </p>
        {/* 表示範囲切替 */}
        <div className="flex justify-end">
          <Tabs value={String(rangeMonths)} onValueChange={(v)=>setRangeMonths(Number(v) as 3|6|12)}>
            <TabsList>
              <TabsTrigger value="3">直近3ヶ月</TabsTrigger>
              <TabsTrigger value="6">直近6ヶ月</TabsTrigger>
              <TabsTrigger value="12">直近12ヶ月</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
        <MetricCard
          label="今月の売上"
          value={formatCurrency(adjustedThisMonthKpis.totalSales)}
          delta={adjustedThisMonthKpis.salesGrowth !== undefined ? {
            value: adjustedThisMonthKpis.salesGrowth,
            isPositive: adjustedThisMonthKpis.salesGrowth >= 0,
            label: "前月比"
          } : undefined}
          icon={TrendingUp}
          tone="info"
          hint={`${adjustedThisMonthKpis.reportCount}件の報告`}
          details={adjustedThisMonthKpis.totalCustomers > 0 ? [
            { label: '平均客単価', value: formatCurrency(adjustedThisMonthKpis.averageTicket) },
            { label: '客数', value: `${adjustedThisMonthKpis.totalCustomers.toLocaleString()}人` }
          ] : [
            { label: '客数データ', value: '未入力' }
          ]}
        />

        <MetricCard
          label="FLコスト率"
          value={formatPercent(adjustedThisMonthKpis.primeCostRate)}
          icon={Percent}
          tone={adjustedThisMonthKpis.primeCostRate <= 58 ? 'success' : adjustedThisMonthKpis.primeCostRate <= 62 ? 'warning' : 'danger'}
          hint={`原価率${formatPercent(adjustedThisMonthKpis.purchaseRate)}${currentTarget?.targetCostRate ? ` (目標${formatPercent(currentTarget.targetCostRate)})` : ''} / 人件費率${formatPercent(adjustedThisMonthKpis.laborRate)}${currentTarget?.targetLaborRate ? ` (目標${formatPercent(currentTarget.targetLaborRate)})` : ''}`}
          details={[
            { label: '仕入', value: formatCurrency(adjustedThisMonthKpis.purchaseTotal) },
            { label: '人件費', value: formatCurrency(adjustedThisMonthKpis.laborTotal) },
            { label: 'FLコスト', value: formatCurrency(adjustedThisMonthKpis.primeCost) }
          ]}
        />

        <MetricCard
          label="FL以外の経費"
          value={formatCurrency(thisMonthOtherExpenses)}
          icon={Wallet}
          tone="danger"
          hint="FL以外の経費（参考経費から算出）"
          details={expenseBaseline ? [
            { label: '水道光熱費', value: formatCurrency(expenseBaseline.utilities * thisMonthReports.length) },
            { label: '家賃', value: formatCurrency(expenseBaseline.rent * thisMonthReports.length) },
            { label: '消耗品費', value: formatCurrency(expenseBaseline.consumables * thisMonthReports.length) },
            { label: '販促費', value: formatCurrency(expenseBaseline.promotion * thisMonthReports.length) },
            { label: '清掃費', value: formatCurrency(expenseBaseline.cleaning * thisMonthReports.length) },
            { label: '通信費', value: formatCurrency(expenseBaseline.communication * thisMonthReports.length) },
            { label: 'その他', value: formatCurrency((expenseBaseline.misc + expenseBaseline.others) * thisMonthReports.length) }
          ] : []}
        />

        <MetricCard
          label="今月の粗利益"
          value={formatCurrency(adjustedThisMonthKpis.grossProfit)}
          icon={PiggyBank}
          tone={adjustedThisMonthKpis.grossProfit >= 0 ? "success" : "danger"}
          hint="売上 - 仕入"
          details={[
            { label: '粗利率', value: formatPercent(100 - adjustedThisMonthKpis.purchaseRate) }
          ]}
        />

        <MetricCard
          label="営業利益率"
          value={formatPercent(adjustedThisMonthKpis.profitMargin)}
          icon={Percent}
          tone={adjustedThisMonthKpis.profitMargin >= 15 ? "success" : adjustedThisMonthKpis.profitMargin >= 10 ? "warning" : "danger"}
          hint="営業利益 ÷ 売上高"
          details={[
            { label: '営業利益', value: formatCurrency(adjustedThisMonthKpis.operatingProfit) }
          ]}
        />

        <MetricCard
          label="平均日商"
          value={formatCurrency(adjustedThisMonthKpis.averageDailySales)}
          icon={FileText}
          tone="neutral"
          hint="1日あたり平均"
        />

        <MetricCard
          label="客数"
          value={adjustedThisMonthKpis.totalCustomers > 0 ? `${adjustedThisMonthKpis.totalCustomers.toLocaleString('ja-JP')} 名` : '未入力'}
          icon={FileText}
          tone={adjustedThisMonthKpis.totalCustomers > 0 ? "info" : "neutral"}
          hint={adjustedThisMonthKpis.totalCustomers > 0 ? `平均客単価: ${formatCurrency(adjustedThisMonthKpis.averageTicket)}` : "日報で客数を入力してください"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart
          reports={rangeReports}
          period="monthly"
          maxPoints={rangeMonths}
          targetSales={currentTarget?.targetSales}
          onDataPointClick={(period) => setSelectedMonth(period)}
          expenseBaseline={expenseBaseline}
        />
        <ExpensePie
          reports={rangeReports}
          period="monthly"
          expenseBaseline={expenseBaseline}
        />
      </div>

      {/* 視覚で全体把握・要因把握 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalendarHeatmap reports={thisMonthReports} />
        <ProfitWaterfall
          reports={thisMonthReports}
          expenseBaseline={expenseBaseline}
          adjustedLaborCost={adjustedThisMonthKpis.laborTotal}
        />
      </div>

      {/* アラート */}
      <AlertsPanel
        kpis={adjustedThisMonthKpis}
        targetCostRate={currentTarget?.targetCostRate}
        targetLaborRate={currentTarget?.targetLaborRate}
      />

      {/* Data Table */}
      <DataTable
        reports={rangeReports}
        period="monthly"
        groupByStore={false}
        onPeriodClick={handlePeriodClick}
        baselineMap={baselineMap}
      />

      {/* P&L Modal */}
      {selectedMonth && (
        <ProfitLossModal
          month={selectedMonth}
          reports={rangeReports}
          storeId={storeId}
          onClose={() => setSelectedMonth(null)}
        />
      )}
    </div>
  )
}