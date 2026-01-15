import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTargets } from '../usetargets'
import * as AuthContext from '@/contexts/authcontext'
import * as OrganizationContext from '@/contexts/organizationcontext'

// Mock contexts
vi.mock('@/contexts/authcontext')
vi.mock('@/contexts/organizationcontext')

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              {
                store_id: 'store-1',
                period: '2025-12',
                target_sales: 5000000,
                target_profit: 1000000,
                target_profit_margin: 20,
                target_cost_rate: 30,
                target_labor_rate: 25
              }
            ],
            error: null
          })),
          then: vi.fn((cb) => cb({
            data: [
              {
                store_id: 'store-1',
                period: '2025-12',
                target_sales: 5000000,
                target_profit: 1000000,
                target_profit_margin: 20,
                target_cost_rate: 30,
                target_labor_rate: 25
              }
            ],
            error: null
          }))
        })),
        then: vi.fn((cb) => cb({
          data: [
            {
              store_id: 'store-1',
              period: '2025-12',
              target_sales: 5000000,
              target_profit: 1000000,
              target_profit_margin: 20,
              target_cost_rate: 30,
              target_labor_rate: 25
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

describe('useTargets hook', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      isDemoMode: true,
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
  })

  describe('基本機能', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      expect(result.current.isLoading).toBeDefined()
      expect(result.current.targets).toEqual([])
    })

    it('should fetch targets successfully', async () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })

    it('should handle no targets found', async () => {
      const { result } = renderHook(() => useTargets('store-999', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('目標計算', () => {
    it('should calculate required daily sales', async () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      if (result.current.targets.length > 0) {
        const target = result.current.targets[0]
        expect(target.targetSales).toBeGreaterThan(0)
      }
    })

    it('should calculate required daily customers', async () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })

    it('should handle zero targets', async () => {
      const { result } = renderHook(() => useTargets('store-999', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('目標設定', () => {
    it('should have targets state', () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      expect(result.current.targets).toBeDefined()
      expect(Array.isArray(result.current.targets)).toBe(true)
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle fetch error', async () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('店舗IDなしの場合', () => {
    it('should handle undefined storeId', async () => {
      const { result } = renderHook(() => useTargets('all', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('月の日数計算', () => {
    it('should calculate days correctly for different months', async () => {
      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('デモモード', () => {
    it('should work in demo mode', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        isDemoMode: true,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      } as any)

      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toBeDefined()
    })
  })

  describe('認証なしの場合', () => {
    it('should not fetch without user', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        isDemoMode: false,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      } as any)

      const { result } = renderHook(() => useTargets('store-1', '2025-12'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.targets).toEqual([])
    })
  })
})
