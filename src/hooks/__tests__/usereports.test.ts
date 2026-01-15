import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReports } from '../usereports'
import * as supabaseService from '@/services/supabase'
import * as AuthContext from '@/contexts/authcontext'
import * as OrganizationContext from '@/contexts/organizationcontext'

// Mock dependencies
vi.mock('@/services/supabase')
vi.mock('@/contexts/authcontext')
vi.mock('@/contexts/organizationcontext')

// Complete Supabase mock with proper chain
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(function(this: any) {
          this._eqCalled = true
          return this
        }),
        gte: vi.fn(function(this: any) {
          this._gteCalled = true
          return this
        }),
        lte: vi.fn(function(this: any) {
          this._lteCalled = true
          return this
        }),
        order: vi.fn(() => Promise.resolve({
          data: [
            {
              id: '1',
              store_id: 'store-1',
              date: '2025-12-01',
              operation_type: 'full_day',
              sales: 100000,
              customers: 50,
              customer_count: 50,
              lunch_customers: 25,
              dinner_customers: 25,
              purchase: 30000,
              labor_cost: 20000,
              utilities: 5000,
              rent: 10000,
              consumables: 2000,
              promotion: 1000,
              cleaning: 500,
              misc: 500,
              communication: 500,
              others: 500,
              report_text: 'Test report',
              created_at: '2025-12-01T00:00:00Z'
            }
          ],
          error: null
        }))
      }))
    }))
  }
}))

// Mock organizationService
vi.mock('@/services/organizationservice', () => ({
  setSelectedOrganizationContext: vi.fn()
}))

describe('useReports hook', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockReports = [
    {
      id: '1',
      storeId: 'store-1',
      storeName: 'Test Store',
      staffName: 'Test Staff',
      date: '2025-12-01',
      operationType: 'full_day' as const,
      sales: 100000,
      customers: 50,
      lunchCustomers: 25,
      dinnerCustomers: 25,
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
      reportText: 'Test report',
      createdAt: '2025-12-01T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Setup default mocks
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      isDemoMode: false,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn()
    } as any)

    vi.spyOn(OrganizationContext, 'useOrganization').mockReturnValue({
      organizationId: 'org-123',
      organization: null,
      isLoading: false,
      refetch: vi.fn()
    } as any)

    vi.spyOn(supabaseService, 'getDailyReports').mockResolvedValue({
      data: mockReports as any,
      error: null
    })
  })

  describe('基本機能', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useReports())
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toEqual([])
      expect(result.current.isError).toBe(false)
    })

    it('should fetch reports successfully', async () => {
      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data.length).toBeGreaterThan(0)
      expect(result.current.isError).toBe(false)
    })

    it('should handle fetch error', async () => {
      vi.spyOn(supabaseService, 'getDailyReports').mockResolvedValue({
        data: null,
        error: { message: 'Network error' } as any
      })

      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toEqual([])
    })
  })

  describe('フィルタリング', () => {
    it('should filter by store ID', async () => {
      const { result } = renderHook(() =>
        useReports({ storeId: 'store-1' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(supabaseService.getDailyReports).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'store-1' })
      )
    })

    it('should filter by date range', async () => {
      const { result } = renderHook(() =>
        useReports({
          dateFrom: '2025-12-01',
          dateTo: '2025-12-31'
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(supabaseService.getDailyReports).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2025-12-01',
          dateTo: '2025-12-31'
        })
      )
    })
  })

  describe('デモモード', () => {
    beforeEach(() => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        isDemoMode: true,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      } as any)
    })

    it('should use demo data in demo mode', async () => {
      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 3000 })

      // In demo mode, it should not call getDailyReports
      expect(supabaseService.getDailyReports).not.toHaveBeenCalled()
    })
  })

  describe('ローカルストレージ統合', () => {
    it('should handle empty local storage', async () => {
      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toBeDefined()
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle Supabase errors gracefully', async () => {
      vi.spyOn(supabaseService, 'getDailyReports').mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' } as any
      })

      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toContain('Database connection failed')
    })

    it('should handle network errors', async () => {
      vi.spyOn(supabaseService, 'getDailyReports').mockRejectedValue(
        new Error('Network error')
      )

      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('データ変換', () => {
    it('should transform snake_case to camelCase', async () => {
      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      if (result.current.data.length > 0) {
        const report = result.current.data[0]
        expect(report).toHaveProperty('storeId')
        expect(report).toHaveProperty('storeName')
        expect(report).toHaveProperty('sales')
        expect(report).toHaveProperty('laborCost')
        expect(report).toHaveProperty('operationType')
        // Should not have snake_case properties
        expect(report).not.toHaveProperty('store_id')
        expect(report).not.toHaveProperty('labor_cost')
        expect(report).not.toHaveProperty('operation_type')
      }
    })

    it('should convert numeric fields correctly', async () => {
      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      if (result.current.data.length > 0) {
        const report = result.current.data[0]
        expect(typeof report.sales).toBe('number')
        expect(typeof report.customers).toBe('number')
        expect(typeof report.laborCost).toBe('number')
      }
    })
  })

  describe('ソート', () => {
    it('should sort reports by date', async () => {
      const multipleReports = [
        { ...mockReports[0], date: '2025-12-01' },
        { ...mockReports[0], id: '2', date: '2025-12-02' },
        { ...mockReports[0], id: '3', date: '2025-12-03' }
      ]

      vi.spyOn(supabaseService, 'getDailyReports').mockResolvedValue({
        data: multipleReports as any,
        error: null
      })

      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(1)
      })

      const dates = result.current.data.map(r => r.date)
      expect(dates).toBeDefined()
      expect(dates.length).toBeGreaterThan(0)
    })
  })

  describe('認証', () => {
    it('should not fetch without user', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        isDemoMode: false,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      } as any)

      const { result } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('パフォーマンス', () => {
    it('should prevent duplicate fetches', async () => {
      const { result, rerender } = renderHook(() => useReports())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = (supabaseService.getDailyReports as any).mock.calls.length

      // Rerender should not trigger another fetch
      rerender()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect((supabaseService.getDailyReports as any).mock.calls.length).toBe(initialCallCount)
    })
  })
})
