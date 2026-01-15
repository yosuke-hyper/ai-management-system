import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKpis, type ExpenseReference } from '../usekpis'
import type { DailyReportData } from '@/types'

describe('useKpis hook - 重要な計算ロジックのテスト', () => {
  const mockReports: DailyReportData[] = [
    {
      id: '1',
      date: '2025-11-16',
      storeId: 'store1',
      storeName: 'Test Store',
      staffName: 'Test Staff',
      operationType: 'lunch',
      sales: 100000,
      purchase: 30000,
      laborCost: 20000,
      utilities: 5000,
      rent: 10000,
      consumables: 2000,
      promotion: 1000,
      cleaning: 500,
      misc: 500,
      communication: 500,
      others: 500,
      customers: 50,
      lunchCustomers: 50,
      dinnerCustomers: 0,
      reportText: 'Test report',
      createdAt: '2025-11-16T00:00:00Z',
    },
    {
      id: '2',
      date: '2025-11-16',
      storeId: 'store1',
      storeName: 'Test Store',
      staffName: 'Test Staff',
      operationType: 'dinner',
      sales: 200000,
      purchase: 60000,
      laborCost: 20000,
      utilities: 5000,
      rent: 10000,
      consumables: 2000,
      promotion: 1000,
      cleaning: 500,
      misc: 500,
      communication: 500,
      others: 500,
      customers: 80,
      lunchCustomers: 0,
      dinnerCustomers: 80,
      reportText: 'Test report',
      createdAt: '2025-11-16T00:00:00Z',
    },
  ]

  describe('基本的な売上計算', () => {
    it('should calculate total sales correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.totalSales).toBe(300000)
    })

    it('should calculate lunch and dinner sales separately', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.lunchSales).toBe(100000)
      expect(result.current.dinnerSales).toBe(200000)
    })

    it('should calculate lunch and dinner customers separately', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.lunchCustomers).toBe(50)
      expect(result.current.dinnerCustomers).toBe(80)
    })

    it('should calculate total customers correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.totalCustomers).toBe(130)
    })

    it('should calculate average ticket price correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // totalSales: 300000, totalCustomers: 130
      // 300000 / 130 = 2307.69 -> Math.round = 2308
      expect(result.current.averageTicket).toBe(2308)
    })

    it('should calculate lunch and dinner average tickets', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.lunchAverageTicket).toBe(2000)
      expect(result.current.dinnerAverageTicket).toBe(2500)
    })
  })

  describe('重要: FL比率（原価率 + 人件費率）計算', () => {
    it('should calculate purchase rate correctly (原価率)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // purchaseTotal: 60000 (max value for the day - 両方同じ日なので最大値を取る)
      // totalSales: 300000
      // purchaseRate: (60000 / 300000) * 100 = 20%
      expect(result.current.purchaseRate).toBe(20)
    })

    it('should calculate labor rate correctly (人件費率)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // laborCost appears in both reports and is summed
      // Total labor: 20000 + 20000 = 40000
      // laborRate: (40000 / 300000) * 100 = 13.33%
      expect(result.current.laborRate).toBeCloseTo(13.33, 1)
    })

    it('should calculate prime cost correctly (FL比率の分子)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // primeCost = purchase + labor
      // purchase: 60000, labor: 40000
      // primeCost: 100000
      expect(result.current.primeCost).toBe(100000)
    })

    it('should calculate prime cost rate correctly (FL比率)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // primeCostRate = (primeCost / totalSales) * 100
      // (100000 / 300000) * 100 = 33.33%
      expect(result.current.primeCostRate).toBeCloseTo(33.33, 1)
    })

    it('should handle zero sales for rates (0除算防止)', () => {
      const zeroSalesReports: DailyReportData[] = [
        { ...mockReports[0], sales: 0 }
      ]
      const { result } = renderHook(() => useKpis(zeroSalesReports))
      expect(result.current.purchaseRate).toBe(0)
      expect(result.current.laborRate).toBe(0)
      expect(result.current.primeCostRate).toBe(0)
    })
  })

  describe('利益計算', () => {
    it('should calculate purchase total correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // Purchase: max value for the day = 60000
      expect(result.current.purchaseTotal).toBe(60000)
    })

    it('should calculate gross profit correctly (粗利益)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // grossProfit = sales - purchase
      // 300000 - 60000 = 240000
      expect(result.current.grossProfit).toBe(240000)
    })

    it('should calculate operating profit correctly (営業利益)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // operatingProfit = sales - totalExpenses
      expect(result.current.operatingProfit).toBeGreaterThan(0)
    })

    it('should calculate profit margin correctly (利益率)', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // profitMargin = (operatingProfit / sales) * 100
      expect(result.current.profitMargin).toBeGreaterThan(0)
      expect(result.current.profitMargin).toBeLessThan(100)
    })

    it('should handle zero sales for profit margin (0除算防止)', () => {
      const zeroSalesReports: DailyReportData[] = [
        { ...mockReports[0], sales: 0 }
      ]
      const { result } = renderHook(() => useKpis(zeroSalesReports))
      expect(result.current.profitMargin).toBe(0)
    })
  })

  describe('参考経費の適用', () => {
    const baselineExpenses: ExpenseReference = {
      laborCost: 15000,
      utilities: 3000,
      rent: 8000,
      consumables: 1500,
      promotion: 800,
      cleaning: 400,
      misc: 400,
      communication: 400,
      others: 400,
      sumOther: 14900,
      totalExpense: 29900
    }

    it('should use baseline expenses when no expense data in reports', () => {
      const reportsWithoutExpenses: DailyReportData[] = [
        {
          ...mockReports[0],
          laborCost: 0,
          utilities: 0,
          rent: 0,
          consumables: 0,
          promotion: 0,
          cleaning: 0,
          misc: 0,
          communication: 0,
          others: 0
        }
      ]
      const { result } = renderHook(() => useKpis(reportsWithoutExpenses, undefined, baselineExpenses))
      // Should use baseline expenses
      expect(result.current.totalExpenses).toBeGreaterThan(0)
    })

    it('should prioritize reported expenses over baseline', () => {
      const { result } = renderHook(() => useKpis(mockReports, undefined, baselineExpenses))
      // Should use actual reported expenses, not baseline
      expect(result.current.laborTotal).toBeGreaterThan(0)
    })
  })

  describe('期間比較（前期比）', () => {
    const previousReports: DailyReportData[] = [
      {
        ...mockReports[0],
        sales: 80000,
        purchase: 24000,
        laborCost: 16000
      },
      {
        ...mockReports[1],
        sales: 160000,
        purchase: 48000,
        laborCost: 16000
      }
    ]

    it('should calculate sales growth correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports, previousReports))
      // Current: 300000, Previous: 240000
      // Growth: ((300000 - 240000) / 240000) * 100 = 25%
      expect(result.current.salesGrowth).toBeCloseTo(25, 0)
    })

    it('should calculate profit growth correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports, previousReports))
      expect(result.current.profitGrowth).toBeDefined()
    })

    it('should handle zero previous sales gracefully', () => {
      const zeroPreviousReports: DailyReportData[] = [
        { ...mockReports[0], sales: 0 }
      ]
      const { result } = renderHook(() => useKpis(mockReports, zeroPreviousReports))
      expect(result.current.salesGrowth).toBe(0)
    })
  })

  describe('エッジケース', () => {
    it('should handle empty reports', () => {
      const { result } = renderHook(() => useKpis([]))
      expect(result.current.totalSales).toBe(0)
      expect(result.current.purchaseTotal).toBe(0)
      expect(result.current.grossProfit).toBe(0)
      expect(result.current.totalCustomers).toBe(0)
      expect(result.current.purchaseRate).toBe(0)
      expect(result.current.laborRate).toBe(0)
      expect(result.current.primeCostRate).toBe(0)
    })

    it('should handle reports with no customers (客単価計算)', () => {
      const reportsNoCustomers: DailyReportData[] = [
        {
          ...mockReports[0],
          customers: 0,
          lunchCustomers: 0,
        },
      ]
      const { result } = renderHook(() => useKpis(reportsNoCustomers))
      expect(result.current.averageTicket).toBe(0)
      expect(result.current.lunchAverageTicket).toBe(0)
    })

    it('should handle negative sales gracefully', () => {
      const negativeSalesReports: DailyReportData[] = [
        { ...mockReports[0], sales: -10000 }
      ]
      const { result } = renderHook(() => useKpis(negativeSalesReports))
      expect(result.current.totalSales).toBe(-10000)
    })

    it('should handle very large numbers', () => {
      const largeReports: DailyReportData[] = [
        { ...mockReports[0], sales: 10000000, purchase: 3000000 }
      ]
      const { result } = renderHook(() => useKpis(largeReports))
      expect(result.current.totalSales).toBe(10000000)
      expect(result.current.purchaseTotal).toBe(3000000)
    })

    it('should handle multiple stores on same day', () => {
      const multiStoreReports: DailyReportData[] = [
        { ...mockReports[0], storeId: 'store1', sales: 100000 },
        { ...mockReports[0], storeId: 'store2', sales: 150000 }
      ]
      const { result } = renderHook(() => useKpis(multiStoreReports))
      expect(result.current.totalSales).toBe(250000)
    })
  })

  describe('日数とレポート集計', () => {
    it('should count lunch and dinner report days', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      expect(result.current.lunchReportCount).toBe(1)
      expect(result.current.dinnerReportCount).toBe(1)
    })

    it('should calculate average daily sales correctly', () => {
      const { result } = renderHook(() => useKpis(mockReports))
      // Total sales: 300000, Days: 1
      expect(result.current.averageDailySales).toBe(300000)
    })

    it('should handle multiple days correctly', () => {
      const multiDayReports: DailyReportData[] = [
        { ...mockReports[0], date: '2025-11-16' },
        { ...mockReports[0], date: '2025-11-17' },
        { ...mockReports[0], date: '2025-11-18' }
      ]
      const { result } = renderHook(() => useKpis(multiDayReports))
      expect(result.current.reportCount).toBe(3)
    })
  })

  describe('未来日付の処理', () => {
    it('should not apply baseline expenses for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const futureReports: DailyReportData[] = [
        {
          ...mockReports[0],
          date: futureDate.toISOString().split('T')[0],
          sales: 100000,
          purchase: 30000,
          laborCost: 0,
          utilities: 0,
          rent: 0,
          consumables: 0,
          promotion: 0,
          cleaning: 0,
          misc: 0,
          communication: 0,
          others: 0
        }
      ]
      const baseline: ExpenseReference = {
        laborCost: 20000,
        utilities: 5000,
        rent: 10000,
        consumables: 2000,
        promotion: 1000,
        cleaning: 500,
        misc: 500,
        communication: 500,
        others: 500,
        sumOther: 20500,
        totalExpense: 40500
      }
      const { result } = renderHook(() => useKpis(futureReports, undefined, baseline))
      // Future dates should not use baseline expenses, only reported expenses
      // Only purchase should be counted: 30000
      expect(result.current.totalExpenses).toBe(30000)
    })
  })
})
