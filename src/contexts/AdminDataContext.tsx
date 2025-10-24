import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { type Store, type TargetData } from '@/types'
import { type Vendor, type StoreVendorAssignment } from '@/types'
import { useAuth } from './AuthContext'
import {
  getStores,
  createStore as createStoreDb,
  updateStore as updateStoreDb,
  deleteStore as deleteStoreDb,
  getVendors,
  createVendor as createVendorDb,
  updateVendor as updateVendorDb,
  deleteVendor as deleteVendorDb,
  getAllStoreVendorAssignments,
  getStoreVendors as getStoreVendorsDb,
  assignVendorToStore as assignVendorToStoreDb,
  removeVendorFromStore as removeVendorFromStoreDb,
  getTargets,
  upsertTarget as upsertTargetDb,
  deleteTarget as deleteTargetDb
} from '../services/supabase'

// UUID validation utility
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

type StoreInput = {
  name: string
  address: string
  managerId?: string | null
  managerName?: string | null
  manager?: string | null
  isActive?: boolean
}

type AdminCtx = {
  stores: Store[]
  targets: TargetData[]
  vendors: Vendor[]
  storeVendorAssignments: StoreVendorAssignment[]
  addStore: (input: StoreInput) => Promise<{ ok: boolean; error?: string }>
  updateStore: (id: string, patch: Partial<Store>) => void
  deleteStore: (id: string) => void
  upsertTarget: (t: TargetData) => void
  deleteTarget: (storeId: string, period: string) => void
  addVendor: (vendor: Omit<Vendor, 'id'>) => void
  updateVendor: (id: string, patch: Partial<Vendor>) => void
  deleteVendor: (id: string) => void
  getStoreVendors: (storeId: string) => Vendor[]
  assignVendorToStore: (storeId: string, vendorId: string) => void
  unassignVendorFromStore: (storeId: string, vendorId: string) => void
}

const AdminDataContext = createContext<AdminCtx | null>(null)

