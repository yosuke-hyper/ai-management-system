import React from 'react'
import { useLocation } from 'react-router-dom'
import { Target, TrendingUp, Users, Calendar, AlertCircle, CheckCircle, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/Charts/SalesChart'
import { useReports } from '@/hooks/useReports'
import { useTargets } from '@/hooks/useTargets'
import { useKpis } from '@/hooks/useKpis'
import { useExpenseBaseline } from '@/hooks/useExpenseBaseline'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'

export const Targets: React.FC = () => {
  const location = useLocation()
  const sp = new URLSearchParams(location.search)
  const storeId = sp.get('store') || 'all'
  const currentPeriod = new Date().toISOString().substring(0, 7) // YYYY-MM
  const { expenseBaseline, monthlyExpenseBaseline } = useExpenseBaseline(storeId, currentPeriod)
  
  const { data: monthReports, isLoading } = useReports({
    storeId,
    dateFrom: new Date().toISOString().substring(0, 8) + '01', // First day of month
    dateTo: new Date().toISOString().split('T')[0] // Today
  })

  const { getAllStoresTarget, calculateTargetMetrics } = useTargets(storeId, currentPeriod)
  const baseKpis = useKpis(monthReports)

  // 月次経費を日報データ分だけ日割りで加算して正しい営業利益を計算
  const monthKpis = React.useMemo(() => {
    if (storeId === 'all' || !monthlyExpenseBaseline || monthReports.length === 0) {
      return baseKpis
    }

    // 日報データがある日数分の月次経費を日割り計算
    const daysWithReports = monthReports.length
    const monthlyTotal = monthlyExpenseBaseline.totalExpense
    const openDays = expenseBaseline.monthly?.open_days || 31
    const proRatedMonthlyExpense = Math.round((monthlyTotal / openDays) * daysWithReports)

    // 営業利益 = 売上 - （仕入経費 + その他経費）
    // その他経費 = 日報のその他経費 + 月次経費の日割り分
    const totalExpenses = baseKpis.totalExpenses + proRatedMonthlyExpense
    const operatingProfit = baseKpis.totalSales - totalExpenses
    const profitMargin = baseKpis.totalSales > 0 ? (operatingProfit / baseKpis.totalSales) * 100 : 0

    return {
      ...baseKpis,
      totalExpenses,
      operatingProfit,
      profitMargin
    }
  }, [baseKpis, monthlyExpenseBaseline, expenseBaseline, monthReports.length, storeId])
  
  const allStoresTarget = getAllStoresTarget()
  const targetMetrics = calculateTargetMetrics(
    monthKpis.totalSales,
    monthKpis.operatingProfit,
    allStoresTarget.targetSales,
    allStoresTarget.targetProfit
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          目標達成度
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}の目標進捗
        </p>
      </div>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="売上達成率"
          value={`${targetMetrics.salesAchievement.toFixed(1)}%`}
          icon={TrendingUp}
          tone={
            targetMetrics.salesAchievement >= 90 ? "success" : 
            targetMetrics.salesAchievement >= 70 ? "warning" : "danger"
          }
          hint={`目標: ${formatCurrency(allStoresTarget.targetSales)}`}
        />
        
        <MetricCard
          label="営業利益達成率"
          value={`${targetMetrics.profitAchievement.toFixed(1)}%`}
          icon={Target}
          tone={
            targetMetrics.profitAchievement >= 90 ? "success" : 
            targetMetrics.profitAchievement >= 70 ? "warning" : "danger"
          }
          hint={`目標: ${formatCurrency(allStoresTarget.targetProfit)}`}
        />
        
        <MetricCard
          label="必要売上残"
          value={formatCurrency(targetMetrics.remainingSales)}
          icon={Calendar}
          tone="info"
          hint={`残り${targetMetrics.daysRemaining}日`}
        />
        
        <MetricCard
          label="必要日商"
          value={formatCurrency(targetMetrics.requiredDailySales)}
          icon={Users}
          tone="neutral"
          hint={`必要客数: ${formatNumber(targetMetrics.requiredCustomers)}名`}
        />
      </div>

      {/* Cost and Labor Rate Targets */}
      {(allStoresTarget.targetCostRate > 0 || allStoresTarget.targetLaborRate > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allStoresTarget.targetCostRate > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-orange-600" />
                  原価率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">実績</span>
                    <span className={`text-2xl font-bold ${
                      monthKpis.purchaseRate <= allStoresTarget.targetCostRate ? 'text-green-600' :
                      monthKpis.purchaseRate <= allStoresTarget.targetCostRate + 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercent(monthKpis.purchaseRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">目標</span>
                    <span className="font-medium">{formatPercent(allStoresTarget.targetCostRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-muted-foreground">差異</span>
                    <span className={`font-medium ${
                      monthKpis.purchaseRate <= allStoresTarget.targetCostRate ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthKpis.purchaseRate <= allStoresTarget.targetCostRate ? '✓ 達成' : `+${formatPercent(monthKpis.purchaseRate - allStoresTarget.targetCostRate)}`}
                    </span>
                  </div>
                  {monthKpis.purchaseRate > allStoresTarget.targetCostRate && (
                    <div className="flex items-center gap-2 p-2 mt-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
                      <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-300">
                        原価率が目標を上回っています。仕入管理の見直しが必要です。
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {allStoresTarget.targetLaborRate > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-600" />
                  人件費率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">実績</span>
                    <span className={`text-2xl font-bold ${
                      monthKpis.laborRate <= allStoresTarget.targetLaborRate ? 'text-green-600' :
                      monthKpis.laborRate <= allStoresTarget.targetLaborRate + 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercent(monthKpis.laborRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">目標</span>
                    <span className="font-medium">{formatPercent(allStoresTarget.targetLaborRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-muted-foreground">差異</span>
                    <span className={`font-medium ${
                      monthKpis.laborRate <= allStoresTarget.targetLaborRate ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthKpis.laborRate <= allStoresTarget.targetLaborRate ? '✓ 達成' : `+${formatPercent(monthKpis.laborRate - allStoresTarget.targetLaborRate)}`}
                    </span>
                  </div>
                  {monthKpis.laborRate > allStoresTarget.targetLaborRate && (
                    <div className="flex items-center gap-2 p-2 mt-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
                      <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-300">
                        人件費率が目標を上回っています。シフト調整の検討が必要です。
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              売上目標進捗
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>現在の売上</span>
                <span className="font-medium">{formatCurrency(monthKpis.totalSales)}</span>
              </div>
              <Progress 
                value={targetMetrics.salesAchievement} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0円</span>
                <span>{formatCurrency(allStoresTarget.targetSales)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">達成率</p>
                <p className={`text-lg font-bold ${
                  targetMetrics.salesAchievement >= 90 ? 'text-green-600' : 
                  targetMetrics.salesAchievement >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {targetMetrics.salesAchievement.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">必要残額</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(targetMetrics.remainingSales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              利益目標進捗
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>現在の営業利益</span>
                <span className="font-medium">{formatCurrency(monthKpis.operatingProfit)}</span>
              </div>
              <Progress 
                value={targetMetrics.profitAchievement} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0円</span>
                <span>{formatCurrency(allStoresTarget.targetProfit)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">利益率</p>
                <p className={`text-lg font-bold ${
                  monthKpis.profitMargin >= 20 ? 'text-green-600' : 
                  monthKpis.profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatPercent(monthKpis.profitMargin)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">目標営業利益率</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPercent(allStoresTarget.targetProfitMargin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            アクション項目
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {targetMetrics.salesAchievement < 90 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">売上目標達成のため日商向上が必要</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    残り{targetMetrics.daysRemaining}日で{formatCurrency(targetMetrics.requiredDailySales)}/日の売上が必要
                  </p>
                </div>
                <Badge variant="outline">高優先度</Badge>
              </div>
            )}
            
            {monthKpis.profitMargin < 15 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">利益率改善が必要</p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    現在{formatPercent(monthKpis.profitMargin)}、目標{formatPercent(allStoresTarget.targetProfitMargin)}
                  </p>
                </div>
                <Badge variant="destructive">重要</Badge>
              </div>
            )}
            
            {targetMetrics.salesAchievement >= 100 && targetMetrics.profitAchievement >= 100 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">目標達成おめでとうございます！</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    売上・利益ともに目標を上回っています
                  </p>
                </div>
                <Badge>達成</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Chart with Target Line */}
      <SalesChart
        reports={monthReports}
        period="daily"
        targetSales={allStoresTarget.targetSales / 30} // Daily target
        expenseBaseline={expenseBaseline}
      />
    </div>
  )
}