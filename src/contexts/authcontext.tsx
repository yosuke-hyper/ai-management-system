import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase, isSupabaseReady } from '@/lib/supabase'
import type { User as SbUser } from '@supabase/supabase-js'

type Role = 'staff' | 'manager' | 'admin' | 'owner'

interface SuperAdminPermissions {
  view_all_errors: boolean;
  view_all_organizations: boolean;
  manage_subscriptions: boolean;
  manage_users: boolean;
  delete_data: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeIds?: string[];
  assignedStores?: {id:string;name:string}[];
  organizationId?: string;
  isSuperAdmin?: boolean;
  superAdminPermissions?: SuperAdminPermissions;
  points?: number;
  totalPoints?: number;
}

type Ctx = {
  user: User | null
  loading: boolean
  isInitialized: boolean
  isAuthenticated: boolean
  isSupabaseMode: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: null | { message: string } }>
  signUp: (email: string, password: string, name: string, role: Role, organizationName?: string, storeCount?: number) => Promise<{ data: any; error: null | { message: string } }>
  signOut: () => Promise<{ error: unknown | null }>
  refreshUser: () => Promise<void>
  refreshStores: () => Promise<void>
  enterDemoMode: () => void
  exitDemoMode: () => void
  hasPermission: (role: Role) => boolean
  canAccessStore: (storeId: string) => boolean
  getAccessibleStores: () => Array<{ id: string; name: string; brandId?: string | null }>
  allStores: Array<{ id: string; name: string; brandId?: string | null }>
}

