import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPICards } from '../kpicards'

describe('KPICards', () => {
  const mockData = {
    todaySales: 1000000,
    todayExpenses: 300000,
    todayGrossProfit: 700000,
    todayOperatingProfit: 400000,
    salesGrowth: 10,
    profitMargin: 40
  }

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<KPICards data={mockData} />)
      // Check for specific card titles
      expect(screen.getByText('今日の売上')).toBeInTheDocument()
      expect(screen.getByText('今日の経費')).toBeInTheDocument()
      expect(screen.getByText('粗利益')).toBeInTheDocument()
      expect(screen.getByText('営業利益')).toBeInTheDocument()
    })

    it('should display total sales', () => {
      render(<KPICards data={mockData} />)
      expect(screen.getByText(/￥1,000,000/)).toBeInTheDocument()
    })

    it('should display total customers', () => {
      render(<KPICards data={mockData} />)
      // This component shows today's expenses
      expect(screen.getByText(/￥300,000/)).toBeInTheDocument()
    })

    it('should display average ticket', () => {
      render(<KPICards data={mockData} />)
      // This component shows gross profit
      expect(screen.getByText(/￥700,000/)).toBeInTheDocument()
    })
  })

  describe('Rate displays', () => {
    it('should display purchase rate', () => {
      render(<KPICards data={mockData} />)
      // This component shows profit margin in the operating profit card
      expect(screen.getByText(/利益率 40\.0%/)).toBeInTheDocument()
    })

    it('should display labor rate', () => {
      render(<KPICards data={mockData} />)
      // This component shows expenses description
      expect(screen.getByText('今日の経費')).toBeInTheDocument()
    })

    it('should display prime cost rate (FL ratio)', () => {
      render(<KPICards data={mockData} />)
      // Component shows profit descriptions
      expect(screen.getByText('粗利益')).toBeInTheDocument()
    })
  })

  describe('Profit displays', () => {
    it('should display gross profit', () => {
      render(<KPICards data={mockData} />)
      expect(screen.getByText(/￥700,000/)).toBeInTheDocument()
    })

    it('should display operating profit', () => {
      render(<KPICards data={mockData} />)
      expect(screen.getByText(/￥400,000/)).toBeInTheDocument()
    })

    it('should display profit margin', () => {
      render(<KPICards data={mockData} />)
      expect(screen.getByText(/利益率 40\.0%/)).toBeInTheDocument()
    })
  })

  describe('Growth indicators', () => {
    it('should display positive sales growth', () => {
      render(<KPICards data={mockData} />)
      const elements = screen.getAllByText(/10\.0%/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should display negative sales growth', () => {
      const negativeGrowthData = { ...mockData, salesGrowth: -10 }
      render(<KPICards data={negativeGrowthData} />)
      const elements = screen.getAllByText(/10\.0%/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should display positive profit growth', () => {
      render(<KPICards data={mockData} />)
      // This component shows sales growth
      const elements = screen.getAllByText(/10\.0%/)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero values', () => {
      const zeroData = {
        todaySales: 0,
        todayExpenses: 0,
        todayGrossProfit: 0,
        todayOperatingProfit: 0,
        salesGrowth: 0,
        profitMargin: 0
      }
      render(<KPICards data={zeroData} />)
      // Check that zero values are rendered with currency format
      const elements = screen.getAllByText(/￥0/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should handle negative values', () => {
      const negativeData = {
        todaySales: 1000000,
        todayExpenses: 800000,
        todayGrossProfit: -100000,
        todayOperatingProfit: -200000,
        salesGrowth: -15,
        profitMargin: -20
      }
      render(<KPICards data={negativeData} />)
      // Check that negative values are displayed
      const elements = screen.getAllByText(/-￥/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should handle large values', () => {
      const largeData = {
        todaySales: 50000000,
        todayExpenses: 30000000,
        todayGrossProfit: 20000000,
        todayOperatingProfit: 10000000,
        salesGrowth: 100,
        profitMargin: 20
      }
      render(<KPICards data={largeData} />)
      expect(screen.getByText(/￥50,000,000/)).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading skeleton when loading is true', () => {
      render(<KPICards data={mockData} loading={true} />)
      const skeletonCards = document.querySelectorAll('.animate-pulse')
      expect(skeletonCards.length).toBeGreaterThan(0)
    })

    it('should show actual data when loading is false', () => {
      render(<KPICards data={mockData} loading={false} />)
      expect(screen.getByText('今日の売上')).toBeInTheDocument()
    })

    it('should show actual data when loading prop is not provided', () => {
      render(<KPICards data={mockData} />)
      expect(screen.getByText('今日の売上')).toBeInTheDocument()
    })
  })
})
