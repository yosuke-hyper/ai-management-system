import { useState, useEffect, useCallback } from 'react'
import { getTargets } from '@/services/supabase'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import { supabase } from '@/lib/supabase'

export interface TargetMetrics {
  salesAchievement: number
  profitAchievement: number
  remainingSales: number
  requiredDailySales: number
  requiredCustomers: number
  averageCustomerSpend: number
  daysRemaining: number
}

export type TargetData = {
  storeId: string
  period: string
  targetSales: number
  targetProfit: number
  targetProfitMargin: number
  targetCostRate: number
  targetLaborRate: number
}

export const useTargets = (storeId: string = 'all', period: string) => {
  const [targets, setTargets] = useState<TargetData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isDemoMode } = useAuth()
  const { organizationId } = useOrganization()

  const fetchTargets = useCallback(async () => {
    const demoSessionId = typeof window !== 'undefined' ? localStorage.getItem('demo_session_id') : null
    const isDemo = isDemoMode || !!demoSessionId

    if (!user && !isDemo) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      if (!isDemo && organizationId) {
        const { setSelectedOrganizationContext } = await import('@/services/organizationservice')
        await setSelectedOrganizationContext(organizationId)
      }

      if (isDemo) {
        console.log('📊 Demo mode: Fetching from fixed_demo_targets', { storeId, period })

        let query = supabase
          .from('fixed_demo_targets')
          .select('*')
          .eq('period', period)

        if (storeId && storeId !== 'all') {
          query = query.eq('store_id', storeId)
        }

        const { data: demoData, error: demoError } = await query

        if (demoError) {
          console.error('useTargets demo error:', demoError)
          setTargets([])
          return
        }

        const demoTargets: TargetData[] = (demoData || []).map(t => ({
          storeId: t.store_id,
          period: t.period,
          targetSales: Number(t.target_sales),
          targetProfit: Number(t.target_profit),
          targetProfitMargin: Number(t.target_profit_margin),
          targetCostRate: Number(t.target_cost_rate || 0),
          targetLaborRate: Number(t.target_labor_rate || 0)
        }))

        console.log('📊 Demo targets loaded:', demoTargets.length, demoTargets)
        setTargets(demoTargets)
        setIsLoading(false)
        return
      }

      const { data, error } = await getTargets({
        storeId: storeId !== 'all' ? storeId : undefined
      })

      if (error) {
        console.error('useTargets getTargets error:', error)
        setTargets([])
        return
      }

      const mapped: TargetData[] = (data ?? []).map(t => ({
        storeId: t.store_id,
        period: t.period,
        targetSales: Number(t.target_sales) || 0,
        targetProfit: Number(t.target_profit) || 0,
        targetProfitMargin: Number(t.target_profit_margin) || 0,
        targetCostRate: Number(t.target_cost_rate) || 0,
        targetLaborRate: Number(t.target_labor_rate) || 0
      }))
      setTargets(mapped)
    } catch (e) {
      console.error('❌ useTargets: エラー:', e)
      setTargets([])
    } finally {
      setIsLoading(false)
    }
  }, [storeId, user, isDemoMode, period, organizationId])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  const calculateTargetMetrics = (
    currentSales: number,
    currentProfit: number,
    targetSales: number,
    targetProfit: number
  ): TargetMetrics => {
    const safe = (n: number, d: number) => (d > 0 ? n / d : 0)
    const salesAchievement = safe(currentSales, targetSales) * 100
    const profitAchievement = safe(currentProfit, targetProfit) * 100
    const remainingSales = Math.max(0, targetSales - currentSales)
    
    // Remaining days in current month
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysRemaining = lastDay - now.getDate()
    
    const requiredDailySales = daysRemaining > 0 ? remainingSales / daysRemaining : 0
    const averageCustomerSpend = 3500 // Average spend per customer
    const requiredCustomers = averageCustomerSpend > 0 ? Math.round(requiredDailySales / averageCustomerSpend) : 0

    return {
      salesAchievement,
      profitAchievement,
      remainingSales,
      requiredDailySales,
      requiredCustomers,
      averageCustomerSpend,
      daysRemaining
    }
  }

  const getTargetForStore = (storeId: string) => {
    return targets.find(t => t.storeId === storeId && t.period === period)
  }

  const getAllStoresTarget = () => {
    console.log('📊 getAllStoresTarget called', { period, targets: targets.length })
    const storeTargets = targets.filter(t => t.period === period)
    console.log('📊 Filtered targets for period', { period, storeTargets: storeTargets.length, targets: storeTargets })
    const agg = storeTargets.reduce((acc, t) => ({
      targetSales: acc.targetSales + t.targetSales,
      targetProfit: acc.targetProfit + t.targetProfit,
      totalCostRate: acc.totalCostRate + t.targetCostRate,
      totalLaborRate: acc.totalLaborRate + t.targetLaborRate
    }), { targetSales: 0, targetProfit: 0, totalCostRate: 0, totalLaborRate: 0 })
    const targetProfitMargin = agg.targetSales > 0 ? (agg.targetProfit / agg.targetSales) * 100 : 0
    const avgCostRate = storeTargets.length > 0 ? agg.totalCostRate / storeTargets.length : 0
    const avgLaborRate = storeTargets.length > 0 ? agg.totalLaborRate / storeTargets.length : 0
    const result = {
      targetSales: agg.targetSales || 0,
      targetProfit: agg.targetProfit || 0,
      targetProfitMargin: targetProfitMargin || 0,
      targetCostRate: avgCostRate || 0,
      targetLaborRate: avgLaborRate || 0,
      targetAverageSpend: 1000
    }
    console.log('📊 getAllStoresTarget result:', result)
    return result
  }

  return {
    targets,
    isLoading,
    getTargetForStore,
    getAllStoresTarget,
    calculateTargetMetrics,
    refetch: fetchTargets
  }
}