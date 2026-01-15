import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './authcontext'
import { supabase } from '../lib/supabase'

type StoreContextType = {
  storeId: string
  setStoreId: (storeId: string) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeId, setStoreId] = useState<string>('all')
  const { user, organization } = useAuth()

  useEffect(() => {
    if (!user?.id || !organization?.id) return

    const initializeStoreSelection = async () => {
      try {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('store_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (memberData?.store_id) {
          setStoreId(memberData.store_id)
          return
        }

        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .limit(2)

        if (stores && stores.length === 1) {
          setStoreId(stores[0].id)
        }
      } catch (error) {
        console.error('Failed to initialize store selection:', error)
      }
    }

    initializeStoreSelection()
  }, [user?.id, organization?.id])

  return (
    <StoreContext.Provider value={{ storeId, setStoreId }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}