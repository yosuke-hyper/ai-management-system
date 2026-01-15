import { describe, it, expect } from 'vitest'
import {
  calculateGrossProfit,
  calculateOperatingProfit,
  calculateProfitMargin,
  calculateTotalExpenses,
  generateSummaryFromReports,
  formatDate,
  formatCurrency,
  formatPercent,
} from '../calculations'
import type { DailyReport } from '@/types'

describe('calculations utilities', () => {
  describe('calculateGrossProfit', () => {
    it('should calculate gross profit correctly', () => {
      expect(calculateGrossProfit(1000, 300)).toBe(700)
      expect(calculateGrossProfit(5000, 2000)).toBe(3000)
      expect(calculateGrossProfit(0, 0)).toBe(0)
    })

    it('should handle negative values', () => {
      expect(calculateGrossProfit(1000, 1500)).toBe(-500)
      expect(calculateGrossProfit(-1000, 300)).toBe(-1300)
    })

    it('should round the result', () => {
      expect(calculateGrossProfit(1000.7, 300.3)).toBe(700)
      expect(calculateGrossProfit(1234.9, 567.1)).toBe(668)
    })

    it('should handle very large numbers', () => {
      expect(calculateGrossProfit(10000000, 3000000)).toBe(7000000)
      expect(calculateGrossProfit(999999999, 111111111)).toBe(888888888)
    })

    it('should handle decimal precision', () => {
      expect(calculateGrossProfit(1000.49, 300.49)).toBe(700)
      expect(calculateGrossProfit(1000.51, 300.51)).toBe(700)
    })
  })

  describe('calculateOperatingProfit', () => {
    it('should calculate operating profit correctly', () => {
      expect(calculateOperatingProfit(1000, 600)).toBe(400)
      expect(calculateOperatingProfit(5000, 3500)).toBe(1500)
    })

    it('should handle zero values', () => {
      expect(calculateOperatingProfit(0, 0)).toBe(0)
      expect(calculateOperatingProfit(1000, 0)).toBe(1000)
    })

    it('should handle negative operating profit', () => {
      expect(calculateOperatingProfit(1000, 1100)).toBe(-100)
    })

    it('should round the result', () => {
      expect(calculateOperatingProfit(1000.7, 400.3)).toBe(600)
    })

    it('should handle very large numbers', () => {
      expect(calculateOperatingProfit(10000000, 8000000)).toBe(2000000)
    })

    it('should handle expenses exceeding sales', () => {
      expect(calculateOperatingProfit(1000, 2000)).toBe(-1000)
      expect(calculateOperatingProfit(0, 1000)).toBe(-1000)
    })
  })

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      expect(calculateProfitMargin(400, 1000)).toBe(40)
      expect(calculateProfitMargin(1500, 5000)).toBe(30)
    })

    it('should handle zero sales (防止ゼロ除算)', () => {
      expect(calculateProfitMargin(400, 0)).toBe(0)
      expect(calculateProfitMargin(0, 0)).toBe(0)
      expect(calculateProfitMargin(-100, 0)).toBe(0)
    })

    it('should handle negative profit margins', () => {
      expect(calculateProfitMargin(-100, 1000)).toBe(-10)
      expect(calculateProfitMargin(-500, 1000)).toBe(-50)
    })

    it('should return percentage value', () => {
      expect(calculateProfitMargin(250, 1000)).toBe(25)
      expect(calculateProfitMargin(75, 300)).toBe(25)
    })

    it('should handle decimal precision', () => {
      expect(calculateProfitMargin(333, 1000)).toBeCloseTo(33.3, 1)
      expect(calculateProfitMargin(666, 1000)).toBeCloseTo(66.6, 1)
    })

    it('should handle 100% profit margin', () => {
      expect(calculateProfitMargin(1000, 1000)).toBe(100)
    })

    it('should handle greater than 100% profit margin', () => {
      expect(calculateProfitMargin(1500, 1000)).toBe(150)
    })
  })

  describe('calculateTotalExpenses (重要: 経費合計)', () => {
    const mockReport: DailyReport = {
      id: '1',
      date: '2025-12-01',
      storeId: 'store1',
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
      others: 500
    }

    it('should calculate total expenses correctly', () => {
      const total = calculateTotalExpenses(mockReport)
      // 30000 + 20000 + 5000 + 10000 + 2000 + 1000 + 500 + 500 + 500 + 500 = 70000
      expect(total).toBe(70000)
    })

    it('should handle zero values', () => {
      const zeroReport: DailyReport = {
        ...mockReport,
        purchase: 0,
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
      expect(calculateTotalExpenses(zeroReport)).toBe(0)
    })

    it('should handle partial expenses', () => {
      const partialReport: DailyReport = {
        ...mockReport,
        purchase: 10000,
        laborCost: 5000,
        utilities: 0,
        rent: 0,
        consumables: 0,
        promotion: 0,
        cleaning: 0,
        misc: 0,
        communication: 0,
        others: 0
      }
      expect(calculateTotalExpenses(partialReport)).toBe(15000)
    })

    it('should handle very large expenses', () => {
      const largeReport: DailyReport = {
        ...mockReport,
        purchase: 1000000,
        laborCost: 500000,
        utilities: 100000,
        rent: 200000,
        consumables: 50000,
        promotion: 30000,
        cleaning: 10000,
        misc: 10000,
        communication: 10000,
        others: 10000
      }
      expect(calculateTotalExpenses(largeReport)).toBe(1920000)
    })
  })

  describe('generateSummaryFromReports', () => {
    const mockReports: DailyReport[] = [
      {
        id: '1',
        date: '2025-12-01',
        storeId: 'store1',
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
        others: 500
      },
      {
        id: '2',
        date: '2025-12-01',
        storeId: 'store2',
        sales: 150000,
        purchase: 45000,
        laborCost: 30000,
        utilities: 7000,
        rent: 15000,
        consumables: 3000,
        promotion: 1500,
        cleaning: 750,
        misc: 750,
        communication: 750,
        others: 750
      }
    ]

    it('should generate summary correctly', () => {
      const summary = generateSummaryFromReports(mockReports)
      expect(summary).toHaveLength(1)
      expect(summary[0].period).toBe('2025-12-01')
      expect(summary[0].totalSales).toBe(250000)
      // Total expenses = purchase + laborCost + utilities + rent + consumables + promotion + cleaning + misc + communication + others
      // Store1: 30000+20000+5000+10000+2000+1000+500+500+500+500 = 70000
      // Store2: 45000+30000+7000+15000+3000+1500+750+750+750+750 = 104500
      // Total: 174500
      expect(summary[0].totalExpenses).toBe(174500)
    })

    it('should calculate gross profit in summary', () => {
      const summary = generateSummaryFromReports(mockReports)
      // grossProfit = sales - purchase = 250000 - 75000 = 175000
      expect(summary[0].grossProfit).toBe(175000)
    })

    it('should calculate operating profit in summary', () => {
      const summary = generateSummaryFromReports(mockReports)
      // operatingProfit = sales - totalExpenses = 250000 - 174500 = 75500
      expect(summary[0].operatingProfit).toBe(75500)
    })

    it('should calculate profit margin in summary', () => {
      const summary = generateSummaryFromReports(mockReports)
      // profitMargin = (75500 / 250000) * 100 = 30.2%
      expect(summary[0].profitMargin).toBeCloseTo(30.2, 1)
    })

    it('should handle empty reports', () => {
      const summary = generateSummaryFromReports([])
      expect(summary).toHaveLength(0)
    })

    it('should group by date correctly', () => {
      const multiDateReports: DailyReport[] = [
        { ...mockReports[0], date: '2025-12-01' },
        { ...mockReports[0], date: '2025-12-02' },
        { ...mockReports[0], date: '2025-12-03' }
      ]
      const summary = generateSummaryFromReports(multiDateReports)
      expect(summary).toHaveLength(3)
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const formatted = formatDate('2025-12-01')
      expect(formatted).toMatch(/2025/)
      expect(formatted).toMatch(/12/)
      expect(formatted).toMatch(/1/)
    })

    it('should handle different date formats', () => {
      expect(formatDate('2025-01-15')).toBeTruthy()
      expect(formatDate('2025-12-31')).toBeTruthy()
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000)).toContain('1,000')
      expect(formatCurrency(1000000)).toContain('1,000,000')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toContain('0')
    })

    it('should handle negative values', () => {
      const formatted = formatCurrency(-1000)
      expect(formatted).toContain('1,000')
    })

    it('should include yen symbol', () => {
      const formatted = formatCurrency(1000)
      // Japanese yen symbol can be ¥ (半角), ￥ (全角), or 円
      expect(formatted).toMatch(/[¥￥円]/)
    })
  })

  describe('formatPercent', () => {
    it('should format percent correctly', () => {
      expect(formatPercent(25.5)).toBe('25.5%')
      expect(formatPercent(100)).toBe('100.0%')
    })

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0.0%')
    })

    it('should handle negative percentages', () => {
      expect(formatPercent(-10.5)).toBe('-10.5%')
    })

    it('should format with one decimal place', () => {
      expect(formatPercent(33.333)).toBe('33.3%')
      expect(formatPercent(66.666)).toBe('66.7%')
    })
  })
})
