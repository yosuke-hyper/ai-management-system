import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, isSameDay } from 'date-fns'

export interface DailyGoalAchievement {
  id: string
  storeId: string
  organizationId: string
  date: string
  targetSales: number
  actualSales: number
  salesAchieved: boolean
  targetCostRate: number
  actualCostRate: number
  costRateAchieved: boolean
  targetLaborRate: number
  actualLaborRate: number
  laborRateAchieved: boolean
  allGoalsAchieved: boolean
  createdAt?: string
  updatedAt?: string
}

export interface MonthlyGoalSummary {
  totalOperatingDays: number
  passedOperatingDays: number
  achievedDays: number
  achievementRate: number
  remainingDays: number
  totalSales: number
  monthlyTargetSales: number
  salesProgress: number
}

export interface DailyGoalTargets {
  dailySalesTarget: number
  costRateTarget: number
  laborRateTarget: number
}

interface MonthlyTarget {
  targetSales: number
  targetCostRate: number
  targetLaborRate: number
}

export const useDailyGoalAchievements = (
  storeId: string | null,
  year: number,
  month: number
) => {
  const [achievements, setAchievements] = useState<DailyGoalAchievement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isDemoMode } = useAuth()
  const { organizationId } = useOrganization()

  const fetchAchievements = useCallback(async () => {
    if (!storeId || storeId === 'all') {
      setAchievements([])
      return
    }

    if (!user && !isDemoMode) {
      setAchievements([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

      const { data, error: fetchError } = await supabase
        .from('daily_goal_achievements')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (fetchError) {
        console.error('日次達成状況の取得エラー:', fetchError)
        setError('達成状況の取得に失敗しました')
        setAchievements([])
        return
      }

      const mapped: DailyGoalAchievement[] = (data || []).map(d => ({
        id: d.id,
        storeId: d.store_id,
        organizationId: d.organization_id,
        date: d.date,
        targetSales: Number(d.target_sales) || 0,
        actualSales: Number(d.actual_sales) || 0,
        salesAchieved: d.sales_achieved || false,
        targetCostRate: Number(d.target_cost_rate) || 0,
        actualCostRate: Number(d.actual_cost_rate) || 0,
        costRateAchieved: d.cost_rate_achieved || false,
        targetLaborRate: Number(d.target_labor_rate) || 0,
        actualLaborRate: Number(d.actual_labor_rate) || 0,
        laborRateAchieved: d.labor_rate_achieved || false,
        allGoalsAchieved: d.all_goals_achieved || false,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }))

      setAchievements(mapped)
    } catch (e) {
      console.error('日次達成状況の取得エラー:', e)
      setError('達成状況の取得に失敗しました')
      setAchievements([])
    } finally {
      setIsLoading(false)
    }
  }, [storeId, year, month, user, isDemoMode])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  const calculateDailyTargets = useCallback((
    monthlyTarget: MonthlyTarget,
    operatingDaysInMonth: number
  ): DailyGoalTargets => {
    const dailySalesTarget = operatingDaysInMonth > 0
      ? Math.ceil(monthlyTarget.targetSales / operatingDaysInMonth)
      : 0

    return {
      dailySalesTarget,
      costRateTarget: monthlyTarget.targetCostRate,
      laborRateTarget: monthlyTarget.targetLaborRate
    }
  }, [])

  const updateAchievement = useCallback(async (
    date: string,
    actualSales: number,
    actualCostRate: number,
    actualLaborRate: number,
    dailyTargets: DailyGoalTargets
  ) => {
    if (!storeId || storeId === 'all' || !organizationId) {
      return { success: false, error: '店舗または組織が選択されていません' }
    }

    const salesAchieved = actualSales >= dailyTargets.dailySalesTarget
    const costRateAchieved = dailyTargets.costRateTarget > 0
      ? actualCostRate <= dailyTargets.costRateTarget
      : true
    const laborRateAchieved = dailyTargets.laborRateTarget > 0
      ? actualLaborRate <= dailyTargets.laborRateTarget
      : true
    const allGoalsAchieved = salesAchieved && costRateAchieved && laborRateAchieved

    try {
      const { data, error: upsertError } = await supabase
        .from('daily_goal_achievements')
        .upsert({
          store_id: storeId,
          organization_id: organizationId,
          date,
          target_sales: dailyTargets.dailySalesTarget,
          actual_sales: actualSales,
          sales_achieved: salesAchieved,
          target_cost_rate: dailyTargets.costRateTarget,
          actual_cost_rate: actualCostRate,
          cost_rate_achieved: costRateAchieved,
          target_labor_rate: dailyTargets.laborRateTarget,
          actual_labor_rate: actualLaborRate,
          labor_rate_achieved: laborRateAchieved,
          all_goals_achieved: allGoalsAchieved,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id,date'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('達成状況の更新エラー:', upsertError)
        return { success: false, error: '達成状況の更新に失敗しました' }
      }

      await fetchAchievements()
      return { success: true, data }
    } catch (e) {
      console.error('達成状況の更新エラー:', e)
      return { success: false, error: '達成状況の更新に失敗しました' }
    }
  }, [storeId, organizationId, fetchAchievements])

  const getAchievementForDate = useCallback((date: string) => {
    return achievements.find(a => a.date === date)
  }, [achievements])

  const summary = useMemo((): MonthlyGoalSummary => {
    const today = new Date()
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const operatingDays = allDays.filter(d => d.getDay() !== 0)
    const totalOperatingDays = operatingDays.length

    const passedOperatingDays = operatingDays.filter(d =>
      isBefore(d, today) || isSameDay(d, today)
    ).length

    const achievedDays = achievements.filter(a => a.allGoalsAchieved).length
    const achievementRate = passedOperatingDays > 0
      ? Math.round((achievedDays / passedOperatingDays) * 100)
      : 0

    const totalSales = achievements.reduce((sum, a) => sum + a.actualSales, 0)
    const monthlyTargetSales = achievements.length > 0
      ? achievements[0].targetSales * totalOperatingDays
      : 0
    const salesProgress = monthlyTargetSales > 0
      ? Math.round((totalSales / monthlyTargetSales) * 100)
      : 0

    return {
      totalOperatingDays,
      passedOperatingDays,
      achievedDays,
      achievementRate,
      remainingDays: totalOperatingDays - passedOperatingDays,
      totalSales,
      monthlyTargetSales,
      salesProgress
    }
  }, [achievements, year, month])

  return {
    achievements,
    isLoading,
    error,
    summary,
    calculateDailyTargets,
    updateAchievement,
    getAchievementForDate,
    refetch: fetchAchievements
  }
}

export const useTodayGoalAchievement = (
  storeId: string | null,
  monthlyTarget: MonthlyTarget | null,
  operatingDaysInMonth: number,
  todayMetrics: {
    sales: number
    costRate: number
    laborRate: number
  }
) => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const {
    achievements,
    isLoading,
    calculateDailyTargets,
    updateAchievement,
    summary,
    refetch
  } = useDailyGoalAchievements(storeId, year, month)

  const dailyTargets = useMemo(() => {
    if (!monthlyTarget || operatingDaysInMonth <= 0) {
      return {
        dailySalesTarget: 0,
        costRateTarget: 0,
        laborRateTarget: 0
      }
    }
    return calculateDailyTargets(monthlyTarget, operatingDaysInMonth)
  }, [monthlyTarget, operatingDaysInMonth, calculateDailyTargets])

  const todayAchievement = useMemo(() => {
    const salesAchieved = todayMetrics.sales >= dailyTargets.dailySalesTarget
    const costRateAchieved = dailyTargets.costRateTarget > 0
      ? todayMetrics.costRate <= dailyTargets.costRateTarget
      : true
    const laborRateAchieved = dailyTargets.laborRateTarget > 0
      ? todayMetrics.laborRate <= dailyTargets.laborRateTarget
      : true
    const allGoalsAchieved = salesAchieved && costRateAchieved && laborRateAchieved

    return {
      salesAchieved,
      costRateAchieved,
      laborRateAchieved,
      allGoalsAchieved,
      achievedCount: [salesAchieved, costRateAchieved, laborRateAchieved].filter(Boolean).length,
      totalGoals: 3
    }
  }, [todayMetrics, dailyTargets])

  const saveTodayAchievement = useCallback(async () => {
    const dateStr = format(today, 'yyyy-MM-dd')
    return updateAchievement(
      dateStr,
      todayMetrics.sales,
      todayMetrics.costRate,
      todayMetrics.laborRate,
      dailyTargets
    )
  }, [today, todayMetrics, dailyTargets, updateAchievement])

  return {
    dailyTargets,
    todayAchievement,
    monthlyProgress: summary,
    daysAchievedThisMonth: summary.achievedDays,
    isLoading,
    saveTodayAchievement,
    refetch
  }
}