const AuthContext = createContext<Ctx | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [allStores, setAllStores] = useState<Array<{ id: string; name: string; brandId?: string | null }>>([])
  const [isDemoMode, setIsDemoMode] = useState(false)

  const initOnceRef = useRef(false)

  const composeUser = useCallback(async (sbUser: SbUser): Promise<User> => {
    let name = sbUser.email?.split('@')[0] ?? 'user'
    let role: Role = 'staff'
    let assigned: { id: string; name: string }[] = []
    let organizationId: string | undefined = undefined
    let points: number | undefined = undefined
    let totalPoints: number | undefined = undefined

    console.log('🔍 Fetching user data for:', sbUser.id)

    if (sbUser.user_metadata?.name) {
      name = sbUser.user_metadata.name
    }

    // ✅ 優先順位1: organization_membersからroleとorganization_idを取得
    try {
      const memberPromise = supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', sbUser.id)
        .maybeSingle()
      const memberTimeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 3000)
      )

      const { data: memberData } = await Promise.race([memberPromise, memberTimeout])

      if (memberData) {
        console.log('✅ Role from organization_members:', memberData.role)
        role = memberData.role as Role
        organizationId = memberData.organization_id
      } else {
        console.warn('⚠️ No organization membership found')
      }
    } catch (e) {
      console.error('❌ Failed to fetch organization membership:', e)
    }

    // ✅ 優先順位2: profilesからnameとフォールバック情報を取得
    try {
      const profilePromise = supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle()
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 5000)
      )

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise])

      if (error) {
        console.error('❌ Profile fetch error:', error)
      } else if (profile) {
        console.log('✅ Profile found:', { name: profile.name, profileRole: profile.role })
        // nameは常にprofilesから取得
        if (profile?.name) name = profile.name

        // ポイント情報を取得
        if (profile?.points !== undefined) points = profile.points
        if (profile?.total_points !== undefined) totalPoints = profile.total_points

        // roleとorganizationIdはorganization_membersから取得できなかった場合のみ使用
        if (!organizationId && profile?.organization_id) {
          console.log('ℹ️ Using organization_id from profiles (fallback)')
          organizationId = profile.organization_id
        }
        if (role === 'staff' && profile?.role && !organizationId) {
          console.log('ℹ️ Using role from profiles (fallback)')
          role = profile.role as Role
        }
      } else {
        console.warn('⚠️ No profile found, using defaults')
      }
    } catch (e) {
      console.error('💥 Profile fetch exception:', e)
    }

    // ✅ ストア割り当て取得（タイムアウト付き）
    try {
      const assignPromise = supabase
        .from('store_assignments')
        .select('store_id, stores!inner(id, name)')
        .eq('user_id', sbUser.id)
      const assignTimeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 3000)
      )
      const { data: assigns } = await Promise.race([assignPromise, assignTimeout])
      assigned = (assigns ?? []).map((a: any) => ({ id: a.stores.id, name: a.stores.name }))
    } catch (e) {
      console.error('Failed to fetch store assignments:', e)
    }

    // ✅ スーパー管理者チェック
    let isSuperAdmin = false
    let superAdminPermissions: SuperAdminPermissions | undefined = undefined

    try {
      const { data: superAdminData } = await supabase
        .from('system_admins')
        .select('permissions, is_active, expires_at')
        .eq('user_id', sbUser.id)
        .maybeSingle()

      if (superAdminData?.is_active) {
        // 有効期限チェック
        if (!superAdminData.expires_at || new Date(superAdminData.expires_at) > new Date()) {
          isSuperAdmin = true
          superAdminPermissions = superAdminData.permissions as SuperAdminPermissions
          console.log('👑 Super admin detected:', superAdminPermissions)
        }
      }
    } catch (e) {
      console.error('Failed to check super admin status:', e)
    }

    // ✅ スーパー管理者の場合、組織コンテキストを設定
    if (isSuperAdmin) {
      const savedOrgId = localStorage.getItem('superadmin_selected_org')
      if (savedOrgId) {
        try {
          const { setSelectedOrganizationContext } = await import('@/services/organizationservice')
          await setSelectedOrganizationContext(savedOrgId)
          console.log('✅ Organization context set in composeUser:', savedOrgId)
        } catch (error) {
          console.error('❌ Failed to set organization context in composeUser:', error)
        }
      }
    }

    console.log('Composed user:', { id: sbUser.id, email: sbUser.email, role, name, organizationId, isSuperAdmin })

    return {
      id: sbUser.id,
      name,
      email: sbUser.email ?? '',
      role,
      storeIds: assigned.map(s => s.id),
      assignedStores: assigned,
      organizationId,
      points,
      totalPoints,
      isSuperAdmin,
      superAdminPermissions,
    }
  }, [])


  useEffect(() => {
    if (initOnceRef.current) return
    initOnceRef.current = true

    console.log('🔐 AuthContext: Starting initialization')

    const init = async () => {
      const demoMode = localStorage.getItem('demo_mode')
      if (demoMode === 'true') {
        console.log('🎭 Demo mode detected')

        // Check if this is an individual demo session (has demo_org_id)
        const demoOrgId = localStorage.getItem('demo_org_id')
        const demoSessionId = localStorage.getItem('demo_session_id')

        if (demoOrgId && demoOrgId !== 'fixed-demo-org') {
          console.log('🎭 Individual demo session detected:', demoOrgId)
          await enterIndividualDemoMode(demoOrgId, demoSessionId || '')
        } else {
          console.log('🎭 Fixed demo mode detected')
          await enterDemoMode()
        }

        setIsInitialized(true)
        return
      }

      if (!isSupabaseReady()) {
        console.log('⚠️ Supabase not ready, marking as initialized')
        setIsInitialized(true)
        return
      }
      try {
        console.log('🔍 Getting session...')
        const sessionPromise = supabase.auth.getSession()
        const timeout = new Promise<{data:{session:null}}>(res => setTimeout(() => res({data:{session:null}}), 3000))
        const { data: { session } } = await Promise.race([sessionPromise, timeout]) as any
        if (session?.user) {
          console.log('✅ Session found:', session.user.email)
          const composed = await composeUser(session.user)
          setUser(composed)

          // Clear any demo stores first
          setAllStores([])

          // スーパー管理者が組織を切り替えている場合は、その組織の店舗を読み込む
          const savedOrgId = localStorage.getItem('superadmin_selected_org')
          const targetOrgId = savedOrgId || composed.organizationId

          // 組織コンテキストを設定（スーパー管理者の場合のみ）
          if (savedOrgId && composed.isSuperAdmin) {
            try {
              const { setSelectedOrganizationContext } = await import('@/services/organizationservice')
              await setSelectedOrganizationContext(savedOrgId)
              console.log('✅ Organization context set for super admin:', savedOrgId)
            } catch (error) {
              console.error('❌ Failed to set organization context:', error)
            }
          }

          // 組織IDでフィルタリングして店舗を取得
          if (targetOrgId) {
            if (savedOrgId) {
              console.log('🎯 Loading stores for super admin selected organization:', savedOrgId)
            } else {
              console.log('🏪 Loading stores for organization:', targetOrgId)
            }

            const { data: stores } = await supabase
              .from('stores')
              .select('id, name, brand_id')
              .eq('organization_id', targetOrgId)
              .eq('is_active', true)
              .order('name')
            console.log('🏪 Stores loaded:', stores?.length || 0, 'stores')
            if (stores && stores.length > 0) {
              const storesWithBrand = stores.map(s => ({
                id: s.id,
                name: s.name,
                brandId: s.brand_id
              }))
              console.log('🏪 Setting allStores:', storesWithBrand)
              setAllStores(storesWithBrand)
            } else {
              console.warn('⚠️ No stores found for organization')
              setAllStores([])
            }
          }
        } else {
          console.log('❌ No session found')
          setAllStores([])
        }
      } catch (err) {
        console.error('❌ Init error:', err)
      } finally {
        console.log('✅ AuthContext: Initialization complete')
        setIsInitialized(true)
      }
    }
    init()
  }, [composeUser])

  useEffect(() => {
    // Supabase未設定は購読しない
    if (!isSupabaseReady()) {
      setIsInitialized(true)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 onAuthStateChange:', event)

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        ;(async () => {
          try {
            const composed = await composeUser(session.user)
            setUser(composed)
          } catch (err) {
            console.error('❌ compose failed:', err)
            setUser(null)
          }
        })()
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session?.user)) {
        setUser(null)
      }
    })

    setIsInitialized(true)
    return () => subscription.unsubscribe()
  }, [composeUser])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseReady()) return { data: null, error: { message: 'Supabase not configured' } }

    // Clear demo mode when signing in to production account
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_session_id')
    localStorage.removeItem('demo_org_id')
    localStorage.removeItem('demo_share_token')
    localStorage.removeItem('demo_expires_at')
    setIsDemoMode(false)

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { data: null, error: { message: error.message } }
      const u = await composeUser(data.user)
      setUser(u)
      return { data: u, error: null }
    } finally {
      setLoading(false)
    }
  }, [composeUser])

  const signUp = useCallback(async (email: string, password: string, name: string, role: Role = 'owner', organizationName?: string, storeCount: number = 1) => {
    if (!isSupabaseReady()) return { data: null, error: { message: 'Supabase not configured' } }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            organizationName: organizationName || `${name}の組織`,
            contractedStores: storeCount
          }
        }
      })
      if (error) return { data: null, error: { message: error.message } }
      return { data, error: null }
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    const currentUserId = user?.id
    const { error } = await supabase.auth.signOut()

    // Clear user-specific localStorage data on logout
    if (currentUserId) {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith(`autoSave_${currentUserId}_`) ||
          key.startsWith(`lastReport_${currentUserId}_`) ||
          key === `userReports_${currentUserId}`
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }

    setUser(null)
    setIsDemoMode(false)
    localStorage.removeItem('demo_mode')
    return { error }
  }, [user?.id])

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const composed = await composeUser(session.user)
        setUser(composed)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [composeUser])

  const enterIndividualDemoMode = useCallback(async (demoOrgId: string, demoSessionId: string) => {
    console.log('🎭 Entering individual demo mode - using demo_* tables')
    setIsDemoMode(true)
    localStorage.setItem('demo_mode', 'true')

    // Clear old conversation history from previous sessions
    localStorage.removeItem('last_conv')
    console.log('🗑️ Cleared old conversation history')

    // Set demo user with the specific organization
    setUser({
      id: `demo-user-${demoSessionId}`,
      name: 'デモユーザー',
      email: 'demo@example.com',
      role: 'admin',
      organizationId: demoOrgId,
    })

    // Load demo stores for this specific organization (with brand info)
    try {
      const { data: stores } = await supabase
        .from('demo_stores')
        .select(`
          id,
          name,
          demo_org_id,
          brand_id,
          brand:fixed_demo_brands(
            id,
            name,
            display_name,
            icon,
            color
          )
        `)
        .eq('demo_org_id', demoOrgId)
        .order('name')

      console.log('🏪 Individual demo stores loaded:', stores?.length || 0, 'stores')

      if (stores) {
        const storesWithBrand = stores.map(s => ({
          id: s.id,
          name: s.name,
          brandId: s.brand_id,
          brand: s.brand
        }))
        setAllStores(storesWithBrand)
      } else {
        console.warn('⚠️ No demo stores found for org:', demoOrgId)
      }
    } catch (error) {
      console.error('❌ Failed to fetch individual demo stores:', error)
    }
  }, [])

  const enterDemoMode = useCallback(async () => {
    console.log('🎭 Entering demo mode - using fixed_demo_* tables only')
    setIsDemoMode(true)
    localStorage.setItem('demo_mode', 'true')

    // Clear old conversation history from previous sessions
    localStorage.removeItem('last_conv')
    console.log('🗑️ Cleared old conversation history')

    // Set fixed demo session ID and share token for AI features
    // This uses the permanent demo session created in the database
    const FIXED_DEMO_SESSION_ID = '00000000-0000-0000-0000-000000000002'
    localStorage.setItem('demo_session_id', FIXED_DEMO_SESSION_ID)
    localStorage.setItem('demo_share_token', 'fixed-demo-session')
    console.log('🎭 Using fixed demo session ID for AI features')

    // デモモードでは固定の組織IDとユーザーIDを使用
    setUser({
      id: 'demo-user',
      name: 'デモユーザー',
      email: 'demo@example.com',
      role: 'admin',
      organizationId: 'fixed-demo-org'
    })

    // デモ店舗データを取得（fixed_demo_storesのみ参照、業態情報も含む）
    try {
      const { data: stores } = await supabase
        .from('fixed_demo_stores')
        .select(`
          id,
          name,
          brand_id,
          brand:fixed_demo_brands(
            id,
            name,
            display_name,
            icon,
            color
          )
        `)
        .order('name')

      console.log('🏪 Demo stores loaded:', stores?.length || 0, 'stores')

      if (stores) {
        // brandIdを含めるように変換
        const storesWithBrand = stores.map(s => ({
          id: s.id,
          name: s.name,
          brandId: s.brand_id
        }))
        setAllStores(storesWithBrand)
      } else {
        console.warn('⚠️ No demo stores found in fixed_demo_stores table')
      }
    } catch (error) {
      console.error('❌ Failed to fetch demo stores:', error)
    }
  }, [])

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false)
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_session_id')
    localStorage.removeItem('demo_share_token')
    setUser(null)
    setAllStores([])  // Clear demo stores
  }, [])

  const refreshStores = useCallback(async () => {
    if (!user?.organizationId) {
      console.log('⚠️ refreshStores: No organizationId available')
      return
    }

    try {
      console.log('🔄 refreshStores: Refreshing stores for organization:', user.organizationId)
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, brand_id')
        .eq('organization_id', user.organizationId)
        .eq('is_active', true)
        .order('name')

      if (stores && stores.length > 0) {
        const storesWithBrand = stores.map(s => ({
          id: s.id,
          name: s.name,
          brandId: s.brand_id
        }))
        console.log('✅ refreshStores: Stores refreshed:', storesWithBrand.length)
        setAllStores(storesWithBrand)
      } else {
        console.log('⚠️ refreshStores: No stores found')
        setAllStores([])
      }
    } catch (error) {
      console.error('❌ refreshStores: Error:', error)
    }
  }, [user?.organizationId])

  const hasPermission = useCallback((req: Role) => {
    if (!user) return false
    const levels = { staff: 1, manager: 2, admin: 3, owner: 4 }
    return levels[user.role] >= levels[req]
  }, [user])

  const canAccessStore = useCallback((storeId: string) => {
    if (!user) return false
    // 'all' は owner と admin のみアクセス可能
    if (storeId === 'all') {
      return user.role === 'admin' || user.role === 'owner'
    }
    return user.role === 'admin' || user.role === 'owner' || user.storeIds?.includes(storeId) === true
  }, [user])

  const getAccessibleStores = useCallback(() => {
    // In demo mode, only return demo stores
    if (isDemoMode) {
      console.log('🎭 Demo mode active, returning demo stores only:', allStores.length)
      return allStores
    }

    const stores = (user?.role === 'admin' || user?.role === 'owner') ? allStores : (user?.assignedStores ?? [])
    console.log('🔍 getAccessibleStores called:', {
      userRole: user?.role,
      allStoresCount: allStores.length,
      assignedStoresCount: user?.assignedStores?.length || 0,
      returningCount: stores.length,
      isDemoMode: false
    })
    return stores
  }, [user, allStores, isDemoMode])

  const value = useMemo<Ctx>(() => ({
    user,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    isSupabaseMode: isSupabaseReady(),
    isDemoMode,
    signIn, signUp, signOut, refreshUser, refreshStores,
    enterDemoMode, exitDemoMode,
    hasPermission,
    canAccessStore,
    getAccessibleStores,
    allStores,
  }), [user, loading, isInitialized, allStores, isDemoMode, signIn, signUp, signOut, refreshUser, refreshStores, enterDemoMode, exitDemoMode, hasPermission, canAccessStore, getAccessibleStores])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
