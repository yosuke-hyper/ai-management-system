import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, isSupabaseReady } from '@/lib/supabase'
import type { Organization, OrganizationMember } from '@/types'

interface OrganizationContextType {
  organization: Organization | null
  organizationRole: 'owner' | 'admin' | 'member' | null
  loading: boolean
  isInitialized: boolean
  refreshOrganization: () => Promise<void>
  isOwner: boolean
  isAdmin: boolean
  canManageOrganization: boolean
  withinLimits: {
    stores: boolean
    users: boolean
    aiRequests: boolean
  }
  currentUsage: {
    stores: number
    users: number
    aiRequestsThisMonth: number
  }
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export const OrganizationProvider: React.FC<{ children: React.ReactNode; userId: string | null }> = ({
  children,
  userId
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationRole, setOrganizationRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentUsage, setCurrentUsage] = useState({
    stores: 0,
    users: 0,
    aiRequestsThisMonth: 0
  })

  const fetchOrganization = useCallback(async () => {
    if (!userId || !isSupabaseReady()) {
      setLoading(false)
      setIsInitialized(true)
      return
    }

    try {
      setLoading(true)

      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .maybeSingle()

      if (memberError) {
        console.error('Failed to fetch organization membership:', memberError)
        return
      }

      if (!memberData) {
        console.log('User is not a member of any organization')
        setOrganization(null)
        setOrganizationRole(null)
        return
      }

      setOrganizationRole(memberData.role)

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.organization_id)
        .single()

      if (orgError) {
        console.error('Failed to fetch organization:', orgError)
        return
      }

      setOrganization({
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
        email: orgData.email,
        phone: orgData.phone,
        subscriptionStatus: orgData.subscription_status,
        subscriptionPlan: orgData.subscription_plan,
        trialEndsAt: orgData.trial_ends_at,
        maxStores: orgData.max_stores,
        maxUsers: orgData.max_users,
        maxAiRequestsPerMonth: orgData.max_ai_requests_per_month,
        settings: orgData.settings,
        createdAt: orgData.created_at,
        updatedAt: orgData.updated_at
      })

      const { count: storesCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', memberData.organization_id)

      const { count: usersCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', memberData.organization_id)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: aiRequestsCount } = await supabase
        .from('ai_usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', memberData.organization_id)
        .gte('created_at', startOfMonth.toISOString())

      setCurrentUsage({
        stores: storesCount || 0,
        users: usersCount || 0,
        aiRequestsThisMonth: aiRequestsCount || 0
      })

    } catch (error) {
      console.error('Error fetching organization:', error)
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }, [userId])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const isOwner = organizationRole === 'owner'
  const isAdmin = organizationRole === 'admin' || organizationRole === 'owner'
  const canManageOrganization = isAdmin

  const withinLimits = useMemo(() => ({
    stores: !organization || currentUsage.stores < organization.maxStores,
    users: !organization || currentUsage.users < organization.maxUsers,
    aiRequests: !organization || currentUsage.aiRequestsThisMonth < organization.maxAiRequestsPerMonth
  }), [organization, currentUsage])

  const value = useMemo<OrganizationContextType>(() => ({
    organization,
    organizationRole,
    loading,
    isInitialized,
    refreshOrganization: fetchOrganization,
    isOwner,
    isAdmin,
    canManageOrganization,
    withinLimits,
    currentUsage
  }), [
    organization,
    organizationRole,
    loading,
    isInitialized,
    fetchOrganization,
    isOwner,
    isAdmin,
    canManageOrganization,
    withinLimits,
    currentUsage
  ])

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
