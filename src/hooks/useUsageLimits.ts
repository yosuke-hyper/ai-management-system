import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUsageStatus, UsageStatus } from '@/services/usageLimits'

export function useUsageLimits() {
  const { user } = useAuth()
  const [status, setStatus] = useState<UsageStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadUsageStatus()
    }
  }, [user?.id])

  const loadUsageStatus = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const usageStatus = await getUsageStatus(user.id)
      setStatus(usageStatus)
    } catch (err) {
      setError('使用状況の取得に失敗しました')
      console.error('Failed to load usage status:', err)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    loadUsageStatus()
  }

  return {
    status,
    loading,
    error,
    refresh
  }
}
