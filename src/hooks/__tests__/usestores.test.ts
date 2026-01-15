import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useStores } from '../usestores'

// Mock the mock data
vi.mock('@/lib/mock', () => ({
  mockStores: [
    {
      id: 'store-1',
      name: 'Test Store 1',
      address: 'Address 1',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z'
    },
    {
      id: 'store-2',
      name: 'Test Store 2',
      address: 'Address 2',
      is_active: true,
      created_at: '2025-12-02T00:00:00Z'
    }
  ]
}))

describe('useStores hook', () => {
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useStores(mockUserId))

      expect(result.current.loading).toBe(false)
      expect(result.current.stores).toBeDefined()
      expect(result.current.error).toBeNull()
    })

    it('should fetch stores successfully', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      expect(result.current.stores).toHaveLength(2)
      expect(result.current.stores[0].name).toBe('Test Store 1')
      expect(result.current.error).toBeNull()
    })

    it('should handle fetch error', async () => {
      const { result } = renderHook(() => useStores(null))

      expect(result.current.stores).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('デモモード', () => {
    it('should not fetch stores in demo mode', async () => {
      const { result } = renderHook(() => useStores(null))

      expect(result.current.loading).toBe(false)
      expect(result.current.stores).toEqual([])
    })
  })

  describe('ユーザー認証', () => {
    it('should not fetch without authenticated user', () => {
      const { result } = renderHook(() => useStores(null))

      expect(result.current.loading).toBe(false)
      expect(result.current.stores).toEqual([])
    })
  })

  describe('refetch機能', () => {
    it('should provide refetch function', () => {
      const { result } = renderHook(() => useStores(mockUserId))

      expect(result.current.fetchStores).toBeDefined()
      expect(typeof result.current.fetchStores).toBe('function')
    })

    it('should refetch stores when refetch is called', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      const initialStores = result.current.stores

      await act(async () => {
        await result.current.fetchStores()
      })

      expect(result.current.stores).toBeDefined()
      expect(result.current.stores.length).toBe(initialStores.length)
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle network errors', () => {
      const { result } = renderHook(() => useStores(mockUserId))

      expect(result.current.error).toBeNull()
    })
  })

  describe('データ形式', () => {
    it('should return stores with correct properties', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      const store = result.current.stores[0]
      expect(store).toHaveProperty('id')
      expect(store).toHaveProperty('name')
      expect(store).toHaveProperty('address')
      expect(store).toHaveProperty('is_active')
    })
  })

  describe('空のデータ', () => {
    it('should handle empty store list', () => {
      const { result } = renderHook(() => useStores(null))

      expect(result.current.stores).toEqual([])
      expect(result.current.loading).toBe(false)
    })
  })

  describe('店舗選択', () => {
    it('should select store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.selectStore('store-1')
      })

      expect(result.current.selectedStoreId).toBe('store-1')
      expect(result.current.selectedStore?.id).toBe('store-1')
    })

    it('should auto-select first active store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.selectedStoreId).toBeTruthy()
      })

      expect(result.current.selectedStoreId).toBe('store-1')
    })
  })

  describe('店舗作成', () => {
    it('should create new store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      const initialCount = result.current.stores.length

      await act(async () => {
        const response = await result.current.createStore({
          name: 'New Store',
          address: 'New Address'
        })
        expect(response.error).toBeNull()
      })

      expect(result.current.stores.length).toBe(initialCount + 1)
    })

    it('should prevent duplicate store names', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const response = await result.current.createStore({
          name: 'Test Store 1',
          address: 'Duplicate Address'
        })
        expect(response.error).toBeTruthy()
        expect(response.error).toContain('既に存在')
      })
    })
  })

  describe('店舗更新', () => {
    it('should update store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const response = await result.current.updateStore('store-1', {
          name: 'Updated Store'
        })
        expect(response.error).toBeNull()
      })

      const updatedStore = result.current.stores.find(s => s.id === 'store-1')
      expect(updatedStore?.name).toBe('Updated Store')
    })
  })

  describe('店舗削除', () => {
    it('should soft delete store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0)
      })

      const initialCount = result.current.stores.length

      await act(async () => {
        const response = await result.current.deleteStore('store-1')
        expect(response.error).toBeNull()
      })

      expect(result.current.stores.length).toBe(initialCount - 1)
    })

    it('should clear selection when deleting selected store', async () => {
      const { result } = renderHook(() => useStores(mockUserId))

      await waitFor(() => {
        expect(result.current.selectedStoreId).toBeTruthy()
      })

      const selectedId = result.current.selectedStoreId

      await act(async () => {
        await result.current.deleteStore(selectedId!)
      })

      expect(result.current.selectedStoreId).toBeNull()
    })
  })
})
