import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionService } from '../subscriptionservice'
import * as supabase from '@/lib/supabase'

// Extract methods for easier testing
const { getOrganizationSubscription, checkFeatureAccess, canAddStore, getAIUsageLimit } = subscriptionService

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}))

describe('Subscription Service', () => {
  const mockOrganizationId = 'org-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrganizationSubscription', () => {
    it('should fetch organization subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: mockOrganizationId,
        plan_id: 'plan-standard',
        status: 'active',
        trial_ends_at: null,
        current_period_end: '2025-12-31T23:59:59Z'
      }

      const mockPlan = {
        id: 'plan-standard',
        name: 'Standard',
        price_monthly: 9980,
        ai_reports_limit: 100,
        custom_features: true
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'subscription_plans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPlan, error: null }))
              }))
            }))
          } as any
        }
        return {} as any
      })

      const result = await getOrganizationSubscription(mockOrganizationId)

      expect(result).toBeTruthy()
      expect(result?.subscription).toEqual(mockSubscription)
      expect(result?.plan).toEqual(mockPlan)
    })

    it('should handle missing subscription', async () => {
      vi.spyOn(supabase.supabase, 'from').mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      } as any)

      const result = await getOrganizationSubscription(mockOrganizationId)

      expect(result).toBeNull()
    })
  })

  describe('checkFeatureAccess', () => {
    const mockSubscription = {
      id: 'sub-1',
      organization_id: mockOrganizationId,
      plan_id: 'plan-standard',
      status: 'active'
    }

    const mockPlan = {
      id: 'plan-standard',
      name: 'Standard',
      custom_features: true,
      ai_reports_limit: 100,
      multi_store_support: true
    }

    it('should allow access to enabled features', async () => {
      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'subscription_plans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPlan, error: null }))
              }))
            }))
          } as any
        }
        return {} as any
      })

      const hasAccess = await checkFeatureAccess(mockOrganizationId, 'custom_features')

      expect(hasAccess).toBe(true)
    })

    it('should deny access to disabled features', async () => {
      const limitedPlan = {
        ...mockPlan,
        custom_features: false
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'subscription_plans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: limitedPlan, error: null }))
              }))
            }))
          } as any
        }
        return {} as any
      })

      const hasAccess = await checkFeatureAccess(mockOrganizationId, 'custom_features')

      expect(hasAccess).toBe(false)
    })

    it('should deny access when subscription is missing', async () => {
      vi.spyOn(supabase.supabase, 'from').mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      } as any)

      const hasAccess = await checkFeatureAccess(mockOrganizationId, 'custom_features')

      expect(hasAccess).toBe(false)
    })
  })

  describe('canAddStore', () => {
    it('should allow adding store when under limit', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: mockOrganizationId,
        plan_id: 'plan-standard',
        status: 'active',
        contracted_stores: 5
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'stores') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null }))
            }))
          } as any
        }
        return {} as any
      })

      const canAdd = await canAddStore(mockOrganizationId)

      expect(canAdd).toBe(true)
    })

    it('should deny adding store when at limit', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: mockOrganizationId,
        plan_id: 'plan-standard',
        status: 'active',
        contracted_stores: 3
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'stores') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null }))
            }))
          } as any
        }
        return {} as any
      })

      const canAdd = await canAddStore(mockOrganizationId)

      expect(canAdd).toBe(false)
    })

    it('should allow unlimited stores when contracted_stores is null', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: mockOrganizationId,
        plan_id: 'plan-premium',
        status: 'active',
        contracted_stores: null
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        }
        return {} as any
      })

      const canAdd = await canAddStore(mockOrganizationId)

      expect(canAdd).toBe(true)
    })
  })

  describe('getAIUsageLimit', () => {
    it('should return AI usage limit from plan', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: mockOrganizationId,
        plan_id: 'plan-standard',
        status: 'active'
      }

      const mockPlan = {
        id: 'plan-standard',
        name: 'Standard',
        ai_reports_limit: 100
      }

      vi.spyOn(supabase.supabase, 'from').mockImplementation((table) => {
        if (table === 'organization_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSubscription, error: null }))
              }))
            }))
          } as any
        } else if (table === 'subscription_plans') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPlan, error: null }))
              }))
            }))
          } as any
        }
        return {} as any
      })

      const limit = await getAIUsageLimit(mockOrganizationId)

      expect(limit).toBe(100)
    })

    it('should return 0 when subscription is missing', async () => {
      vi.spyOn(supabase.supabase, 'from').mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      } as any)

      const limit = await getAIUsageLimit(mockOrganizationId)

      expect(limit).toBe(0)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.spyOn(supabase.supabase, 'from').mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      } as any)

      const result = await getOrganizationSubscription(mockOrganizationId)

      expect(result).toBeNull()
    })
  })
})
