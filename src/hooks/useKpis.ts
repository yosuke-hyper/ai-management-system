import { useMemo } from 'react'
import { DailyReportData } from '@/types'

export interface KPIData {
  totalSales: number
  totalExpenses: number
  grossProfit: number
  operatingProfit: number
  profitMargin: number
  reportCount: number
  averageDailySales: number
  salesGrowth?: number
  profitGrowth?: number
  // ▼ 追加
  purchaseTotal: number
  laborTotal: number
  purchaseRate: number
  laborRate: number
  primeCost: number
  primeCostRate: number
  estimatedCustomers: number
  averageTicket: number
  totalCustomers: number
}

export const useKpis = (reports: DailyReportData[], previousReports?: DailyReportData[]) => {
  return useMemo(() => {
    if (reports.length === 0) {
      return {
        totalSales: 0,
        totalExpenses: 0,
        grossProfit: 0,
        operatingProfit: 0,
        profitMargin: 0,
        reportCount: 0,
        averageDailySales: 0,
        salesGrowth: 0,
        profitGrowth: 0,
        // 追加分
        purchaseTotal: 0,
        laborTotal: 0,
        purchaseRate: 0,
        laborRate: 0,
        primeCost: 0,
        primeCostRate: 0,
        estimatedCustomers: 0,
        averageTicket: 0,
        totalCustomers: 0,
      }
    }

    const totals = reports.reduce((acc, r) => {
      const totalExpenses = r.purchase + r.laborCost + r.utilities + (r.rent || 0) + (r.consumables || 0) + r.promotion + r.cleaning + r.misc + r.communication + r.others
      acc.sales += r.sales
      acc.expenses += totalExpenses
      acc.purchase += r.purchase
      acc.labor += r.laborCost
      acc.customers += r.customers || 0
      acc.count += 1
      return acc
    }, { sales: 0, expenses: 0, purchase: 0, labor: 0, customers: 0, count: 0 })

    const grossProfit = totals.sales - totals.purchase
    const operatingProfit = totals.sales - totals.expenses
    const profitMargin = totals.sales > 0 ? (operatingProfit / totals.sales) * 100 : 0
    const averageDailySales = totals.count > 0 ? totals.sales / totals.count : 0

    // 追加KPI
    const purchaseRate = totals.sales > 0 ? (totals.purchase / totals.sales) * 100 : 0
    const laborRate = totals.sales > 0 ? (totals.labor / totals.sales) * 100 : 0
    const primeCost = totals.purchase + totals.labor
    const primeCostRate = totals.sales > 0 ? (primeCost / totals.sales) * 100 : 0

    // 実際の客数データから客単価を計算
    const totalCustomers = totals.customers
    const averageTicket = totalCustomers > 0 ? Math.round(totals.sales / totalCustomers) : 0
    const estimatedCustomers = totalCustomers

    // 前期間比較
    let salesGrowth = 0
    let profitGrowth = 0
    if (previousReports && previousReports.length > 0) {
      const prevTotals = previousReports.reduce((acc, r) => {
        const totalExpenses = r.purchase + r.laborCost + r.utilities + (r.rent || 0) + (r.consumables || 0) + r.promotion + r.cleaning + r.misc + r.communication + r.others
        acc.sales += r.sales
        acc.profit += (r.sales - totalExpenses)
        return acc
      }, { sales: 0, profit: 0 })
      salesGrowth = prevTotals.sales > 0 ? ((totals.sales - prevTotals.sales) / prevTotals.sales) * 100 : 0
      profitGrowth = prevTotals.profit > 0 ? ((operatingProfit - prevTotals.profit) / prevTotals.profit) * 100 : 0
    }

    return {
      totalSales: totals.sales,
      totalExpenses: totals.expenses,
      grossProfit,
      operatingProfit,
      profitMargin,
      reportCount: totals.count,
      averageDailySales,
      salesGrowth,
      profitGrowth,
      // 追加分
      purchaseTotal: totals.purchase,
      laborTotal: totals.labor,
      purchaseRate,
      laborRate,
      primeCost,
      primeCostRate,
      estimatedCustomers,
      averageTicket,
      totalCustomers
    }
  }, [reports, previousReports])
}