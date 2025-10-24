import React, { createContext, useContext, useState } from 'react'

type StoreContextType = { 
  storeId: string
  setStoreId: (storeId: string) => void 
}

const StoreContext = createContext<StoreContextType | null>(null)

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeId, setStoreId] = useState<string>('all')
  
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