import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AIUsageStatus {
  currentCount: number
  monthlyLimit: number
  remaining: number
  percentage: number
  storeId: string
  storeName: string
  isLimited: boolean
}

export interface AIUsageLimitResult {
  status: AIUsageStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAIUsageLimit(userId: string | undefined, selectedStoreId?: string): AIUsageLimitResult {
  const [status, setStatus] = useState<AIUsageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageStatus = useCallback(async () => {
    // Skip for demo users (they use useDemoAIUsage instead)
    if (!userId || !supabase || userId === 'demo-user') {
      setStatus(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get user's organization and store
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, store_id, role')
        .eq('user_id', userId)
        .maybeSingle()

      if (memberError) throw memberError
      if (!memberData) {
        setStatus(null)
        setLoading(false)
        return
      }

      // Determine which store to use: selected store (if provided and valid) or assigned store
      let targetStoreId = memberData.store_id

      // If a specific store is selected and user has permission to view it
      if (selectedStoreId && selectedStoreId !== 'all') {
        // Admin/Owner can view any store in their organization
        if (memberData.role === 'admin' || memberData.role === 'owner') {
          // Verify the selected store exists and belongs to the user's organization
          const { data: selectedStore } = await supabase
            .from('stores')
            .select('id')
            .eq('id', selectedStoreId)
            .eq('organization_id', memberData.organization_id)
            .maybeSingle()

          if (selectedStore) {
            targetStoreId = selectedStoreId
          }
        } else {
          // Non-admin users can only view their assigned store
          if (selectedStoreId === memberData.store_id) {
            targetStoreId = selectedStoreId
          }
        }
      }

      if (!targetStoreId) {
        setStatus(null)
        setLoading(false)
        return
      }

      // Get store name
      const { data: storeData } = await supabase
        .from('stores')
        .select('name')
        .eq('id', targetStoreId)
        .single()

      // Get store usage status
      const { data: usageData, error: usageError } = await supabase.rpc(
        'get_store_usage_status',
        {
          p_store_id: targetStoreId,
          p_organization_id: memberData.organization_id
        }
      )

      if (usageError) {
        console.error('Failed to fetch usage status:', usageError)
        setError(usageError.message)
        setStatus(null)
      } else if (usageData) {
        setStatus({
          currentCount: usageData.current_usage ?? 0,
          monthlyLimit: usageData.limit ?? 100,
          remaining: usageData.remaining ?? 0,
          percentage: usageData.percentage ?? 0,
          storeId: targetStoreId,
          storeName: storeData?.name || '不明な店舗',
          isLimited: !usageData.can_use
        })
      }
    } catch (err) {
      console.error('Error fetching usage status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedStoreId])

  const refresh = useCallback(async () => {
    await fetchUsageStatus()
  }, [fetchUsageStatus])

  useEffect(() => {
    fetchUsageStatus()

    // Skip realtime subscription for demo users
    if (!userId || !supabase || userId === 'demo-user') return

    const channel = supabase
      .channel('ai-usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_usage_limits',
          filter: `store_id=eq.${status?.storeId}`
        },
        () => {
          fetchUsageStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchUsageStatus, status?.storeId])

  return {
    status,
    loading,
    error,
    refresh
  }
}
