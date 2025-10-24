import { useState, useEffect } from 'react'
import { mockStores } from '../lib/mock'

interface Store {
  id: string
  name: string
  address: string
  manager_id?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface StoreWithDetails extends Store { 
  manager_name?: string
  reportCount?: number
  lastReportDate?: string
  isAssigned?: boolean
}

export const useStores = (userId: string | null) => {
  const [stores, setStores] = useState<StoreWithDetails[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // モックデータから店舗を取得
  const fetchStores = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 fetchStores: モック店舗データ取得開始')
      
      // モックデータに詳細情報を追加
      const storesWithDetails = mockStores.map((store, index) => ({
        ...store,
        manager_name: index === 0 ? '田中健太' : index === 1 ? '高山忠純' : '佐藤陽介',
        reportCount: Math.floor(Math.random() * 30) + 5, // 5-35件
        lastReportDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去1週間以内
        isAssigned: true
      }))
      
      console.log('✅ fetchStores: モック店舗データ取得完了:', storesWithDetails.length, '件')
      setStores(storesWithDetails)
      
      // 最初の有効店舗を自動選択
      const firstActiveStore = storesWithDetails.find(s => s.is_active)
      if (!selectedStoreId && firstActiveStore) {
        console.log('🎯 fetchStores: 最初の店舗を自動選択:', firstActiveStore.name)
        setSelectedStoreId(firstActiveStore.id)
      }
    } catch (err) {
      console.error('❌ fetchStores: エラー:', err)
      setError('店舗データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 店舗作成（モック）
  const createStore = async (storeData: {
    name: string
    address: string
    managerName?: string
    isActive?: boolean
  }) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🏪 createStore: 新規店舗作成開始:', storeData)
      
      // 重複チェック
      const existingStore = stores.find(store => 
        store.name.toLowerCase() === storeData.name.toLowerCase() && store.is_active
      )
      
      if (existingStore) {
        const errorMsg = `店舗名「${storeData.name}」は既に存在します`
        console.log('⚠️ createStore: 重複店舗検出:', errorMsg)
        return { error: errorMsg }
      }
      
      // 新店舗作成
      const newStore: StoreWithDetails = {
        id: `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: storeData.name,
        address: storeData.address,
        manager_name: storeData.managerName || '新店長',
        is_active: storeData.isActive !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reportCount: 0,
        lastReportDate: new Date().toISOString(),
        isAssigned: true
      }
      
      // 店舗リストに追加
      const updatedStores = [...stores, newStore]
      setStores(updatedStores)
      
      console.log('✅ createStore: 店舗作成成功:', newStore.name)
      return { data: newStore, error: null }
    } catch (err) {
      console.error('❌ createStore: エラー:', err)
      const errorMessage = '店舗の作成に失敗しました'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 店舗更新（モック）
  const updateStore = async (storeId: string, updateData: {
    name?: string
    address?: string
    manager_name?: string
    isActive?: boolean
  }) => {
    try {
      setLoading(true)
      setError(null)
      
      const storeIndex = stores.findIndex(store => store.id === storeId)
      if (storeIndex === -1) {
        return { error: '指定された店舗が見つかりません' }
      }
      
      // 更新
      const updatedStores = [...stores]
      updatedStores[storeIndex] = {
        ...updatedStores[storeIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      }
      
      setStores(updatedStores)
      console.log('✅ updateStore: 店舗更新成功:', updatedStores[storeIndex].name)
      
      return { data: updatedStores[storeIndex], error: null }
    } catch (err) {
      console.error('❌ updateStore: エラー:', err)
      return { error: '店舗の更新に失敗しました' }
    } finally {
      setLoading(false)
    }
  }

  // 店舗削除（論理削除）
  const deleteStore = async (storeId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const storeIndex = stores.findIndex(store => store.id === storeId)
      if (storeIndex === -1) {
        return { error: '指定された店舗が見つかりません' }
      }
      
      // 論理削除
      const updatedStores = [...stores]
      updatedStores[storeIndex] = {
        ...updatedStores[storeIndex],
        is_active: false,
        updated_at: new Date().toISOString()
      }
      
      setStores(updatedStores)
      
      // 選択中の店舗だった場合はクリア
      if (selectedStoreId === storeId) {
        setSelectedStoreId(null)
      }
      
      console.log('✅ deleteStore: 店舗削除成功')
      return { error: null }
    } catch (err) {
      console.error('❌ deleteStore: エラー:', err)
      return { error: '店舗の削除に失敗しました' }
    } finally {
      setLoading(false)
    }
  }

  // 店舗選択
  const selectStore = (storeId: string | null) => {
    console.log('🎯 selectStore: 店舗選択:', storeId)
    setSelectedStoreId(storeId)
  }

  // 選択中の店舗取得
  const getSelectedStore = () => {
    return stores.find(store => store.id === selectedStoreId) || null
  }

  // 初回データ取得
  useEffect(() => {
    if (userId) {
      fetchStores()
    }
  }, [userId])

  return {
    stores: stores.filter(s => s.is_active), // 有効な店舗のみ返す
    selectedStoreId,
    selectedStore: getSelectedStore(),
    loading,
    error,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    selectStore
  }
}