import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, isSupabaseReady } from '@/lib/supabase'
import { subscriptionService } from '@/services/subscriptionservice'
import type { Organization, OrganizationMember } from '@/types'

interface OrganizationContextType {
  organization: Organization | null
  organizationId: string | null
  organizationRole: 'owner' | 'admin' | 'manager' | 'staff' | null
  loading: boolean
  isInitialized: boolean
  refreshOrganization: () => Promise<void>
  setOrganization: (org: Organization) => void
  isOwner: boolean
  isAdmin: boolean
  isManager: boolean
  canManageOrganization: boolean
  canManageStores: boolean
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
  subscriptionStatus: {
    isReadOnly: boolean
    isTrialing: boolean
    isExpired: boolean
    daysLeft: number
    shouldAlert: boolean
  }
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export const OrganizationProvider: React.FC<{ children: React.ReactNode; userId: string | null }> = ({
  children,
  userId
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationRole, setOrganizationRole] = useState<'owner' | 'admin' | 'manager' | 'staff' | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentUsage, setCurrentUsage] = useState({
    stores: 0,
    users: 0,
    aiRequestsThisMonth: 0
  })
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isReadOnly: false,
    isTrialing: false,
    isExpired: false,
    daysLeft: 0,
    shouldAlert: false
  })

  const fetchOrganization = useCallback(async () => {
    if (!userId || !isSupabaseReady()) {
      setLoading(false)
      setIsInitialized(true)
      return
    }

    // デモモードの場合はスキップ（demo-userはUUID形式ではないためエラーになる）
    if (userId === 'demo-user') {
      setLoading(false)
      setIsInitialized(true)
      return
    }

    try {
      setLoading(true)

      // スーパー管理者が組織を選択している場合
      const savedOrgId = localStorage.getItem('superadmin_selected_org')

      if (savedOrgId) {
        console.log('🎯 Super admin selected organization:', savedOrgId)

        // 直接組織データを取得（メンバーシップをチェックしない）
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', savedOrgId)
          .single()

        if (orgError || !orgData) {
          console.log('⚠️ Saved organization not found, clearing selection')
          localStorage.removeItem('superadmin_selected_org')
          // 通常のフローに戻る
        } else {
          // スーパー管理者として組織を設定
          console.log('✅ Super admin accessing organization:', orgData.name)
          console.log('🎯 Setting organizationRole to "owner" for super admin')
          setOrganizationRole('owner') // スーパー管理者は常にowner権限

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

          // 使用状況を取得
          const { count: storesCount } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', savedOrgId)

          const { count: usersCount } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', savedOrgId)

          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { count: aiRequestsCount } = await supabase
            .from('ai_usage_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', savedOrgId)
            .gte('created_at', startOfMonth.toISOString())

          setCurrentUsage({
            stores: storesCount || 0,
            users: usersCount || 0,
            aiRequestsThisMonth: aiRequestsCount || 0
          })

          const status = await subscriptionService.getSubscriptionStatus(
            savedOrgId,
            orgData.is_demo
          )
          setSubscriptionStatus({
            isReadOnly: status.isReadOnly,
            isTrialing: status.isTrialing,
            isExpired: status.isExpired,
            daysLeft: status.daysLeft,
            shouldAlert: status.shouldAlert
          })

          setLoading(false)
          setIsInitialized(true)
          return
        }
      }

      // 通常のフロー: organization_membersから取得
      const { data: memberDataList, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations!inner(is_demo)')
        .eq('user_id', userId)

      if (memberError) {
        console.error('Failed to fetch organization membership:', memberError)
        return
      }

      if (!memberDataList || memberDataList.length === 0) {
        console.log('User is not a member of any organization')
        setOrganization(null)
        setOrganizationRole(null)
        return
      }

      // デモ組織を優先
      const demoMembership = memberDataList.find((m: any) => m.organizations?.is_demo === true)
      const memberData = demoMembership || memberDataList[0]

      console.log('🎯 Setting organizationRole from membership:', memberData.role)
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

      // サブスクリプション状態を取得（デモ/本番で異なるロジック）
      const status = await subscriptionService.getSubscriptionStatus(
        memberData.organization_id,
        orgData.is_demo
      )
      setSubscriptionStatus({
        isReadOnly: status.isReadOnly,
        isTrialing: status.isTrialing,
        isExpired: status.isExpired,
        daysLeft: status.daysLeft,
        shouldAlert: status.shouldAlert
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
  const isManager = organizationRole === 'manager' || isAdmin
  const canManageOrganization = isAdmin
  const canManageStores = isManager

  const withinLimits = useMemo(() => ({
    stores: !organization || currentUsage.stores < organization.maxStores,
    users: !organization || currentUsage.users < organization.maxUsers,
    aiRequests: !organization || currentUsage.aiRequestsThisMonth < organization.maxAiRequestsPerMonth
  }), [organization, currentUsage])

  const value = useMemo<OrganizationContextType>(() => ({
    organization,
    organizationId: organization?.id || null,
    organizationRole,
    loading,
    isInitialized,
    refreshOrganization: fetchOrganization,
    setOrganization,
    isOwner,
    isAdmin,
    isManager,
    canManageOrganization,
    canManageStores,
    withinLimits,
    currentUsage,
    subscriptionStatus
  }), [
    organization,
    organizationRole,
    loading,
    isInitialized,
    fetchOrganization,
    isOwner,
    isAdmin,
    isManager,
    canManageOrganization,
    canManageStores,
    withinLimits,
    currentUsage,
    subscriptionStatus
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
