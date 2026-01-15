import { useState, useEffect, useCallback } from 'react'
import { getDailyTarget, upsertDailyTarget, deleteDailyTarget } from '@/services/supabase'
import { DailyTargetData } from '@/types'

export const useDailyTarget = (storeId: string | null, date: string) => {
  const [target, setTarget] = useState<DailyTargetData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTarget = useCallback(async () => {
    if (!storeId || storeId === 'all') {
      setTarget(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getDailyTarget(storeId, date)

      if (fetchError) {
        console.error('日別目標の取得エラー:', fetchError)
        setError('目標の取得に失敗しました')
        setTarget(null)
      } else if (data) {
        setTarget({
          id: data.id,
          storeId: data.store_id,
          date: data.date,
          targetSales: data.target_sales,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        })
      } else {
        setTarget(null)
      }
    } catch (e) {
      console.error('日別目標の取得エラー:', e)
      setError('目標の取得に失敗しました')
      setTarget(null)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, date])

  useEffect(() => {
    fetchTarget()
  }, [fetchTarget])

  const saveTarget = useCallback(async (targetSales: number) => {
    if (!storeId || storeId === 'all') {
      setError('店舗を選択してください')
      return { success: false, error: '店舗を選択してください' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: saveError } = await upsertDailyTarget({
        storeId,
        date,
        targetSales
      })

      if (saveError) {
        console.error('日別目標の保存エラー:', saveError)
        setError('目標の保存に失敗しました')
        return { success: false, error: '目標の保存に失敗しました' }
      }

      if (data) {
        setTarget({
          id: data.id,
          storeId: data.store_id,
          date: data.date,
          targetSales: data.target_sales,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        })
      }

      return { success: true, error: null }
    } catch (e) {
      console.error('日別目標の保存エラー:', e)
      setError('目標の保存に失敗しました')
      return { success: false, error: '目標の保存に失敗しました' }
    } finally {
      setIsLoading(false)
    }
  }, [storeId, date])

  const removeTarget = useCallback(async () => {
    if (!storeId || storeId === 'all') {
      setError('店舗を選択してください')
      return { success: false, error: '店舗を選択してください' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await deleteDailyTarget(storeId, date)

      if (deleteError) {
        console.error('日別目標の削除エラー:', deleteError)
        setError('目標の削除に失敗しました')
        return { success: false, error: '目標の削除に失敗しました' }
      }

      setTarget(null)
      return { success: true, error: null }
    } catch (e) {
      console.error('日別目標の削除エラー:', e)
      setError('目標の削除に失敗しました')
      return { success: false, error: '目標の削除に失敗しました' }
    } finally {
      setIsLoading(false)
    }
  }, [storeId, date])

  return {
    target,
    isLoading,
    error,
    saveTarget,
    removeTarget,
    refetch: fetchTarget
  }
}
