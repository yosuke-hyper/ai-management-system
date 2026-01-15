import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/authcontext'
import { useAvatar } from '@/contexts/avatarcontext'
import toast from 'react-hot-toast'

export interface AvatarItem {
  id: string
  category: 'head' | 'outfit' | 'hand'
  name: string
  price: number
  image_path: string
  is_default: boolean
  description: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  created_at: string
}

export interface EquippedItems {
  head: string | null
  outfit: string | null
  hand: string | null
}

// 内部で使用するID-based equipped items
interface EquippedItemsById {
  head: string | null
  outfit: string | null
  hand: string | null
}

export function useAvatarItems() {
  const { user, refreshUser } = useAuth()
  const { updateEquippedItems, equippedItems: contextEquippedItems } = useAvatar()
  const [items, setItems] = useState<AvatarItem[]>([])
  const [unlockedItems, setUnlockedItems] = useState<string[]>([])
  const [equippedItemsById, setEquippedItemsById] = useState<EquippedItemsById>({
    head: null,
    outfit: null,
    hand: null
  })
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [equipping, setEquipping] = useState(false)

  const getEquippedImagePath = (itemId: string | null): string | null => {
    if (!itemId) return null
    return items.find(item => item.id === itemId)?.image_path || null
  }

  const equippedItems: EquippedItems = {
    head: equippedItemsById.head ? getEquippedImagePath(equippedItemsById.head) : null,
    outfit: equippedItemsById.outfit ? getEquippedImagePath(equippedItemsById.outfit) : null,
    hand: equippedItemsById.hand ? getEquippedImagePath(equippedItemsById.hand) : null
  }

  useEffect(() => {
    loadItems()
    loadUserData()
  }, [user])

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('avatar_items')
        .select('*')
        .order('category', { ascending: true })
        .order('price', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Failed to load avatar items:', error)
      toast.error('アイテムの読み込みに失敗しました')
    }
  }

  const loadUserData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('unlocked_items, equipped_items')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setUnlockedItems(Array.isArray(data.unlocked_items) ? data.unlocked_items : [])
        setEquippedItemsById(data.equipped_items || {
          head: null,
          outfit: null,
          hand: null
        })
      }
    } catch (error) {
      console.error('Failed to load user avatar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const purchaseItem = async (itemId: string, cost: number) => {
    if (!user) {
      toast.error('ログインが必要です')
      return false
    }

    setPurchasing(true)

    try {
      const { data, error } = await supabase.rpc('purchase_avatar_item', {
        p_item_id: itemId,
        p_cost: cost
      })

      if (error) throw error

      if (data?.success) {
        toast.success(`アイテムを購入しました！`)
        setUnlockedItems(prev => [...prev, itemId])
        await refreshUser()
        return true
      } else {
        toast.error(data?.error || '購入に失敗しました')
        return false
      }
    } catch (error: any) {
      console.error('Purchase failed:', error)
      toast.error(error.message || 'アイテムの購入に失敗しました')
      return false
    } finally {
      setPurchasing(false)
    }
  }

  const equipItem = async (itemId: string) => {
    if (!user) {
      toast.error('ログインが必要です')
      return false
    }

    setEquipping(true)

    try {
      const { data, error } = await supabase.rpc('equip_avatar_item', {
        p_item_id: itemId
      })

      if (error) throw error

      if (data?.success) {
        toast.success('装備を変更しました')
        const newEquippedById = data.equipped_items as EquippedItemsById
        setEquippedItemsById(newEquippedById)
        const newEquippedItems: EquippedItems = {
          head: newEquippedById.head ? items.find(item => item.id === newEquippedById.head)?.image_path || null : null,
          outfit: newEquippedById.outfit ? items.find(item => item.id === newEquippedById.outfit)?.image_path || null : null,
          hand: newEquippedById.hand ? items.find(item => item.id === newEquippedById.hand)?.image_path || null : null
        }
        updateEquippedItems(newEquippedItems)
        return true
      } else {
        toast.error(data?.error || '装備に失敗しました')
        return false
      }
    } catch (error: any) {
      console.error('Equip failed:', error)
      toast.error(error.message || '装備の変更に失敗しました')
      return false
    } finally {
      setEquipping(false)
    }
  }

  const unequipItem = async (category: 'head' | 'outfit' | 'hand') => {
    if (!user) {
      toast.error('ログインが必要です')
      return false
    }

    setEquipping(true)

    try {
      const { data, error } = await supabase.rpc('unequip_avatar_item', {
        p_category: category
      })

      if (error) throw error

      if (data?.success) {
        toast.success('装備を外しました')
        const newEquippedById = data.equipped_items as EquippedItemsById
        setEquippedItemsById(newEquippedById)
        const newEquippedItems: EquippedItems = {
          head: newEquippedById.head ? items.find(item => item.id === newEquippedById.head)?.image_path || null : null,
          outfit: newEquippedById.outfit ? items.find(item => item.id === newEquippedById.outfit)?.image_path || null : null,
          hand: newEquippedById.hand ? items.find(item => item.id === newEquippedById.hand)?.image_path || null : null
        }
        updateEquippedItems(newEquippedItems)
        return true
      } else {
        toast.error(data?.error || '装備解除に失敗しました')
        return false
      }
    } catch (error: any) {
      console.error('Unequip failed:', error)
      toast.error(error.message || '装備の解除に失敗しました')
      return false
    } finally {
      setEquipping(false)
    }
  }

  const isItemUnlocked = (itemId: string) => {
    return unlockedItems.includes(itemId)
  }

  const isItemEquipped = (itemId: string) => {
    return Object.values(equippedItemsById).includes(itemId)
  }

  const getItemsByCategory = (category: 'head' | 'outfit' | 'hand') => {
    return items.filter(item => item.category === category)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-600 border-slate-300'
      case 'rare': return 'text-blue-600 border-blue-400'
      case 'epic': return 'text-purple-600 border-purple-400'
      case 'legendary': return 'text-amber-600 border-amber-400'
      default: return 'text-slate-600 border-slate-300'
    }
  }

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'コモン'
      case 'rare': return 'レア'
      case 'epic': return 'エピック'
      case 'legendary': return '伝説'
      default: return rarity
    }
  }

  return {
    items,
    unlockedItems,
    equippedItems, // 画像パス版（表示用）
    equippedItemsById, // ID版（管理用）
    loading,
    purchasing,
    equipping,
    purchaseItem,
    equipItem,
    unequipItem,
    isItemUnlocked,
    isItemEquipped,
    getItemsByCategory,
    getRarityColor,
    getRarityLabel
  }
}
