import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseReady } from '@/lib/supabase'
import type { User as SbUser } from '@supabase/supabase-js'

type Role = 'staff' | 'manager' | 'admin'
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeIds?: string[];
  assignedStores?: {id:string;name:string}[];
  organizationId?: string;
}

type Ctx = {
  user: User | null
  loading: boolean
  isInitialized: boolean
  isAuthenticated: boolean
  isSupabaseMode: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: null | { message: string } }>
  signUp: (email: string, password: string, name: string, role: Role, organizationName?: string) => Promise<{ data: any; error: null | { message: string } }>
  signOut: () => Promise<{ error: unknown | null }>
  hasPermission: (role: Role) => boolean
  canAccessStore: (storeId: string) => boolean
  getAccessibleStores: () => Array<{ id: string; name: string }>
  allStores: Array<{ id: string; name: string }>
}

const AuthContext = createContext<Ctx | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [allStores, setAllStores] = useState<Array<{ id: string; name: string }>>([])

  const initOnceRef = useRef(false)
  const subscribedRef = useRef(false)

  const composeUser = useCallback(async (sbUser: SbUser): Promise<User> => {
    let name = sbUser.email?.split('@')[0] ?? 'user'
    let role: Role = 'staff'
    let assigned: { id: string; name: string }[] = []
    let organizationId: string | undefined = undefined

    console.log('🔍 Fetching profile for user:', sbUser.id)

    // ✅ タイムアウト付きでプロファイル取得
    try {
      const profilePromise = supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle()
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 5000)
      )

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise])

      if (error) {
        console.error('❌ Profile fetch error:', error)
      } else if (profile) {
        console.log('✅ Profile found:', { name: profile.name, role: profile.role })
        if (profile?.name) name = profile.name
        if (profile?.role) role = profile.role as Role
        if (profile?.organization_id) organizationId = profile.organization_id
      } else {
        console.warn('⚠️ No profile found, using defaults')
      }
    } catch (e) {
      console.error('💥 Profile fetch exception:', e)
    }

    // ✅ 組織IDが取得できていない場合のみフェッチ
    if (!organizationId) {
      try {
        const orgPromise = supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', sbUser.id)
          .maybeSingle()
        const orgTimeout = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 3000)
        )
        const { data: memberData } = await Promise.race([orgPromise, orgTimeout])
        if (memberData?.organization_id) {
          organizationId = memberData.organization_id
        }
      } catch (e) {
        console.error('Failed to fetch organization membership:', e)
      }
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

    console.log('Composed user:', { id: sbUser.id, email: sbUser.email, role, name, organizationId })

    return {
      id: sbUser.id,
      name,
      email: sbUser.email ?? '',
      role,
      storeIds: assigned.map(s => s.id),
      assignedStores: assigned,
      organizationId,
    }
  }, [])

  useEffect(() => {
    if (initOnceRef.current) return
    initOnceRef.current = true

    const init = async () => {
      if (!isSupabaseReady()) {
        setIsInitialized(true)
        return
      }
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeout = new Promise<{data:{session:null}}>(res => setTimeout(() => res({data:{session:null}}), 3000))
        const { data: { session } } = await Promise.race([sessionPromise, timeout]) as any
        if (session?.user) {
          setUser(await composeUser(session.user))
        }

        const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true).order('name')
        if (stores) {
          setAllStores(stores)
        }
      } finally {
        setIsInitialized(true)
      }
    }
    init()
  }, [composeUser])

  useEffect(() => {
    if (subscribedRef.current) return
    subscribedRef.current = true

    // ✅ CRITICAL: コールバックはasyncにせず、内部でasyncブロックを実行
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 onAuthStateChange:', event)

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // ✅ 非同期処理は即座実行関数で囲む（デッドロック防止）
        (async () => {
          try {
            const composedUser = await composeUser(session.user)
            setUser(composedUser)
          } catch (err) {
            console.error('❌ Failed to compose user:', err)
            setUser(null)
          }
        })()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [composeUser])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseReady()) return { data: null, error: { message: 'Supabase not configured' } }
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

  const signUp = useCallback(async (email: string, password: string, name: string, role: Role = 'staff', organizationName?: string) => {
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
            organizationName: organizationName || `${name}の組織`
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
    const { error } = await supabase.auth.signOut()
    setUser(null)
    return { error }
  }, [])

  const hasPermission = useCallback((req: Role) => {
    if (!user) return false
    const levels = { staff: 1, manager: 2, admin: 3 }
    return levels[user.role] >= levels[req]
  }, [user])

  const canAccessStore = useCallback((storeId: string) => {
    if (!user) return false
    return user.role === 'admin' || user.storeIds?.includes(storeId) === true
  }, [user])

  const getAccessibleStores = useCallback(() => {
    return user?.role === 'admin' ? allStores : (user?.assignedStores ?? [])
  }, [user, allStores])

  const value = useMemo<Ctx>(() => ({
    user,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    isSupabaseMode: isSupabaseReady(),
    signIn, signUp, signOut,
    hasPermission,
    canAccessStore,
    getAccessibleStores,
    allStores,
  }), [user, loading, isInitialized, allStores, signIn, signUp, signOut, hasPermission, canAccessStore, getAccessibleStores])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
