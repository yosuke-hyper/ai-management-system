import { useState, useEffect } from 'react'
import { getTargets } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  const { user } = useAuth()

  useEffect(() => {
    const fetchTargets = async () => {
      if (!user) return

      try {
        setIsLoading(true)
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
          targetSales: t.target_sales,
          targetProfit: t.target_profit,
          targetProfitMargin: t.target_profit_margin,
          targetCostRate: t.target_cost_rate || 0,
          targetLaborRate: t.target_labor_rate || 0
        }))
        setTargets(mapped)
      } catch (e) {
        console.error('❌ useTargets: エラー:', e)
        setTargets([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTargets()
  }, [storeId, user])

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
    const requiredCustomers = requiredDailySales / averageCustomerSpend

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
    const storeTargets = targets.filter(t => t.period === period)
    const agg = storeTargets.reduce((acc, t) => ({
      targetSales: acc.targetSales + t.targetSales,
      targetProfit: acc.targetProfit + t.targetProfit,
      totalCostRate: acc.totalCostRate + t.targetCostRate,
      totalLaborRate: acc.totalLaborRate + t.targetLaborRate
    }), { targetSales: 0, targetProfit: 0, totalCostRate: 0, totalLaborRate: 0 })
    const targetProfitMargin = agg.targetSales > 0 ? (agg.targetProfit / agg.targetSales) * 100 : 0
    const avgCostRate = storeTargets.length > 0 ? agg.totalCostRate / storeTargets.length : 0
    const avgLaborRate = storeTargets.length > 0 ? agg.totalLaborRate / storeTargets.length : 0
    return {
      targetSales: agg.targetSales,
      targetProfit: agg.targetProfit,
      targetProfitMargin,
      targetCostRate: avgCostRate,
      targetLaborRate: avgLaborRate
    }
  }

  return {
    targets,
    isLoading,
    getTargetForStore,
    getAllStoresTarget,
    calculateTargetMetrics
  }
}