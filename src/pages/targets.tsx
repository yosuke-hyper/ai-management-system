import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Target, TrendingUp, Users, Calendar, AlertCircle, CheckCircle, Percent, Tag, Store } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthlyProgressCard } from '@/components/dashboard/monthlyprogresscard'
import { StatusMetricCard } from '@/components/dashboard/statusmetriccard'
import { SalesChart } from '@/components/charts/saleschart'
import { MonthlyGoalCalendar } from '@/components/dashboard/monthlygoalcalendar'
import { useReports } from '@/hooks/usereports'
import { useTargets } from '@/hooks/usetargets'
import { useKpis } from '@/hooks/usekpis'
import { useExpenseBaseline } from '@/hooks/useexpensebaseline'
import { useAdminData } from '@/contexts/admindatacontext'
import { useBrands } from '@/hooks/usebrands'
import { useAuth } from '@/contexts/authcontext'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'
import { eachDayOfInterval, startOfMonth, endOfMonth, format } from 'date-fns'
import { getStoreRegularClosedDays, getStoreHolidays, calculateOpenDays } from '@/services/storeholidays'

export const Targets: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const urlStoreId = sp.get('store') || ''
  const urlBrandId = sp.get('brand') || ''
  const { stores } = useAdminData()
  const { brands, getBrandById } = useBrands()
  const { user, isDemoMode } = useAuth()

  const filteredStores = React.useMemo(() => {
    if (!urlBrandId) return stores
    return stores.filter(s => s.brandId === urlBrandId)
  }, [stores, urlBrandId])

  const storeId = React.useMemo(() => {
    if (urlStoreId && urlStoreId !== 'all' && filteredStores.some(s => s.id === urlStoreId)) {
      return urlStoreId
    }
    if (filteredStores.length > 0) {
      return filteredStores[0].id
    }
    return stores[0]?.id || ''
  }, [urlStoreId, filteredStores, stores])

  const brandId = urlBrandId
  const selectedBrand = getBrandById(brandId)

  React.useEffect(() => {
    if (storeId && storeId !== urlStoreId) {
      const p = new URLSearchParams(location.search)
      p.set('store', storeId)
      if (brandId) p.set('brand', brandId)
      navigate(`${location.pathname}?${p.toString()}`, { replace: true })
    }
  }, [storeId, urlStoreId, brandId, location.pathname, location.search, navigate])

  const onChangeBrand = (newBrandId: string) => {
    const p = new URLSearchParams(location.search)
    if (newBrandId) {
      p.set('brand', newBrandId)
      const brandStoreList = stores.filter(s => s.brandId === newBrandId)
      if (brandStoreList.length > 0) {
        p.set('store', brandStoreList[0].id)
      }
    } else {
      p.delete('brand')
      if (stores.length > 0) {
        p.set('store', stores[0].id)
      }
    }
    navigate(`${location.pathname}?${p.toString()}`, { replace: true })
  }

  const onChangeStore = (newStoreId: string) => {
    const p = new URLSearchParams(location.search)
    p.set('store', newStoreId)
    if (brandId) p.set('brand', brandId)
    navigate(`${location.pathname}?${p.toString()}`, { replace: true })
  }

  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const initial = `${year}-${month}`
    console.log('📅 Initial period:', { now: now.toISOString(), initial })
    return initial
  })

  const [regularClosedDays, setRegularClosedDays] = React.useState<number[]>([])
  const [specificHolidays, setSpecificHolidays] = React.useState<Set<string>>(new Set())
  const [dbOpenDays, setDbOpenDays] = React.useState<number | null>(null)

  React.useEffect(() => {
    const loadHolidayData = async () => {
      if (!storeId) {
        setRegularClosedDays([])
        setSpecificHolidays(new Set())
        setDbOpenDays(null)
        return
      }

      const { data: closedDays } = await getStoreRegularClosedDays(storeId)
      if (closedDays && closedDays.length > 0) {
        setRegularClosedDays(closedDays.map(d => d.dayOfWeek))
      } else {
        setRegularClosedDays([])
      }

      const { data: holidays } = await getStoreHolidays(storeId, selectedPeriod)
      if (holidays) {
        setSpecificHolidays(new Set(holidays.map(h => h.date)))
      } else {
        setSpecificHolidays(new Set())
      }

      const { data: openDays } = await calculateOpenDays(storeId, selectedPeriod)
      setDbOpenDays(openDays)
      console.log('📅 Holiday data loaded:', {
        storeId,
        selectedPeriod,
        regularClosedDays: closedDays?.map(d => d.dayOfWeek),
        specificHolidays: holidays?.map(h => h.date),
        dbOpenDays: openDays
      })
    }

    loadHolidayData()
  }, [storeId, selectedPeriod])

  const { expenseBaseline } = useExpenseBaseline(storeId, selectedPeriod)

  const startDate = `${selectedPeriod}-01`
  const endDate = React.useMemo(() => {
    const [year, month] = selectedPeriod.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    return `${selectedPeriod}-${String(lastDay).padStart(2, '0')}`
  }, [selectedPeriod])

  const { data: monthReports, isLoading } = useReports({
    storeId,
    brandId,
    dateFrom: startDate,
    dateTo: endDate
  })

  console.log('📊 Targets: monthReports', {
    count: monthReports.length,
    startDate,
    endDate,
    storeId,
    selectedPeriod,
    firstReport: monthReports[0],
    lastReport: monthReports[monthReports.length - 1]
  })

  const brandStores = React.useMemo(() => {
    if (brandId && brandId !== 'headquarters') {
      return stores.filter(s => s.brandId === brandId)
    }
    return []
  }, [brandId, stores])

  const { targets, getAllStoresTarget, calculateTargetMetrics } = useTargets(storeId, selectedPeriod)
  const baseKpis = useKpis(monthReports, undefined, expenseBaseline)

  const monthKpis = React.useMemo(() => {
    return baseKpis
  }, [baseKpis])
  
  const storeTarget = React.useMemo(() => {
    return getAllStoresTarget()
  }, [getAllStoresTarget])

  console.log('🎯 Targets Page Debug:', {
    selectedPeriod,
    storeId,
    brandId,
    brandStores: brandStores.length,
    storeTarget,
    monthKpis: {
      totalSales: monthKpis.totalSales,
      operatingProfit: monthKpis.operatingProfit
    }
  })

  const targetMetrics = calculateTargetMetrics(
    monthKpis.totalSales,
    monthKpis.operatingProfit,
    storeTarget.targetSales,
    storeTarget.targetProfit
  )

  // 現時点での客単価と必要客数を計算
  const customerMetrics = React.useMemo(() => {
    // 現在の客単価を計算（データがない場合はデフォルト値1000円）
    const currentAverageSpend = monthKpis.totalCustomers > 0
      ? monthKpis.totalSales / monthKpis.totalCustomers
      : (storeTarget?.targetAverageSpend || 1000)

    // 必要日商を達成するための必要客数/日
    const requiredDailyCustomers = currentAverageSpend > 0 && targetMetrics.requiredDailySales > 0
      ? Math.ceil(targetMetrics.requiredDailySales / currentAverageSpend)
      : 0

    // 現在の日平均客数
    const daysWithReports = monthReports.length
    const currentDailyCustomers = daysWithReports > 0
      ? monthKpis.totalCustomers / daysWithReports
      : 0

    // 客数達成率（現在の日平均客数 / 必要な日平均客数）
    const customerAchievementRate = requiredDailyCustomers > 0
      ? (currentDailyCustomers / requiredDailyCustomers) * 100
      : 0

    return {
      currentAverageSpend,
      requiredDailyCustomers,
      currentDailyCustomers,
      customerAchievementRate
    }
  }, [monthKpis.totalSales, monthKpis.totalCustomers, targetMetrics.requiredDailySales, targetMetrics.requiredCustomers, storeTarget?.targetAverageSpend, monthReports.length])

  const calendarData = React.useMemo(() => {
    const [year, month] = selectedPeriod.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const checkIsHoliday = (day: Date, dateStr: string): boolean => {
      const dayOfWeek = day.getDay()
      if (regularClosedDays.includes(dayOfWeek)) return true
      if (specificHolidays.has(dateStr)) return true
      return false
    }

    const operatingDays = allDays.filter(d => {
      const dateStr = format(d, 'yyyy-MM-dd')
      return !checkIsHoliday(d, dateStr)
    })
    const operatingDaysCount = operatingDays.length

    console.log('📅 Calendar calculation:', {
      selectedPeriod,
      operatingDaysCount,
      dbOpenDays,
      regularClosedDays,
      specificHolidaysCount: specificHolidays.size,
      note: 'Using JS calculation to match calendar display'
    })

    const dailySalesTarget = operatingDaysCount > 0
      ? storeTarget.targetSales / operatingDaysCount
      : 0
    const targetCostRate = storeTarget.targetCostRate || 30
    const targetLaborRate = storeTarget.targetLaborRate || 25

    const reportsByDate = new Map<string, typeof monthReports>()
    monthReports.forEach(report => {
      const existing = reportsByDate.get(report.date) || []
      reportsByDate.set(report.date, [...existing, report])
    })

    const dayStatuses = allDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const isHoliday = checkIsHoliday(day, dateStr)
      const isOperatingDay = !isHoliday

      const dayReports = reportsByDate.get(dateStr) || []
      const hasSalesData = dayReports.length > 0

      const sales = dayReports.reduce((sum, r) => sum + r.sales, 0)
      const purchases = dayReports.reduce((sum, r) => sum + (r.purchase || 0), 0)
      const reportedLaborCost = dayReports.reduce((sum, r) => sum + (r.laborCost || 0), 0)
      const laborCost = reportedLaborCost > 0 ? reportedLaborCost : (hasSalesData ? (expenseBaseline.laborCost || 0) : 0)

      const costRate = sales > 0 ? (purchases / sales) * 100 : 0
      const laborRate = sales > 0 ? (laborCost / sales) * 100 : 0

      const salesAchieved = hasSalesData && sales >= dailySalesTarget
      const costRateAchieved = hasSalesData && (targetCostRate === 0 || costRate <= targetCostRate)
      const laborRateAchieved = hasSalesData && (targetLaborRate === 0 || laborRate <= targetLaborRate)
      const allGoalsAchieved = salesAchieved && costRateAchieved && laborRateAchieved

      return {
        date: dateStr,
        isOperatingDay,
        isHoliday,
        sales,
        targetSales: dailySalesTarget,
        costRate,
        targetCostRate,
        laborRate,
        targetLaborRate,
        allGoalsAchieved: isOperatingDay && hasSalesData ? allGoalsAchieved : false,
        salesAchieved: isOperatingDay && hasSalesData ? salesAchieved : false,
        costRateAchieved: isOperatingDay && hasSalesData ? costRateAchieved : false,
        laborRateAchieved: isOperatingDay && hasSalesData ? laborRateAchieved : false
      }
    })

    return {
      year,
      month,
      dayStatuses,
      operatingDaysCount,
      monthlyTargetSales: storeTarget.targetSales,
      currentMonthlySales: monthKpis.totalSales
    }
  }, [selectedPeriod, monthReports, storeTarget, monthKpis.totalSales, regularClosedDays, specificHolidays, dbOpenDays, expenseBaseline])

  const displayDate = React.useMemo(() => {
    const [year, month] = selectedPeriod.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    const formatted = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long'
    })
    console.log('📅 displayDate calculation:', {
      selectedPeriod,
      year,
      month,
      'month-1': month - 1,
      date: date.toISOString(),
      formatted
    })
    return formatted
  }, [selectedPeriod])

  const availableMonths = React.useMemo(() => {
    const months: { value: string; label: string }[] = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const value = `${year}-${month}`
      const label = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long'
      })
      months.push({ value, label })
    }

    console.log('📅 Available months generated:', months)
    return months
  }, [])

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

  const hasData = monthReports.length > 0
  const hasTargets = storeTarget.targetSales > 0 || storeTarget.targetProfit > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              目標達成度
            </h1>
            <p className="text-muted-foreground">
              {displayDate}の目標進捗
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedPeriod}
              onChange={(e) => {
                console.log('📅 Period changed:', {
                  from: selectedPeriod,
                  to: e.target.value,
                  availableMonths
                })
                setSelectedPeriod(e.target.value)
              }}
              className="px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Brand & Store Selector */}
        <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Brand Selector */}
              {brands.length > 0 && (
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Tag className="h-4 w-4" />
                    業態を選択
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => onChangeBrand(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    style={selectedBrand ? {
                      borderColor: selectedBrand.color,
                      color: selectedBrand.color
                    } : {}}
                  >
                    <option value="">全業態</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.icon} {brand.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Store Selector */}
              <div className="flex-1">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Store className="h-4 w-4" />
                  店舗を選択
                </label>
                <select
                  value={storeId}
                  onChange={(e) => onChangeStore(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {filteredStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Store Info */}
            {stores.find(s => s.id === storeId) && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {selectedBrand && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: selectedBrand.color,
                        color: selectedBrand.color,
                        backgroundColor: `${selectedBrand.color}10`
                      }}
                    >
                      {selectedBrand.icon} {selectedBrand.displayName}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    <Store className="h-3 w-3 mr-1" />
                    {stores.find(s => s.id === storeId)?.name}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* First-time user guidance */}
      {!hasData && !hasTargets && (
        <Card className="border-2 border-blue-300 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  目標達成度の追跡を始めましょう
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  目標達成度を確認するには、以下の手順を完了してください：
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li>まず、月次目標を設定します（売上目標、利益目標など）</li>
                  <li>日報を入力して日々の実績を記録します</li>
                  <li>このページで進捗状況と達成率を確認できます</li>
                </ol>
                <div className="pt-2">
                  <a
                    href="/data-management"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Target className="h-4 w-4" />
                    目標を設定する
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasData && hasTargets && (
        <Card className="border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                  日報を入力して進捗を追跡しましょう
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  目標が設定されています。日報を入力すると、リアルタイムで達成率と必要な日商を確認できます。
                </p>
                <div className="pt-2">
                  <a
                    href="/report-form"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    日報を入力する
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Simplified Progress Card */}
      <MonthlyProgressCard
        currentSales={monthKpis.totalSales}
        targetSales={storeTarget.targetSales}
        currentProfit={monthKpis.operatingProfit}
        targetProfit={storeTarget.targetProfit}
        daysRemaining={targetMetrics.daysRemaining}
        monthName={displayDate}
      />

      {/* Achievement Cards - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusMetricCard
          emoji="💰"
          label="売上"
          value={formatCurrency(monthKpis.totalSales)}
          achievementRate={targetMetrics.salesAchievement}
          target={storeTarget.targetSales}
          current={monthKpis.totalSales}
          unit="円"
        />

        <StatusMetricCard
          emoji="😊"
          label="営業利益"
          value={formatCurrency(monthKpis.operatingProfit)}
          achievementRate={targetMetrics.profitAchievement}
          target={storeTarget.targetProfit}
          current={monthKpis.operatingProfit}
          unit="円"
        />

        <StatusMetricCard
          emoji="📅"
          label="必要日商"
          value={formatCurrency(targetMetrics.requiredDailySales)}
          achievementRate={targetMetrics.daysRemaining > 0 ? 100 : 0}
          target={targetMetrics.requiredDailySales}
          current={targetMetrics.requiredDailySales}
          unit="円"
          showRemaining={false}
        />

        <StatusMetricCard
          emoji="👥"
          label="必要客数/日"
          value={`${formatNumber(customerMetrics.requiredDailyCustomers)}名`}
          achievementRate={customerMetrics.customerAchievementRate}
          target={customerMetrics.requiredDailyCustomers}
          current={customerMetrics.currentDailyCustomers}
          unit="名"
          showRemaining={true}
          additionalInfo={`現在の客単価: ${formatCurrency(customerMetrics.currentAverageSpend)}`}
        />
      </div>

      {/* Cost and Labor Rate Targets */}
      {(storeTarget.targetCostRate > 0 || storeTarget.targetLaborRate > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storeTarget.targetCostRate > 0 && (
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
                      monthKpis.purchaseRate <= storeTarget.targetCostRate ? 'text-green-600' :
                      monthKpis.purchaseRate <= storeTarget.targetCostRate + 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercent(monthKpis.purchaseRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">目標</span>
                    <span className="font-medium">{formatPercent(storeTarget.targetCostRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-muted-foreground">差異</span>
                    <span className={`font-medium ${
                      monthKpis.purchaseRate <= storeTarget.targetCostRate ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthKpis.purchaseRate <= storeTarget.targetCostRate ? '✓ 達成' : `+${formatPercent(monthKpis.purchaseRate - storeTarget.targetCostRate)}`}
                    </span>
                  </div>
                  {monthKpis.purchaseRate > storeTarget.targetCostRate && (
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

          {storeTarget.targetLaborRate > 0 && (
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
                      monthKpis.laborRate <= storeTarget.targetLaborRate ? 'text-green-600' :
                      monthKpis.laborRate <= storeTarget.targetLaborRate + 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercent(monthKpis.laborRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">目標</span>
                    <span className="font-medium">{formatPercent(storeTarget.targetLaborRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-muted-foreground">差異</span>
                    <span className={`font-medium ${
                      monthKpis.laborRate <= storeTarget.targetLaborRate ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthKpis.laborRate <= storeTarget.targetLaborRate ? '✓ 達成' : `+${formatPercent(monthKpis.laborRate - storeTarget.targetLaborRate)}`}
                    </span>
                  </div>
                  {monthKpis.laborRate > storeTarget.targetLaborRate && (
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


      {/* Action Items */}
      {hasData && hasTargets && (
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

              {monthKpis.profitMargin < 15 && hasTargets && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">利益率改善が必要</p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      現在{formatPercent(monthKpis.profitMargin)}、目標{formatPercent(storeTarget.targetProfitMargin)}
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
      )}

      {/* Daily Goal Achievement Calendar */}
      {hasData && hasTargets && (
        <MonthlyGoalCalendar
          year={calendarData.year}
          month={calendarData.month}
          dayStatuses={calendarData.dayStatuses}
          monthlyTargetSales={calendarData.monthlyTargetSales}
          currentMonthlySales={calendarData.currentMonthlySales}
          operatingDaysInMonth={calendarData.operatingDaysCount}
        />
      )}

      {/* Sales Chart with Target Line */}
      <SalesChart
        reports={monthReports}
        period="daily"
        targetSales={storeTarget.targetSales / 30} // Daily target
        expenseBaseline={expenseBaseline}
      />

    </div>
  )
}