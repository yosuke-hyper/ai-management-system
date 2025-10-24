import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AIUsageStatus {
  currentCount: number
  dailyLimit: number
  remaining: number
  resetAt: string
  isLimited: boolean
}

export interface AIUsageLimitResult {
  status: AIUsageStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAIUsageLimit(userId: string | undefined): AIUsageLimitResult {
  const [status, setStatus] = useState<AIUsageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageStatus = useCallback(async () => {
    if (!userId || !supabase) {
      setStatus(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_user_usage_status', {
        p_user_id: userId
      })

      if (rpcError) {
        console.error('Failed to fetch usage status:', rpcError)
        setError(rpcError.message)
        setStatus(null)
      } else if (data) {
        setStatus({
          currentCount: data.current_count ?? 0,
          dailyLimit: data.daily_limit ?? 5,
          remaining: data.remaining ?? 0,
          resetAt: data.reset_at ?? new Date().toISOString(),
          isLimited: data.is_limited ?? false
        })
      }
    } catch (err) {
      console.error('Error fetching usage status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refresh = useCallback(async () => {
    await fetchUsageStatus()
  }, [fetchUsageStatus])

  useEffect(() => {
    fetchUsageStatus()

    if (!userId || !supabase) return

    const channel = supabase
      .channel('ai-usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_usage_tracking',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUsageStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchUsageStatus])

  return {
    status,
    loading,
    error,
    refresh
  }
}
