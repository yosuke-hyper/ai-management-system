import { useMemo } from 'react'
import { useAdminData } from '@/contexts/admindatacontext'
import type { Brand } from '@/types'

export const useBrands = () => {
  const { brands } = useAdminData()

  const activeBrands = useMemo(() => {
    return brands.filter(b => b.isActive)
  }, [brands])

  const getBrandById = useMemo(() => {
    return (brandId: string | undefined | null): Brand | undefined => {
      if (!brandId) return undefined
      return brands.find(b => b.id === brandId)
    }
  }, [brands])

  const getBrandsByType = useMemo(() => {
    return (type: string): Brand[] => {
      return activeBrands.filter(b => b.type === type)
    }
  }, [activeBrands])

  return {
    brands: activeBrands,
    allBrands: brands,
    getBrandById,
    getBrandsByType
  }
}