export const AdminDataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>([])
  const [targets, setTargets] = useState<TargetData[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [storeVendorAssignments, setStoreVendorAssignments] = useState<StoreVendorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Supabaseからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // 並行してデータを取得
        const [storesResult, vendorsResult, targetsResult, assignmentsResult] = await Promise.all([
          getStores(),
          getVendors(),
          getTargets(),
          getAllStoreVendorAssignments()
        ])

        // Stores
        if (!storesResult.error && storesResult.data) {
          const transformedStores: Store[] = storesResult.data.map(store => ({
            id: store.id,
            name: store.name,
            address: store.address,
            manager: store.manager_id || '',
            isActive: store.is_active ?? true
          }))
          setStores(transformedStores)
        }

        // Vendors
        if (!vendorsResult.error && vendorsResult.data) {
          const transformedVendors: Vendor[] = vendorsResult.data.map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            contactInfo: vendor.contact_info,
            isActive: vendor.is_active,
            createdAt: vendor.created_at,
            updatedAt: vendor.updated_at
          }))
          setVendors(transformedVendors)
        }

        // Targets
        if (!targetsResult.error && targetsResult.data) {
          const transformedTargets: TargetData[] = targetsResult.data.map(target => ({
            storeId: target.store_id,
            period: target.period,
            targetSales: target.target_sales,
            targetProfit: target.target_profit,
            targetProfitMargin: target.target_profit_margin,
            targetCostRate: target.target_cost_rate || 0,
            targetLaborRate: target.target_labor_rate || 0
          }))
          setTargets(transformedTargets)
        }

        // Store Vendor Assignments
        if (!assignmentsResult.error && assignmentsResult.data) {
          const transformedAssignments: StoreVendorAssignment[] = assignmentsResult.data.map((a: any) => ({
            storeId: a.store_id,
            vendorId: a.vendor_id,
            displayOrder: a.display_order || 0
          }))
          console.log('📦 AdminDataContext: 割り当てデータ読み込み完了:', transformedAssignments)
          setStoreVendorAssignments(transformedAssignments)
        } else {
          console.log('⚠️ AdminDataContext: 割り当てデータなし or エラー', assignmentsResult)
        }

      } catch (err) {
        console.error('❌ AdminDataProvider: データ取得エラー:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const addStore: AdminCtx['addStore'] = async (input) => {
    try {
      if (!input.name?.trim()) {
        return { ok: false, error: '店舗名は必須です' }
      }
      if (!input.address?.trim()) {
        return { ok: false, error: '住所は必須です' }
      }

      const manager_id = input.managerId && isValidUUID(input.managerId)
        ? input.managerId
        : input.manager && isValidUUID(input.manager)
        ? input.manager
        : undefined

      const payload = {
        name: input.name.trim(),
        address: input.address.trim(),
        manager_id,
        is_active: input.isActive ?? true
      }

      const { data, error } = await createStoreDb(payload)

      if (error) {
        return { ok: false, error: error.message }
      }

      if (data) {
        const newStore: Store = {
          id: data.id,
          name: data.name,
          address: data.address,
          manager: data.manager_id || '',
          isActive: data.is_active ?? true
        }
        setStores(prev => [...prev, newStore])
      }

      return { ok: true }
    } catch (e: any) {
      console.error('❌ 店舗作成エラー:', e)
      return { ok: false, error: e?.message ?? '店舗作成に失敗しました' }
    }
  }

  const updateStore: AdminCtx['updateStore'] = async (id, patch) => {
    try {
      // Validate manager_id - only set if it's a valid UUID, otherwise undefined  
      const managerId = patch.manager && isValidUUID(patch.manager) ? patch.manager : undefined
      
      const updateData = {
        name: patch.name,
        address: patch.address,
        manager_id: managerId,
        is_active: patch.isActive
      }
      
      const { data, error } = await updateStoreDb(id, updateData)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setStores(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    } catch (err) {
      console.error('❌ 店舗更新エラー:', err)
      throw err
    }
  }

  const deleteStore: AdminCtx['deleteStore'] = async (id) => {
    try {
      const { error } = await deleteStoreDb(id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setStores(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s))
    } catch (err) {
      console.error('❌ 店舗削除エラー:', err)
      throw err
    }
  }

  const upsertTarget: AdminCtx['upsertTarget'] = async (t) => {
    try {
      const targetData = {
        store_id: t.storeId,
        period: t.period,
        target_sales: t.targetSales,
        target_profit: t.targetProfit,
        target_profit_margin: t.targetProfitMargin,
        target_cost_rate: t.targetCostRate || 0,
        target_labor_rate: t.targetLaborRate || 0
      }

      console.log('📊 AdminDataContext: 目標保存開始', targetData)

      const { data, error } = await upsertTargetDb(targetData)

      console.log('📊 AdminDataContext: 保存結果', { data, error })

      if (error) {
        console.error('❌ AdminDataContext: Supabaseエラー:', error)
        throw new Error(error.message)
      }

      setTargets(prev => {
        const idx = prev.findIndex(x => x.storeId === t.storeId && x.period === t.period)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = t
          return copy
        }
        return [...prev, t]
      })

      console.log('✅ AdminDataContext: 目標保存成功')
    } catch (err) {
      console.error('❌ 目標保存エラー:', err)
      throw err
    }
  }

  const deleteTarget: AdminCtx['deleteTarget'] = async (storeId, period) => {
    try {
      const { error } = await deleteTargetDb(storeId, period)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setTargets(prev => prev.filter(t => !(t.storeId === storeId && t.period === period)))
    } catch (err) {
      console.error('❌ 目標削除エラー:', err)
      throw err
    }
  }

  const addVendor: AdminCtx['addVendor'] = async (vendor) => {
    try {
      console.log('🔍 addVendor: 業者作成開始:', vendor)

      if (!user?.id) {
        throw new Error('ユーザーがログインしていません')
      }

      // Convert camelCase to snake_case for database
      const vendorData = {
        name: vendor.name,
        category: vendor.category,
        contact_info: vendor.contactInfo || '',
        is_active: vendor.isActive,
        user_id: user.id
      }

      console.log('🔍 addVendor: データベース用に変換:', vendorData)

      const result = await createVendorDb(vendorData)

      if (result.data) {
        console.log('✅ addVendor: 業者作成成功:', result.data)
        const newVendor: Vendor = {
          id: result.data.id,
          name: result.data.name,
          category: result.data.category,
          contactInfo: result.data.contact_info,
          isActive: result.data.is_active,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
        setVendors(prev => [...prev, newVendor])
      } else if (result.error) {
        console.error('❌ addVendor: エラー:', result.error)
        throw new Error(result.error.message || '業者の作成に失敗しました')
      }
    } catch (err) {
      console.error('❌ 業者作成エラー:', err)
      throw err
    }
  }

  const updateVendor: AdminCtx['updateVendor'] = async (id, patch) => {
    try {
      console.log('🔍 updateVendor: 業者更新開始:', { id, patch })
      
      const updateData = {
        name: patch.name,
        category: patch.category,
        contact_info: patch.contactInfo,
        is_active: patch.isActive
      }
      
      const result = await updateVendorDb(id, updateData)
      
      if (result.error) {
        console.error('❌ updateVendor: エラー:', result.error)
        throw new Error(result.error.message || '業者の更新に失敗しました')
      } else {
        console.log('✅ updateVendor: 業者更新成功')
      }
      
      setVendors(prev => prev.map(v => v.id === id ? { 
        ...v, 
        ...patch, 
        updatedAt: new Date().toISOString() 
      } : v))
    } catch (err) {
      console.error('❌ 業者更新エラー:', err)
      throw err
    }
  }

  const deleteVendor: AdminCtx['deleteVendor'] = async (id) => {
    try {
      console.log('🔍 deleteVendor: 業者削除開始:', id)
      
      const result = await deleteVendorDb(id)
      
      if (result.error) {
        console.error('❌ deleteVendor: エラー:', result.error)
        throw new Error(result.error.message || '業者の削除に失敗しました')
      } else {
        console.log('✅ deleteVendor: 業者削除成功')
      }
      
      setVendors(prev => prev.map(v => v.id === id ? { ...v, isActive: false } : v))
    } catch (err) {
      console.error('❌ 業者削除エラー:', err)
      throw err
    }
  }

  const getStoreVendors = useCallback<AdminCtx['getStoreVendors']>((storeId) => {
    // 'all'や空の場合は空配列を返す
    if (!storeId || storeId === 'all') {
      console.log('🔍 getStoreVendors: storeId が "all" または空のため空配列を返します')
      return []
    }

    // 文字列化して比較（UUID / 'store-toyosu' などの形式の違いに対応）
    const sid = String(storeId)

    console.log('🔍 getStoreVendors called:', {
      requestedStoreId: sid,
      totalAssignments: storeVendorAssignments.length,
      totalVendors: vendors.length,
      allStoreIds: [...new Set(storeVendorAssignments.map(a => a.storeId))]
    })

    const assignedVendorIds = storeVendorAssignments
      .filter(a => {
        const matches = String(a.storeId) === sid
        if (!matches && storeVendorAssignments.length > 0) {
          console.log('🔍 No match:', { assignmentStoreId: a.storeId, requestedStoreId: sid })
        }
        return matches
      })
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(a => a.vendorId)

    console.log('🔍 Assigned vendor IDs for store:', assignedVendorIds)

    const result = assignedVendorIds
      .map(vendorId => vendors.find(v => v.id === vendorId))
      .filter((v): v is Vendor => !!v && v.isActive)

    console.log('🔍 Final vendors:', result)
    return result
  }, [storeVendorAssignments, vendors])

  const assignVendorToStore: AdminCtx['assignVendorToStore'] = async (storeId, vendorId) => {
    try {
      console.log('🔧 assignVendorToStore:', { storeId, vendorId })

      const maxOrder = Math.max(
        0,
        ...storeVendorAssignments.filter(a => a.storeId === storeId).map(a => a.displayOrder)
      )

      const { data, error } = await assignVendorToStoreDb(storeId, vendorId, maxOrder + 1)

      if (error) {
        console.error('❌ assignVendorToStoreDb error:', error)
        throw new Error(error.message)
      }

      console.log('✅ assignVendorToStoreDb success, updating state')

      const newAssignment = {
        storeId,
        vendorId,
        displayOrder: maxOrder + 1
      }

      setStoreVendorAssignments(prev => {
        const updated = [...prev, newAssignment]
        console.log('📦 Updated storeVendorAssignments:', updated)
        return updated
      })
    } catch (err) {
      console.error('❌ 業者割り当てエラー:', err)
      throw err
    }
  }

  const unassignVendorFromStore: AdminCtx['unassignVendorFromStore'] = async (storeId, vendorId) => {
    try {
      const { error } = await removeVendorFromStoreDb(storeId, vendorId)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setStoreVendorAssignments(prev => prev.filter(a => !(a.storeId === storeId && a.vendorId === vendorId)))
    } catch (err) {
      console.error('❌ 業者割り当て解除エラー:', err)
      throw err
    }
  }

  const value = useMemo<AdminCtx>(() => ({
    stores, targets, vendors, storeVendorAssignments,
    addStore, updateStore, deleteStore, upsertTarget, deleteTarget,
    addVendor, updateVendor, deleteVendor, getStoreVendors,
    assignVendorToStore, unassignVendorFromStore
  }), [stores, targets, vendors, storeVendorAssignments])

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider')
  return ctx
}