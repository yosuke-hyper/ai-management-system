import { useMemo } from 'react'
import { DailyReportData, OperationType } from '@/types'

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
  purchaseTotal: number
  laborTotal: number
  purchaseRate: number
  laborRate: number
  primeCost: number
  primeCostRate: number
  estimatedCustomers: number
  averageTicket: number
  totalCustomers: number
  lunchSales: number
  dinnerSales: number
  lunchReportCount: number
  dinnerReportCount: number
  lunchCustomers: number
  dinnerCustomers: number
  lunchAverageTicket: number
  dinnerAverageTicket: number
}

export interface ExpenseReference {
  laborCost: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  sumOther: number
  totalExpense: number
}

export const useKpis = (
  reports: DailyReportData[],
  previousReports?: DailyReportData[],
  expenseBaseline?: ExpenseReference,
  dateRangeEnd?: Date
) => {
  return useMemo(() => {
    // 今日の日付（時刻は00:00:00にリセット）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 終了日が指定されている場合、今日との比較で小さい方を使用
    const effectiveEndDate = dateRangeEnd ? new Date(Math.min(dateRangeEnd.getTime(), today.getTime())) : today

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
        purchaseTotal: 0,
        laborTotal: 0,
        purchaseRate: 0,
        laborRate: 0,
        primeCost: 0,
        primeCostRate: 0,
        estimatedCustomers: 0,
        averageTicket: 0,
        totalCustomers: 0,
        lunchSales: 0,
        dinnerSales: 0,
        lunchReportCount: 0,
        dinnerReportCount: 0,
        lunchCustomers: 0,
        dinnerCustomers: 0,
        lunchAverageTicket: 0,
        dinnerAverageTicket: 0,
      }
    }

    // 日付・店舗でグループ化（経費の二重計上を防ぐ）
    const dailyGroups = new Map<string, {
      date: string
      storeId: string
      sales: number
      purchase: number
      customers: number
      lunchSales: number
      dinnerSales: number
      lunchCustomers: number
      dinnerCustomers: number
      hasLaborCost: boolean
      hasOtherExpenses: boolean
      reportedLaborCost: number
      reportedOtherExpenses: number
    }>()

    // 第1段階: 日付・店舗ごとに売上と仕入を集計
    reports.forEach(r => {
      const key = `${r.date}-${r.storeId}`

      if (!dailyGroups.has(key)) {
        dailyGroups.set(key, {
          date: r.date,
          storeId: r.storeId,
          sales: 0,
          purchase: 0,
          customers: 0,
          lunchSales: 0,
          dinnerSales: 0,
          lunchCustomers: 0,
          dinnerCustomers: 0,
          hasLaborCost: false,
          hasOtherExpenses: false,
          reportedLaborCost: 0,
          reportedOtherExpenses: 0
        })
      }

      const group = dailyGroups.get(key)!

      // 売上を集計
      group.sales += r.sales

      // 仕入れは1日分の合計なので、購入値がある場合は最大値を使用
      // （ランチとディナーで同じ値が入っているはずだが、念のため）
      if (r.purchase > 0) {
        group.purchase = Math.max(group.purchase, r.purchase)
      }

      group.customers += r.customers || 0

      // 営業時間帯別の売上と客数
      if (r.operationType === 'lunch') {
        group.lunchSales += r.sales
        group.lunchCustomers += r.customers || 0
      } else if (r.operationType === 'dinner') {
        group.dinnerSales += r.sales
        group.dinnerCustomers += r.customers || 0
      } else if (r.operationType === 'full_day') {
        group.dinnerSales += r.sales
        group.dinnerCustomers += r.customers || 0
      }

      // 日報データに経費がある場合は集計
      if (r.laborCost && r.laborCost > 0) {
        group.hasLaborCost = true
        group.reportedLaborCost += r.laborCost
      }

      const otherExpenses =
        (r.utilities || 0) +
        (r.rent || 0) +
        (r.consumables || 0) +
        (r.promotion || 0) +
        (r.cleaning || 0) +
        (r.misc || 0) +
        (r.communication || 0) +
        (r.others || 0)

      if (otherExpenses > 0) {
        group.hasOtherExpenses = true
        group.reportedOtherExpenses += otherExpenses
      }
    })

    // 第2段階: グループ化されたデータから合計を計算
    const totals = Array.from(dailyGroups.values()).reduce((acc, group) => {
      // 未来の日付は参考経費を適用しない（日報データがある場合は含める）
      const groupDate = new Date(group.date)
      groupDate.setHours(0, 0, 0, 0)
      const isFutureDate = groupDate > effectiveEndDate

      // 経費計算（1日あたり1回のみ）
      // 未来の日付で日報データがない場合は参考経費を0とする
      const laborCost = group.hasLaborCost
        ? group.reportedLaborCost
        : (isFutureDate ? 0 : (expenseBaseline?.laborCost || 0))

      // その他の経費も未来の日付では適用しない
      const otherExpenses = group.hasOtherExpenses
        ? group.reportedOtherExpenses
        : (isFutureDate ? 0 : (
            (expenseBaseline?.utilities || 0) +
            (expenseBaseline?.rent || 0) +
            (expenseBaseline?.consumables || 0) +
            (expenseBaseline?.promotion || 0) +
            (expenseBaseline?.cleaning || 0) +
            (expenseBaseline?.misc || 0) +
            (expenseBaseline?.communication || 0) +
            (expenseBaseline?.others || 0)
          ))

      const totalExpenses = group.purchase + laborCost + otherExpenses

      acc.sales += group.sales
      acc.expenses += totalExpenses
      acc.purchase += group.purchase
      acc.labor += laborCost
      acc.customers += group.customers
      acc.count += 1 // 日数をカウント

      acc.lunchSales += group.lunchSales
      acc.dinnerSales += group.dinnerSales
      acc.lunchCustomers += group.lunchCustomers
      acc.dinnerCustomers += group.dinnerCustomers

      // ランチとディナーのレポート件数（日数ベース）
      if (group.lunchSales > 0) acc.lunchCount += 1
      if (group.dinnerSales > 0) acc.dinnerCount += 1

      return acc
    }, {
      sales: 0,
      expenses: 0,
      purchase: 0,
      labor: 0,
      customers: 0,
      count: 0,
      lunchSales: 0,
      dinnerSales: 0,
      lunchCount: 0,
      dinnerCount: 0,
      lunchCustomers: 0,
      dinnerCustomers: 0
    })

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

    // Calculate lunch and dinner average tickets
    const lunchAverageTicket = totals.lunchCustomers > 0 ? Math.round(totals.lunchSales / totals.lunchCustomers) : 0
    const dinnerAverageTicket = totals.dinnerCustomers > 0 ? Math.round(totals.dinnerSales / totals.dinnerCustomers) : 0

    // 前期間比較
    let salesGrowth = 0
    let profitGrowth = 0
    if (previousReports && previousReports.length > 0) {
      const prevTotals = previousReports.reduce((acc, r) => {
        const totalExpenses = (r.purchase || 0) + (r.laborCost || 0) + (r.utilities || 0) + (r.rent || 0) + (r.consumables || 0) + (r.promotion || 0) + (r.cleaning || 0) + (r.misc || 0) + (r.communication || 0) + (r.others || 0)
        acc.sales += r.sales || 0
        acc.profit += ((r.sales || 0) - totalExpenses)
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
      purchaseTotal: totals.purchase,
      laborTotal: totals.labor,
      purchaseRate,
      laborRate,
      primeCost,
      primeCostRate,
      estimatedCustomers,
      averageTicket,
      totalCustomers,
      lunchSales: totals.lunchSales,
      dinnerSales: totals.dinnerSales,
      lunchReportCount: totals.lunchCount,
      dinnerReportCount: totals.dinnerCount,
      lunchCustomers: totals.lunchCustomers,
      dinnerCustomers: totals.dinnerCustomers,
      lunchAverageTicket,
      dinnerAverageTicket
    }
  }, [reports, previousReports, expenseBaseline, dateRangeEnd])
}