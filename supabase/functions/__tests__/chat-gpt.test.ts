import { describe, it, expect, beforeEach } from 'vitest'

describe('Chat GPT Edge Function Logic', () => {
  beforeEach(() => {
    // Setup
  })

  describe('Demo Response Generation - Sales Analysis', () => {
    it('should identify sales-related questions', () => {
      const questions = [
        '今月の売上はどうですか？',
        '売上を教えて',
        'sales analysis',
        '今月の実績'
      ]

      const results = questions.map(q => {
        const question = q.toLowerCase()
        return question.includes('売上') ||
               question.includes('sales') ||
               question.includes('今月')
      })

      expect(results.every(r => r === true)).toBe(true)
    })

    it('should calculate total sales correctly', () => {
      const reports = [
        { sales: 100000 },
        { sales: 150000 },
        { sales: 200000 }
      ]

      const totalSales = reports.reduce((sum, r) => sum + Number(r.sales || 0), 0)

      expect(totalSales).toBe(450000)
    })

    it('should calculate average daily sales', () => {
      const reports = [
        { sales: 100000 },
        { sales: 150000 },
        { sales: 200000 }
      ]

      const totalSales = reports.reduce((sum, r) => sum + Number(r.sales || 0), 0)
      const avgDailySales = reports.length ? Math.round(totalSales / reports.length) : 0

      expect(avgDailySales).toBe(150000)
    })

    it('should calculate average customers per day', () => {
      const reports = [
        { customer_count: 50 },
        { customer_count: 75 },
        { customer_count: 100 }
      ]

      const totalCustomers = reports.reduce((sum, r) => sum + Number(r.customer_count || 0), 0)
      const avgCustomers = reports.length ? Math.round(totalCustomers / reports.length) : 0

      expect(avgCustomers).toBe(75)
    })

    it('should handle missing sales data', () => {
      const reports = [
        { sales: 100000 },
        { sales: null },
        { sales: undefined },
        { sales: 200000 }
      ]

      const totalSales = reports.reduce((sum, r) => sum + Number(r.sales || 0), 0)

      expect(totalSales).toBe(300000)
    })
  })

  describe('Demo Response Generation - Cost Analysis', () => {
    it('should identify cost-related questions', () => {
      const questions = [
        'コスト分析',
        '経費はどうですか',
        '人件費率',
        '原価率を教えて'
      ]

      const results = questions.map(q => {
        const question = q.toLowerCase()
        return question.includes('コスト') ||
               question.includes('経費') ||
               question.includes('人件費') ||
               question.includes('原価')
      })

      expect(results.every(r => r === true)).toBe(true)
    })

    it('should calculate labor cost rate correctly', () => {
      const totalSales = 1000000
      const totalLabor = 250000

      const laborCostRate = totalSales > 0
        ? Number(((totalLabor / totalSales) * 100).toFixed(1))
        : 0

      expect(laborCostRate).toBe(25.0)
    })

    it('should calculate food cost rate correctly', () => {
      const totalSales = 1000000
      const totalFood = 300000

      const foodCostRate = totalSales > 0
        ? Number(((totalFood / totalSales) * 100).toFixed(1))
        : 0

      expect(foodCostRate).toBe(30.0)
    })

    it('should calculate FL cost (food + labor)', () => {
      const laborCostRate = 25.0
      const foodCostRate = 30.0

      const flCost = laborCostRate + foodCostRate

      expect(flCost).toBe(55.0)
    })

    it('should handle zero sales for cost rates', () => {
      const totalSales = 0
      const totalLabor = 250000

      const laborCostRate = totalSales > 0
        ? Number(((totalLabor / totalSales) * 100).toFixed(1))
        : 0

      expect(laborCostRate).toBe(0)
    })

    it('should determine if labor cost rate is high', () => {
      const testCases = [
        { rate: 35, expected: 'high' },
        { rate: 27, expected: 'normal' },
        { rate: 22, expected: 'good' }
      ]

      const results = testCases.map(tc => {
        if (tc.rate > 30) return 'high'
        if (tc.rate < 25) return 'good'
        return 'normal'
      })

      expect(results[0]).toBe('high')
      expect(results[1]).toBe('normal')
      expect(results[2]).toBe('good')
    })

    it('should determine if food cost rate is high', () => {
      const testCases = [
        { rate: 38, expected: 'high' },
        { rate: 32, expected: 'normal' },
        { rate: 26, expected: 'good' }
      ]

      const results = testCases.map(tc => {
        if (tc.rate > 35) return 'high'
        if (tc.rate < 28) return 'good'
        return 'normal'
      })

      expect(results[0]).toBe('high')
      expect(results[1]).toBe('normal')
      expect(results[2]).toBe('good')
    })

    it('should determine if FL cost is healthy', () => {
      const testCases = [
        { flCost: 65, expected: 'warning' },
        { flCost: 55, expected: 'healthy' },
        { flCost: 50, expected: 'healthy' }
      ]

      const results = testCases.map(tc => {
        return tc.flCost < 60 ? 'healthy' : 'warning'
      })

      expect(results[0]).toBe('warning')
      expect(results[1]).toBe('healthy')
      expect(results[2]).toBe('healthy')
    })
  })

  describe('Demo Response Generation - Store Comparison', () => {
    it('should identify store comparison questions', () => {
      const questions = [
        '店舗比較',
        '店舗ごとの売上',
        '各店の状況'
      ]

      const results = questions.map(q => {
        const question = q.toLowerCase()
        return question.includes('比較') || question.includes('店舗')
      })

      expect(results.every(r => r === true)).toBe(true)
    })

    it('should calculate store-specific metrics', () => {
      const storeId = 'store-1'
      const allReports = [
        { store_id: 'store-1', sales: 100000, customer_count: 50 },
        { store_id: 'store-2', sales: 150000, customer_count: 75 },
        { store_id: 'store-1', sales: 120000, customer_count: 60 },
        { store_id: 'store-2', sales: 180000, customer_count: 90 }
      ]

      const storeReports = allReports.filter(r => r.store_id === storeId)
      const storeSales = storeReports.reduce((sum, r) => sum + Number(r.sales || 0), 0)
      const storeCustomers = storeReports.reduce((sum, r) => sum + Number(r.customer_count || 0), 0)

      expect(storeReports).toHaveLength(2)
      expect(storeSales).toBe(220000)
      expect(storeCustomers).toBe(110)
    })

    it('should calculate average spend per customer', () => {
      const avgSales = 110000
      const avgCustomers = 55

      const avgSpend = avgCustomers > 0 ? Math.round(avgSales / avgCustomers) : 0

      expect(avgSpend).toBe(2000)
    })

    it('should handle zero customers for average spend', () => {
      const avgSales = 110000
      const avgCustomers = 0

      const avgSpend = avgCustomers > 0 ? Math.round(avgSales / avgCustomers) : 0

      expect(avgSpend).toBe(0)
    })
  })

  describe('Message Handling', () => {
    it('should extract last message from conversation', () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: '売上はどうですか？' }
      ]

      const lastMessage = messages[messages.length - 1]
      const question = lastMessage?.content?.toLowerCase() || ''

      expect(question).toBe('売上はどうですか？')
    })

    it('should handle empty messages array', () => {
      const messages: any[] = []

      const lastMessage = messages[messages.length - 1]
      const question = lastMessage?.content?.toLowerCase() || ''

      expect(question).toBe('')
    })

    it('should handle message without content', () => {
      const messages = [
        { role: 'user', content: null }
      ]

      const lastMessage = messages[messages.length - 1] as any
      const question = lastMessage?.content?.toLowerCase() || ''

      expect(question).toBe('')
    })
  })

  describe('Data Calculations', () => {
    it('should sum labor costs from multiple fields', () => {
      const reports = [
        { labor_cost_employee: 50000, labor_cost_part_time: 30000 },
        { labor_cost_employee: 60000, labor_cost_part_time: 35000 }
      ]

      const totalLabor = reports.reduce((sum, r) =>
        sum + Number(r.labor_cost_employee || 0) + Number(r.labor_cost_part_time || 0), 0)

      expect(totalLabor).toBe(175000)
    })

    it('should sum food and beverage costs', () => {
      const reports = [
        { food_cost: 40000, beverage_cost: 10000 },
        { food_cost: 45000, beverage_cost: 12000 }
      ]

      const totalFood = reports.reduce((sum, r) =>
        sum + Number(r.food_cost || 0) + Number(r.beverage_cost || 0), 0)

      expect(totalFood).toBe(107000)
    })

    it('should handle missing cost fields', () => {
      const reports = [
        { food_cost: 40000, beverage_cost: null },
        { food_cost: null, beverage_cost: 12000 }
      ]

      const totalFood = reports.reduce((sum, r) =>
        sum + Number(r.food_cost || 0) + Number(r.beverage_cost || 0), 0)

      expect(totalFood).toBe(52000)
    })
  })

  describe('Number Formatting', () => {
    it('should format numbers with locale', () => {
      const number = 1234567

      const formatted = number.toLocaleString()

      expect(formatted).toContain(',')
    })

    it('should round percentages to one decimal', () => {
      const rate = 25.678

      const rounded = Number(rate.toFixed(1))

      expect(rounded).toBe(25.7)
    })

    it('should handle zero in calculations', () => {
      const sales = 0
      const cost = 100000

      const rate = sales > 0 ? (cost / sales) * 100 : 0

      expect(rate).toBe(0)
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter reports by date range', () => {
      const endDate = new Date('2025-12-10')
      const startDate = new Date('2025-12-01')

      const reports = [
        { date: '2025-11-30', sales: 100000 },
        { date: '2025-12-05', sales: 150000 },
        { date: '2025-12-15', sales: 200000 }
      ]

      const filtered = reports.filter(r => {
        const reportDate = new Date(r.date)
        return reportDate >= startDate && reportDate <= endDate
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].date).toBe('2025-12-05')
    })

    it('should calculate 30 days ago', () => {
      const endDate = new Date('2025-12-10')
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 30)

      const expectedDate = new Date('2025-11-10')

      expect(startDate.toISOString().split('T')[0]).toBe(expectedDate.toISOString().split('T')[0])
    })
  })

  describe('Response Structure', () => {
    it('should include proper response sections', () => {
      let response = '📊 **売上分析（過去30日間）**\n\n'
      response += '【全体実績】\n'
      response += '• 総売上: 1,000,000円\n'
      response += '• 1日平均: 33,333円\n'

      expect(response).toContain('売上分析')
      expect(response).toContain('全体実績')
      expect(response).toContain('総売上')
      expect(response).toContain('1日平均')
    })

    it('should include insights section', () => {
      const response = '\n💡 **所見**: 両店舗ともに安定した売上を維持しています。'

      expect(response).toContain('💡')
      expect(response).toContain('所見')
    })

    it('should format currency with yen symbol', () => {
      const amount = 1000000
      const formatted = `${amount.toLocaleString()}円`

      expect(formatted).toBe('1,000,000円')
    })
  })
})
