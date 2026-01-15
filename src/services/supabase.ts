import { supabase, isSupabaseReady as isSupabaseConfigured, normalizeStoreId } from '../lib/supabase'

// Re-export for convenience
export { isSupabaseConfigured as isSupabaseReady }
import { DailyReportData } from '@/types'
import { isUUID } from '../lib/utils'
import { getCurrentUserOrganizationId, withOrganizationId } from './organizationservice'
import { generateMockReports } from '@/lib/mock'

// Types based on database schema
export interface ProfileDb {
  id: string
  name: string
  email: string
  role: 'staff' | 'manager' | 'admin'
  created_at?: string
  updated_at?: string
}

export interface StoreDb {
  id: string
  name: string
  address: string
  manager_id?: string
  brand_id?: string
  is_active?: boolean
  change_fund?: number
  lunch_start_time?: string
  lunch_end_time?: string
  dinner_start_time?: string
  dinner_end_time?: string
  created_at?: string
  updated_at?: string
}

export interface BrandDb {
  id: string
  organization_id: string
  name: string
  display_name: string
  type: string
  default_target_profit_margin: number
  default_cost_rate: number
  default_labor_rate: number
  color: string
  icon: string
  description?: string
  settings?: any
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface DailyReportDb {
  id: string
  date: string
  store_id: string
  user_id: string
  operation_type: 'lunch' | 'dinner' | 'full_day'
  sales: number
  sales_cash_10?: number
  sales_cash_8?: number
  sales_credit_10?: number
  sales_credit_8?: number
  purchase: number
  labor_cost: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  customers?: number
  lunch_customers?: number
  dinner_customers?: number
  report_text?: string
  last_edited_by?: string
  last_edited_at?: string
  edit_count?: number
  created_at?: string
  updated_at?: string
}

export interface VendorDb {
  id: string
  name: string
  category: 'vegetable_meat' | 'seafood' | 'alcohol' | 'rice' | 'seasoning' | 'frozen' | 'dessert' | 'others'
  contact_info?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DailyReportVendorPurchaseDb {
  id: string
  daily_report_id: string
  vendor_id: string
  amount: number
  created_at?: string
}

export interface StoreVendorAssignmentDb {
  id: string
  store_id: string
  vendor_id: string
  display_order: number
  created_at?: string
}

export interface MonthlyExpenseDb {
  id: string
  store_id: string
  user_id: string
  month: string // YYYY-MM
  labor_cost_employee: number
  labor_cost_part_time: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  memo?: string
  created_at?: string
  updated_at?: string
}

export interface TargetDb {
  id: string
  store_id: string
  period: string // YYYY-MM
  target_sales: number
  target_profit: number
  target_profit_margin: number
  created_at?: string
  updated_at?: string
}

export interface ExpenseBaselineDb {
  id: string
  store_id: string
  month: string // YYYY-MM
  labor_cost_employee: number
  labor_cost_part_time: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  open_days: number
  created_at?: string
  updated_at?: string
}

export interface DailyTargetDb {
  id: string
  store_id: string
  date: string // YYYY-MM-DD
  target_sales: number
  created_at?: string
  updated_at?: string
}

// Authentication
export const signInWithEmailPassword = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabaseが設定されていません。環境変数を確認してください。' } }
  }
  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signUpWithEmailPassword = async (email: string, password: string, name: string, role: 'staff' | 'manager' | 'admin' = 'staff') => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabaseが設定されていません。環境変数を確認してください。' } }
  }
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role
      }
    }
  })

  if (error) {
    if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
      return { data: null, error: { message: 'このメールアドレスは既に登録されています。ログインしてください。' } }
    }
    return { data: null, error }
  }

  if (data.user && !error) {
    const { error: profileError } = await supabase!
      .from('profiles')
      .insert({
        id: data.user.id,
        name,
        email,
        role
      })

    if (profileError) {
      if (profileError.message.includes('row-level security policy') || profileError.code === '42501') {
        return { data: null, error: { message: 'プロフィール作成権限がありません。データベースの設定を確認してください。' } }
      }
      return { data, error: profileError }
    }

    return { data, error: null }
  }

  return { data, error }
}

export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }
  const { error } = await supabase!.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: null }
  }
  const { data: { user }, error } = await supabase!.auth.getUser()
  return { user, error }
}

// Profiles
export const getUserProfile = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null }
  }
  const { data, error } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', userId)

  if (error) {
    return { data: null, error }
  }

  const profile = Array.isArray(data) && data.length > 0 ? data[0] : null
  return { data: profile, error: null }
}

export const updateUserProfile = async (userId: string, updates: Partial<ProfileDb>) => {
  const { data, error } = await supabase!
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

// Mock data storage keys
const MOCK_STORES_KEY = 'mock_stores'
const MOCK_VENDORS_KEY = 'mock_vendors'
const MOCK_STORE_VENDOR_ASSIGNMENTS_KEY = 'mock_store_vendor_assignments'
const MOCK_TARGETS_KEY = 'mock_targets'
const MOCK_DAILY_TARGETS_KEY = 'mock_daily_targets'

const readMockStores = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_STORES_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockStores = (stores: any[]) => {
  localStorage.setItem(MOCK_STORES_KEY, JSON.stringify(stores))
}

const readMockVendors = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_VENDORS_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockVendors = (vendors: any[]) => {
  localStorage.setItem(MOCK_VENDORS_KEY, JSON.stringify(vendors))
}

const readMockStoreVendorAssignments = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_STORE_VENDOR_ASSIGNMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockStoreVendorAssignments = (assignments: any[]) => {
  localStorage.setItem(MOCK_STORE_VENDOR_ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

const readMockTargets = (): TargetDb[] => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_TARGETS_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockTargets = (targets: TargetDb[]) => {
  localStorage.setItem(MOCK_TARGETS_KEY, JSON.stringify(targets))
}

const MOCK_EXPENSE_BASELINES_KEY = 'mock_expense_baselines'

const readMockExpenseBaselines = (): ExpenseBaselineDb[] => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_EXPENSE_BASELINES_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockExpenseBaselines = (baselines: ExpenseBaselineDb[]) => {
  localStorage.setItem(MOCK_EXPENSE_BASELINES_KEY, JSON.stringify(baselines))
}

const readMockDailyTargets = (): DailyTargetDb[] => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_DAILY_TARGETS_KEY) || '[]')
  } catch {
    return []
  }
}

const writeMockDailyTargets = (targets: DailyTargetDb[]) => {
  localStorage.setItem(MOCK_DAILY_TARGETS_KEY, JSON.stringify(targets))
}

const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Stores
export const getStores = async () => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getStores: Supabase未設定、モックデータから読み込み')
    const stores = readMockStores()
    return { data: stores.filter((s: any) => s.is_active !== false), error: null }
  }

  // 現在のユーザーを取得
  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) {
    console.error('❌ getStores: ユーザーが認証されていません')
    return { data: [], error: { message: 'ユーザーが認証されていません' } }
  }

  const orgId = await getCurrentUserOrganizationId(user.id)
  if (!orgId) {
    console.error('❌ getStores: 組織IDが取得できません')
    return { data: [], error: { message: '組織IDが取得できません' } }
  }

  const { data, error } = await supabase!
    .from('stores')
    .select(`
      *,
      brand:brands(
        id,
        name,
        icon,
        color
      )
    `)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  return { data, error }
}

export const getUserStores = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase!
    .from('store_assignments')
    .select(`
      store_id,
      stores!inner(
        *,
        brand:brands(
          id,
          name,
          icon,
          color
        )
      )
    `)
    .eq('user_id', userId)
    .eq('stores.is_active', true)

  const stores = data?.map(assignment => assignment.stores).filter(Boolean) || []
  return { data: stores, error }
}

export const createStore = async (storeData: {
  name: string
  address: string
  manager_id?: string
  brand_id?: string
  change_fund?: number
  is_active?: boolean
  user_id?: string
}) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 createStore: Supabase未設定、モックデータとして保存')
    const stores = readMockStores()
    const newStore = {
      id: genId(),
      name: storeData.name,
      address: storeData.address,
      manager_id: storeData.manager_id ?? null,
      change_fund: storeData.change_fund ?? null,
      is_active: storeData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    writeMockStores([...stores, newStore])
    return { data: newStore, error: null }
  }

  try {
    if (!storeData.user_id) {
      return {
        data: null,
        error: {
          message: 'ユーザーIDが指定されていません'
        }
      }
    }

    const organizationId = await getCurrentUserOrganizationId(storeData.user_id)
    if (!organizationId) {
      return {
        data: null,
        error: {
          message: 'ユーザーの組織が見つかりません。組織に所属していることを確認してください。'
        }
      }
    }

    // user_idを除外してinsertDataを作成
    const { user_id, ...storeDataWithoutUserId } = storeData
    const insertData: any = {
      ...storeDataWithoutUserId,
      organization_id: organizationId,
      is_active: storeData.is_active ?? true
    }

    const { data, error } = await supabase!
      .from('stores')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // 権限エラー
      if (error.message?.includes('row-level security') || error.code === '42501') {
        return {
          data: null,
          error: {
            message: 'この操作には「管理者（admin）」権限が必要です。'
          }
        }
      }

      // 契約店舗数超過エラー（トリガーからのエラー）
      if (error.message?.includes('契約店舗数の上限') || error.message?.includes('店舗数')) {
        return {
          data: null,
          error: {
            message: error.message
          }
        }
      }

      return { data: null, error }
    }

    return { data, error: null }
  } catch (error: any) {
    // トリガーからの例外をキャッチ
    if (error.message?.includes('契約店舗数の上限') || error.message?.includes('店舗数')) {
      return {
        data: null,
        error: {
          message: error.message
        }
      }
    }
    return { data: null, error: { message: error.message || '店舗の作成に失敗しました' } }
  }
}

export const updateStore = async (storeId: string, updates: Partial<StoreDb>) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 updateStore: Supabase未設定、モックデータを更新')
    const stores = readMockStores()
    const updatedStores = stores.map((s: any) =>
      s.id === storeId
        ? { ...s, ...updates, updated_at: new Date().toISOString() }
        : s
    )
    writeMockStores(updatedStores)
    const updatedStore = updatedStores.find((s: any) => s.id === storeId)
    return { data: updatedStore, error: null }
  }

  const { data, error } = await supabase!
    .from('stores')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .select()
    .single()

  return { data, error }
}

export const deleteStore = async (storeId: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 deleteStore: Supabase未設定、モックデータを削除')
    const stores = readMockStores()
    const updatedStores = stores.map((s: any) =>
      s.id === storeId
        ? { ...s, is_active: false, updated_at: new Date().toISOString() }
        : s
    )
    writeMockStores(updatedStores)
    const deletedStore = updatedStores.find((s: any) => s.id === storeId)
    return { data: deletedStore, error: null }
  }

  const { data, error } = await supabase!
    .from('stores')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .select()
    .single()

  return { data, error }
}

// Store assignments
export const assignUserToStore = async (userId: string, storeId: string) => {
  const { data, error } = await supabase!
    .from('store_assignments')
    .insert({
      user_id: userId,
      store_id: storeId
    })
    .select()
    .single()

  return { data, error }
}

export const removeUserFromStore = async (userId: string, storeId: string) => {
  const { error } = await supabase!
    .from('store_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('store_id', storeId)

  return { error }
}

// Daily Reports
export const getDailyReports = async (filters: {
  storeId?: string
  brandId?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
  operationType?: 'lunch' | 'dinner' | 'full_day'
} = {}) => {

  // ✨ 未設定ならローカルストレージから取得
  if (!isSupabaseConfigured()) {
    const localStorageKey = filters.userId ? `userReports_${filters.userId}` : 'userReports'
    const local: any[] = JSON.parse(localStorage.getItem(localStorageKey) || '[]')
    // 簡易フィルタ
    const filtered = local.filter(r => {
      if (filters.storeId && filters.storeId !== 'all' && r.storeId !== filters.storeId) return false
      if (filters.dateFrom && r.date < filters.dateFrom) return false
      if (filters.dateTo && r.date > filters.dateTo) return false
      return true
    })
    return { data: filtered, error: null }
  }

  if (filters.storeId && filters.storeId !== 'all' && !isUUID(filters.storeId)) {
    console.warn('Invalid store UUID provided:', filters.storeId)
    return { data: [], error: null }
  }

  let storeIdsForBrandFilter: string[] | undefined = undefined

  if (filters.brandId && filters.brandId !== 'headquarters' && (!filters.storeId || filters.storeId === 'all')) {
    console.log('🔍 getDailyReports: Filtering by brandId:', filters.brandId)
    const { data: brandStores, error: brandStoresError } = await supabase!
      .from('stores')
      .select('id, name, brand_id')
      .eq('brand_id', filters.brandId)

    if (brandStoresError) {
      console.error('❌ Failed to fetch stores for brand:', brandStoresError)
    } else {
      storeIdsForBrandFilter = brandStores?.map(s => s.id) || []
      console.log('✅ Found stores for brand:', brandStores)
      console.log('📍 Store IDs for filter:', storeIdsForBrandFilter)
      if (storeIdsForBrandFilter.length === 0) {
        console.log('⚠️ No stores found for this brand, returning empty array')
        return { data: [], error: null }
      }
    }
  }

  let query = supabase!
    .from('daily_reports')
    .select(`
      *,
      stores!inner(name, brand_id),
      creator:profiles!daily_reports_user_id_fkey(name),
      editor:profiles!daily_reports_last_edited_by_fkey(name)
    `)
    .order('date', { ascending: false })

  if (filters.storeId && filters.storeId !== 'all') {
    console.log('🔍 Filtering by storeId:', filters.storeId)
    query = query.eq('store_id', filters.storeId)
  } else if (storeIdsForBrandFilter && storeIdsForBrandFilter.length > 0) {
    console.log('🔍 Filtering by brand store IDs:', storeIdsForBrandFilter)
    query = query.in('store_id', storeIdsForBrandFilter)
  } else {
    console.log('🔍 No store or brand filter applied')
  }

  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo)
  }

  if (filters.userId && isUUID(filters.userId)) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters.operationType) {
    query = query.eq('operation_type', filters.operationType)
  }

  const { data, error } = await query

  const transformedData = data?.map(report => ({
    id: report.id,
    date: report.date,
    storeId: report.store_id,
    storeName: report.stores.name,
    staffName: report.creator?.name || 'Unknown',
    operationType: report.operation_type || 'dinner',
    sales: report.sales,
    salesCash10: report.sales_cash_10 || 0,
    salesCash8: report.sales_cash_8 || 0,
    salesCredit10: report.sales_credit_10 || 0,
    salesCredit8: report.sales_credit_8 || 0,
    purchase: report.purchase,
    laborCost: report.labor_cost,
    utilities: report.utilities,
    rent: report.rent || 0,
    consumables: report.consumables || 0,
    promotion: report.promotion,
    cleaning: report.cleaning,
    misc: report.misc,
    communication: report.communication,
    others: report.others,
    reportText: report.report_text || '',
    customers: report.customers || 0,
    lunchCustomers: report.lunch_customers || 0,
    dinnerCustomers: report.dinner_customers || 0,
    vendorPurchases: {},
    createdAt: report.created_at || '',
    lastEditedBy: report.editor?.name,
    lastEditedAt: report.last_edited_at,
    editCount: report.edit_count || 0
  }))

  return { data: transformedData, error }
}

export const createDailyReport = async (reportData: Omit<DailyReportData, 'id' | 'createdAt'> & { userId: string; vendorPurchases?: Record<string, number> }) => {
  console.log('🔵 createDailyReport開始:', { storeId: reportData.storeId, userId: reportData.userId, date: reportData.date })
  console.log('🔵 isSupabaseConfigured():', isSupabaseConfigured())

  if (!isSupabaseConfigured()) {
    const key = reportData.userId ? `userReports_${reportData.userId}` : 'userReports'
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    const rec = {
      ...reportData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify([rec, ...list]))
    console.log('📦 Supabase未設定のためローカルストレージに保存:', rec)
    return { data: rec, error: null }
  }

  try {
    const { data: storeData, error: storeError } = await supabase!
      .from('stores')
      .select('organization_id')
      .eq('id', reportData.storeId)
      .maybeSingle()

    console.log('🔵 店舗クエリ結果:', { storeData, storeError })

    if (storeError || !storeData?.organization_id) {
      console.error('店舗の組織IDを取得できません:', storeError)
      return {
        data: null,
        error: { message: '店舗の組織情報を取得できませんでした' }
      }
    }

    const organizationId = storeData.organization_id
    console.log('🔵 組織ID:', organizationId)

    const insertData: any = {
      date: reportData.date,
      store_id: reportData.storeId,
      user_id: reportData.userId,
      operation_type: reportData.operationType || 'dinner',
      sales: reportData.sales,
      sales_cash_10: reportData.salesCash10 || 0,
      sales_cash_8: reportData.salesCash8 || 0,
      sales_credit_10: reportData.salesCredit10 || 0,
      sales_credit_8: reportData.salesCredit8 || 0,
      purchase: reportData.purchase,
      labor_cost: reportData.laborCost,
      utilities: reportData.utilities,
      rent: reportData.rent || 0,
      consumables: reportData.consumables || 0,
      promotion: reportData.promotion,
      cleaning: reportData.cleaning,
      misc: reportData.misc,
      communication: reportData.communication,
      others: reportData.others,
      customers: reportData.customers,
      lunch_customers: reportData.lunchCustomers || 0,
      dinner_customers: reportData.dinnerCustomers || 0,
      report_text: reportData.reportText,
      organization_id: organizationId
    }

    console.log('🔵 INSERT実行:', insertData)

    let { data: { session } } = await supabase!.auth.getSession();

    if (!session) {
      console.warn('⚠️ セッションなし。リフレッシュを試みます...');
      const { data: refreshData, error: refreshError } = await supabase!.auth.refreshSession();
      if (refreshError) {
        console.error('❌ セッションリフレッシュ失敗:', refreshError);
        return {
          data: null,
          error: { message: 'セッションの復元に失敗しました。再ログインしてください。' }
        };
      }
      session = refreshData.session;
      console.log('✅ セッションリフレッシュ成功');
    }

    function decodeJwtPayload(token?: string) {
      if (!token || !token.includes(".")) return null;
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64Url.length + 3) % 4);
      try {
        return JSON.parse(atob(base64));
      } catch {
        return null;
      }
    }

    const payload = decodeJwtPayload(session?.access_token);

    console.log("SESSION_CHECK", {
      hasSession: !!session,
      userId: session?.user?.id,
      jwtRole: payload?.role,
      exp: payload?.exp,
    });

    const { data: authData, error: authError } = await supabase!.rpc("debug_auth");
    console.log("DEBUG_AUTH", { data: authData, error: authError });

    const { data: debugData, error: debugError } = await supabase!.rpc("debug_daily_reports_insert", {
      p_store_id: insertData.store_id,
    });
    console.log("DEBUG_INSERT", { debugData, debugError });

    const { data, error } = await supabase!
      .from('daily_reports')
      .insert(insertData)
      .select()
      .single()

    console.log('🔵 INSERT結果:', { data, error })

    if (data) {
      const { data: verifyData, error: verifyError } = await supabase!
        .from('daily_reports')
        .select('id, date, store_id, user_id, organization_id')
        .eq('id', data.id)
        .maybeSingle()

      console.log('✅ VERIFY_INSERT:', { verifyData, verifyError })
    }

    if (error || !data) {
      console.error('❌ INSERT失敗:', error)
      return { data, error }
    }

    // 業者別仕入データを保存
    if (reportData.vendorPurchases && Object.keys(reportData.vendorPurchases).length > 0) {
      const vendorPurchaseRecords = Object.entries(reportData.vendorPurchases)
        .filter(([_, amount]) => amount > 0)
        .map(([vendorId, amount]) => ({
          daily_report_id: data.id,
          vendor_id: vendorId,
          amount: amount,
          organization_id: organizationId
        }))

      if (vendorPurchaseRecords.length > 0) {
        const { error: vendorError } = await supabase!
          .from('daily_report_vendor_purchases')
          .insert(vendorPurchaseRecords)

        if (vendorError) {
          console.error('業者別仕入データの保存に失敗:', vendorError)
        }
      }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: { message: error.message || '日報の作成に失敗しました' } }
  }
}

export const updateDailyReport = async (reportId: string, updates: Partial<DailyReportDb> & { vendorPurchases?: Record<string, number>; userId?: string }) => {
  // ✨ ローカルストレージIDの場合
  if (reportId.startsWith('local-') || !isSupabaseConfigured()) {
    const key = updates.userId ? `userReports_${updates.userId}` : 'userReports'
    const list: any[] = JSON.parse(localStorage.getItem(key) || '[]')
    const index = list.findIndex(r => r.id === reportId)

    if (index === -1) {
      return { data: null, error: { message: '日報が見つかりません' } }
    }

    // 更新
    const { userId: _userId, ...restUpdates } = updates
    const updated = {
      ...list[index],
      ...restUpdates,
      updated_at: new Date().toISOString()
    }
    list[index] = updated
    localStorage.setItem(key, JSON.stringify(list))
    console.log('📦 ローカルストレージで更新:', updated)
    return { data: updated, error: null }
  }

  // vendorPurchasesを分離して処理
  const { vendorPurchases, ...dbUpdates } = updates

  const { data, error } = await supabase!
    .from('daily_reports')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single()

  if (error || !data) {
    return { data, error }
  }

  // 業者別仕入データを更新（既存を削除して新規挿入）
  if (vendorPurchases !== undefined) {
    try {
      // 既存の業者別仕入データを削除
      await supabase!
        .from('daily_report_vendor_purchases')
        .delete()
        .eq('daily_report_id', reportId)

      // 新しいデータがある場合は挿入
      if (Object.keys(vendorPurchases).length > 0) {
        const { data: { user } } = await supabase!.auth.getUser()
        if (!user) {
          console.error('❌ updateDailyReport: ユーザーが認証されていません')
          return { data, error: null }
        }

        const organizationId = await getCurrentUserOrganizationId(user.id)
        const vendorPurchaseRecords = Object.entries(vendorPurchases)
          .filter(([_, amount]) => amount > 0)
          .map(([vendorId, amount]) => ({
            daily_report_id: reportId,
            vendor_id: vendorId,
            amount: amount,
            organization_id: organizationId
          }))

        if (vendorPurchaseRecords.length > 0) {
          const { error: vendorError } = await supabase!
            .from('daily_report_vendor_purchases')
            .insert(vendorPurchaseRecords)

          if (vendorError) {
            console.error('業者別仕入データの更新に失敗:', vendorError)
          }
        }
      }
    } catch (vendorError) {
      console.error('業者別仕入データの更新中にエラー:', vendorError)
    }
  }

  return { data, error: null }
}

export const deleteDailyReport = async (reportId: string, userId?: string) => {
  // ✨ ローカルストレージIDの場合
  if (reportId.startsWith('local-') || !isSupabaseConfigured()) {
    const key = userId ? `userReports_${userId}` : 'userReports'
    const list: any[] = JSON.parse(localStorage.getItem(key) || '[]')
    const filtered = list.filter(r => r.id !== reportId)
    localStorage.setItem(key, JSON.stringify(filtered))
    console.log('📦 ローカルストレージから削除:', reportId)
    return { error: null }
  }

  const { error } = await supabase!
    .from('daily_reports')
    .delete()
    .eq('id', reportId)

  return { error }
}

// Vendors
export const getVendors = async () => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getVendors: Supabase未設定、モックデータから読み込み')
    const vendors = readMockVendors()
    return { data: vendors.filter((v: any) => v.is_active !== false), error: null }
  }

  // 現在のユーザーを取得
  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) {
    console.error('❌ getVendors: ユーザーが認証されていません')
    return { data: [], error: { message: 'ユーザーが認証されていません' } }
  }

  const orgId = await getCurrentUserOrganizationId(user.id)
  if (!orgId) {
    console.error('❌ getVendors: 組織IDが取得できません')
    return { data: [], error: { message: '組織IDが取得できません' } }
  }

  const { data, error } = await supabase!
    .from('vendors')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  return { data, error }
}

export const createVendor = async (vendorData: Omit<VendorDb, 'id' | 'created_at' | 'updated_at'> & { user_id?: string }) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 createVendor: Supabase未設定、モックデータとして保存')
    const vendors = readMockVendors()
    const newVendor = {
      id: genId(),
      ...vendorData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    writeMockVendors([...vendors, newVendor])
    return { data: newVendor, error: null }
  }

  try {
    let insertData: any = { ...vendorData }

    if (vendorData.user_id) {
      console.log('🔍 createVendor: user_idを使用して組織IDを取得:', vendorData.user_id)
      const organizationId = await getCurrentUserOrganizationId(vendorData.user_id)
      console.log('🔍 createVendor: 取得した組織ID:', organizationId)

      if (!organizationId) {
        console.error('❌ createVendor: 組織IDが取得できませんでした')
        return {
          data: null,
          error: {
            message: 'ユーザーの組織が見つかりません。組織に所属していることを確認してください。'
          }
        }
      }

      insertData.organization_id = organizationId
      delete insertData.user_id
    } else {
      console.warn('⚠️ createVendor: user_idが渡されていません。organization_idが設定されない可能性があります')
    }

    console.log('🔍 createVendor: 挿入するデータ:', insertData)

    const { data, error } = await supabase!
      .from('vendors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ createVendor: Supabaseエラー:', error)
      if (error.message?.includes('row-level security') || error.code === '42501') {
        return {
          data: null,
          error: {
            message: 'この操作には「管理者（admin）」権限が必要です。RLSポリシーで拒否されました。'
          }
        }
      }
      return { data: null, error }
    }

    console.log('✅ createVendor: 業者作成成功:', data)
    return { data, error: null }
  } catch (error: any) {
    console.error('❌ createVendor: 予期しないエラー:', error)
    return { data: null, error: { message: error.message || '仕入先の作成に失敗しました' } }
  }
}

export const updateVendor = async (vendorId: string, updates: Partial<VendorDb>) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 updateVendor: Supabase未設定、モックデータを更新')
    const vendors = readMockVendors()
    const updatedVendors = vendors.map((v: any) =>
      v.id === vendorId
        ? { ...v, ...updates, updated_at: new Date().toISOString() }
        : v
    )
    writeMockVendors(updatedVendors)
    const updatedVendor = updatedVendors.find((v: any) => v.id === vendorId)
    return { data: updatedVendor, error: null }
  }

  const { data, error } = await supabase!
    .from('vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single()

  return { data, error }
}

export const deleteVendor = async (vendorId: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 deleteVendor: Supabase未設定、モックデータを削除')
    const vendors = readMockVendors()
    const updatedVendors = vendors.map((v: any) =>
      v.id === vendorId
        ? { ...v, is_active: false, updated_at: new Date().toISOString() }
        : v
    )
    writeMockVendors(updatedVendors)
    const deletedVendor = updatedVendors.find((v: any) => v.id === vendorId)
    return { data: deletedVendor, error: null }
  }

  const { data, error } = await supabase!
    .from('vendors')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single()

  return { data, error }
}

// Store Vendor Assignments
export const getAllStoreVendorAssignments = async () => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getAllStoreVendorAssignments: Supabase未設定、モックデータから読み込み')
    const assignments = readMockStoreVendorAssignments()
    return { data: assignments, error: null }
  }

  const { data, error } = await supabase!
    .from('store_vendor_assignments')
    .select('*')
    .order('display_order')

  return { data, error }
}

export const getStoreVendors = async (storeId: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getStoreVendors: Supabase未設定、モックデータから読み込み')
    const assignments = readMockStoreVendorAssignments()
    const vendors = readMockVendors()

    const storeAssignments = assignments
      .filter((a: any) => a.store_id === storeId)
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))

    const storeVendors = storeAssignments
      .map((a: any) => vendors.find((v: any) => v.id === a.vendor_id && v.is_active !== false))
      .filter(Boolean)

    return { data: storeVendors, error: null }
  }

  const { data, error } = await supabase!
    .from('store_vendor_assignments')
    .select(`
      display_order,
      vendors!inner(*)
    `)
    .eq('store_id', storeId)
    .eq('vendors.is_active', true)
    .order('display_order')

  const vendors = data?.map(assignment => assignment.vendors).filter(Boolean) || []
  return { data: vendors, error }
}

export const assignVendorToStore = async (storeId: string, vendorId: string, displayOrder?: number) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 assignVendorToStore: Supabase未設定、モックデータとして保存')
    const assignments = readMockStoreVendorAssignments()

    // 既に割り当て済みかチェック
    const exists = assignments.find((a: any) =>
      a.store_id === storeId && a.vendor_id === vendorId
    )

    if (exists) {
      console.log('⚠️ assignVendorToStore: 既に割り当て済み')
      return { data: exists, error: null }
    }

    const newAssignment = {
      store_id: storeId,
      vendor_id: vendorId,
      display_order: displayOrder || 0,
      created_at: new Date().toISOString()
    }

    writeMockStoreVendorAssignments([...assignments, newAssignment])
    return { data: newAssignment, error: null }
  }

  try {
    // Get the current user's session
    const { data: { user } } = await supabase!.auth.getUser()

    if (!user) {
      return {
        data: null,
        error: { message: 'ユーザーがログインしていません' }
      }
    }

    // Get organization_id from the user
    const organizationId = await getCurrentUserOrganizationId(user.id)

    if (!organizationId) {
      return {
        data: null,
        error: { message: 'ユーザーの組織が見つかりません' }
      }
    }

    const { data, error } = await supabase!
      .from('store_vendor_assignments')
      .insert({
        store_id: storeId,
        vendor_id: vendorId,
        display_order: displayOrder || 0,
        organization_id: organizationId
      })
      .select()
      .single()

    return { data, error }
  } catch (err: any) {
    return { data: null, error: { message: err.message || '業者の割り当てに失敗しました' } }
  }
}

export const removeVendorFromStore = async (storeId: string, vendorId: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 removeVendorFromStore: Supabase未設定、モックデータから削除')
    const assignments = readMockStoreVendorAssignments()
    const filteredAssignments = assignments.filter((a: any) =>
      !(a.store_id === storeId && a.vendor_id === vendorId)
    )
    writeMockStoreVendorAssignments(filteredAssignments)
    return { error: null }
  }

  const { error } = await supabase!
    .from('store_vendor_assignments')
    .delete()
    .eq('store_id', storeId)
    .eq('vendor_id', vendorId)

  return { error }
}

// Monthly Expenses
export const getMonthlyExpenses = async (filters: {
  storeId?: string
  month?: string
  userId?: string
  isDemoMode?: boolean
} = {}) => {

  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  if (filters.storeId && filters.storeId !== 'all' && !isUUID(filters.storeId)) {
    console.warn('Invalid store UUID provided:', filters.storeId)
    return { data: [], error: null }
  }

  if (filters.isDemoMode) {
    let query = supabase!
      .from('demo_monthly_expenses')
      .select(`
        *,
        demo_stores!inner(name)
      `)
      .order('month', { ascending: false })

    if (filters.storeId && filters.storeId !== 'all') {
      query = query.eq('demo_store_id', filters.storeId)
    }

    if (filters.month) {
      query = query.eq('month', filters.month)
    }

    const { data, error } = await query

    if (!error && data) {
      return {
        data: data.map((item: any) => ({
          ...item,
          store_id: item.demo_store_id,
          stores: item.demo_stores
        })),
        error: null
      }
    }

    return { data, error }
  }

  let query = supabase!
    .from('monthly_expenses')
    .select(`
      *,
      stores!inner(name)
    `)
    .order('month', { ascending: false })

  if (filters.storeId && filters.storeId !== 'all') {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters.month) {
    query = query.eq('month', filters.month)
  }

  if (filters.userId && isUUID(filters.userId)) {
    query = query.eq('user_id', filters.userId)
  }

  const { data, error } = await query
  return { data, error }
}

export const createMonthlyExpense = async (expenseData: Omit<MonthlyExpenseDb, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase!
    .from('monthly_expenses')
    .insert(expenseData)
    .select()
    .single()

  return { data, error }
}

export const updateMonthlyExpense = async (expenseId: string, updates: Partial<MonthlyExpenseDb>) => {
  const { data, error } = await supabase!
    .from('monthly_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', expenseId)
    .select()
    .single()

  return { data, error }
}

export const upsertMonthlyExpense = async (expenseData: Omit<MonthlyExpenseDb, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase!
    .from('monthly_expenses')
    .upsert(
      { ...expenseData, updated_at: new Date().toISOString() },
      { onConflict: 'store_id,month' }
    )
    .select()
    .single()

  return { data, error }
}

// Targets
export const getTargets = async (filters: {
  storeId?: string
  period?: string
} = {}) => {

  if (!isSupabaseConfigured()) {
    console.log('🔧 getTargets: Supabase未設定、LocalStorageから読み込み')
    let targets = readMockTargets()

    if (filters.storeId && filters.storeId !== 'all') {
      targets = targets.filter(t => t.store_id === filters.storeId)
    }

    if (filters.period) {
      targets = targets.filter(t => t.period === filters.period)
    }

    targets.sort((a, b) => b.period.localeCompare(a.period))
    return { data: targets, error: null }
  }

  const orgId = await getCurrentUserOrganizationId()
  if (!orgId) {
    console.error('🔴 getTargets: organization_idが取得できません')
    return { data: [], error: new Error('組織IDが見つかりません') }
  }

  const sid = normalizeStoreId(filters.storeId)

  let query = supabase!
    .from('targets')
    .select('*')
    .eq('organization_id', orgId)
    .order('period', { ascending: false })

  if (sid) {
    query = query.eq('store_id', sid)
  }

  if (filters.period) {
    query = query.eq('period', filters.period)
  }

  const { data, error } = await query
  return { data, error }
}

export const createTarget = async (targetData: Omit<TargetDb, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase!
    .from('targets')
    .insert(targetData)
    .select()
    .single()

  return { data, error }
}

export const updateTarget = async (targetId: string, updates: Partial<TargetDb>) => {
  const { data, error } = await supabase!
    .from('targets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', targetId)
    .select()
    .single()

  return { data, error }
}

export const upsertTarget = async (targetData: Omit<TargetDb, 'id' | 'created_at' | 'updated_at'>) => {
  console.log('🔵 supabase.ts: upsertTarget呼び出し', targetData)

  if (!isSupabaseConfigured()) {
    console.log('🔧 upsertTarget: Supabase未設定、LocalStorageに保存')
    const targets = readMockTargets()
    const now = new Date().toISOString()
    const existingIndex = targets.findIndex(
      t => t.store_id === targetData.store_id && t.period === targetData.period
    )

    let savedTarget: TargetDb
    if (existingIndex >= 0) {
      savedTarget = {
        ...targets[existingIndex],
        ...targetData,
        updated_at: now
      }
      targets[existingIndex] = savedTarget
    } else {
      savedTarget = {
        id: genId(),
        ...targetData,
        created_at: now,
        updated_at: now
      }
      targets.push(savedTarget)
    }

    writeMockTargets(targets)
    console.log('🔧 upsertTarget: LocalStorageに保存完了', savedTarget)
    return { data: savedTarget, error: null }
  }

  const orgId = await getCurrentUserOrganizationId()
  if (!orgId) {
    console.error('🔴 upsertTarget: organization_idが取得できません')
    return { data: null, error: new Error('組織IDが見つかりません') }
  }

  // デバッグ: can_manage_targets の結果を確認
  const { data: debugData, error: debugError } = await supabase!.rpc('debug_can_manage_targets', { target_org_id: orgId })
  console.log('🔍 DEBUG: can_manage_targets result:', debugData, debugError)

  const dataToUpsert = { ...targetData, organization_id: orgId, updated_at: new Date().toISOString() }
  console.log('🔵 supabase.ts: upsertするデータ', dataToUpsert)

  const { data, error } = await supabase!
    .from('targets')
    .upsert(
      dataToUpsert,
      { onConflict: 'store_id,period,organization_id' }
    )
    .select()
    .single()

  console.log('🔵 supabase.ts: upsert結果', { data, error })

  return { data, error }
}

export const deleteTarget = async (storeId: string, period: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 deleteTarget: Supabase未設定、LocalStorageから削除')
    const targets = readMockTargets()
    const filtered = targets.filter(t => !(t.store_id === storeId && t.period === period))
    writeMockTargets(filtered)
    return { error: null }
  }

  const orgId = await getCurrentUserOrganizationId()
  if (!orgId) {
    console.error('🔴 deleteTarget: organization_idが取得できません')
    return { error: new Error('組織IDが見つかりません') }
  }

  const { error } = await supabase!
    .from('targets')
    .delete()
    .eq('store_id', storeId)
    .eq('period', period)
    .eq('organization_id', orgId)

  return { error }
}

// Expense Baselines (参考経費)
export const getExpenseBaseline = async (storeId: string, month: string) => {

  if (!isSupabaseConfigured()) {
    console.log('🔧 getExpenseBaseline: Supabase未設定、LocalStorageから読み込み')
    const baselines = readMockExpenseBaselines()
    const baseline = baselines.find(b => b.store_id === storeId && b.month === month) || null
    return { data: baseline, error: null }
  }

  const sid = normalizeStoreId(storeId)
  if (!sid) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase!
    .from('expense_baselines')
    .select('*')
    .eq('store_id', sid)
    .eq('month', month)
    .maybeSingle()

  return { data, error }
}

export const upsertExpenseBaseline = async (
  storeId: string,
  month: string,
  payload: Partial<ExpenseBaselineDb>
) => {
  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('ユーザーが認証されていません') }
  }

  const organizationId = await getCurrentUserOrganizationId(user.id)
  if (!organizationId) {
    return { data: null, error: new Error('組織IDが取得できません') }
  }

  const baselineData = {
    store_id: storeId,
    month,
    organization_id: organizationId,
    open_days: payload.open_days ?? 30,
    labor_cost_employee: payload.labor_cost_employee ?? 0,
    labor_cost_part_time: payload.labor_cost_part_time ?? 0,
    utilities: payload.utilities ?? 0,
    rent: payload.rent ?? 0,
    consumables: payload.consumables ?? 0,
    promotion: payload.promotion ?? 0,
    cleaning: payload.cleaning ?? 0,
    misc: payload.misc ?? 0,
    communication: payload.communication ?? 0,
    others: payload.others ?? 0,
    updated_at: new Date().toISOString()
  }

  if (!isSupabaseConfigured()) {
    console.log('🔧 upsertExpenseBaseline: Supabase未設定、LocalStorageに保存')
    const baselines = readMockExpenseBaselines()
    const index = baselines.findIndex(b => b.store_id === storeId && b.month === month)

    if (index >= 0) {
      baselines[index] = { ...baselines[index], ...baselineData }
    } else {
      baselines.push({
        id: genId(),
        ...baselineData,
        created_at: new Date().toISOString()
      } as ExpenseBaselineDb)
    }

    writeMockExpenseBaselines(baselines)
    return { data: baselineData, error: null }
  }

  const { data, error } = await supabase!
    .from('expense_baselines')
    .upsert(baselineData, { onConflict: 'store_id,month' })
    .select()
    .single()

  return { data, error }
}

export const deleteExpenseBaseline = async (storeId: string, month: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 deleteExpenseBaseline: Supabase未設定、LocalStorageから削除')
    const baselines = readMockExpenseBaselines()
    const filtered = baselines.filter(b => !(b.store_id === storeId && b.month === month))
    writeMockExpenseBaselines(filtered)
    return { error: null }
  }

  const { error } = await supabase!
    .from('expense_baselines')
    .delete()
    .eq('store_id', storeId)
    .eq('month', month)

  return { error }
}

// Summary data
export const getSummaryData = async (filters: {
  periodType?: 'daily' | 'weekly' | 'monthly'
  periodStart?: string
  periodEnd?: string
  storeId?: string
} = {}) => {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  let query = supabase!
    .from('summary_data')
    .select('*')
    .order('period_start', { ascending: false })

  if (filters.periodType) {
    query = query.eq('period_type', filters.periodType)
  }

  if (filters.periodStart) {
    query = query.gte('period_start', filters.periodStart)
  }

  if (filters.periodEnd) {
    query = query.lte('period_end', filters.periodEnd)
  }

  if (filters.storeId && filters.storeId !== 'all') {
    query = query.eq('store_id', filters.storeId)
  }

  const { data, error } = await query
  return { data, error }
}

// Daily Targets
export const getDailyTarget = async (storeId: string, date: string) => {

  if (!isSupabaseConfigured()) {
    console.log('🔧 getDailyTarget: Supabase未設定、LocalStorageから読み込み')
    const targets = readMockDailyTargets()
    const target = targets.find(t => t.store_id === storeId && t.date === date) || null
    return { data: target, error: null }
  }

  const sid = normalizeStoreId(storeId)
  if (!sid) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase!
    .from('daily_targets')
    .select('*')
    .eq('store_id', sid)
    .eq('date', date)
    .maybeSingle()

  return { data, error }
}

export const getDailyTargets = async (filters: {
  storeId?: string
  dateFrom?: string
  dateTo?: string
} = {}) => {

  if (!isSupabaseConfigured()) {
    console.log('🔧 getDailyTargets: Supabase未設定、LocalStorageから読み込み')
    let targets = readMockDailyTargets()

    if (filters.storeId && filters.storeId !== 'all') {
      targets = targets.filter(t => t.store_id === filters.storeId)
    }

    if (filters.dateFrom) {
      targets = targets.filter(t => t.date >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      targets = targets.filter(t => t.date <= filters.dateTo!)
    }

    targets.sort((a, b) => b.date.localeCompare(a.date))
    return { data: targets, error: null }
  }

  let query = supabase!
    .from('daily_targets')
    .select('*')
    .order('date', { ascending: false })

  if (filters.storeId && filters.storeId !== 'all') {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo)
  }

  const { data, error } = await query
  return { data, error }
}

export const upsertDailyTarget = async (targetData: {
  storeId: string
  date: string
  targetSales: number
}) => {
  console.log('🔵 supabase.ts: upsertDailyTarget呼び出し', targetData)

  if (!isSupabaseConfigured()) {
    console.log('🔧 upsertDailyTarget: Supabase未設定、LocalStorageに保存')
    const targets = readMockDailyTargets()
    const now = new Date().toISOString()
    const existingIndex = targets.findIndex(
      t => t.store_id === targetData.storeId && t.date === targetData.date
    )

    let savedTarget: DailyTargetDb
    if (existingIndex >= 0) {
      savedTarget = {
        ...targets[existingIndex],
        target_sales: targetData.targetSales,
        updated_at: now
      }
      targets[existingIndex] = savedTarget
    } else {
      savedTarget = {
        id: genId(),
        store_id: targetData.storeId,
        date: targetData.date,
        target_sales: targetData.targetSales,
        created_at: now,
        updated_at: now
      }
      targets.push(savedTarget)
    }

    writeMockDailyTargets(targets)
    console.log('🔧 upsertDailyTarget: LocalStorageに保存完了', savedTarget)
    return { data: savedTarget, error: null }
  }

  const dataToUpsert = {
    store_id: targetData.storeId,
    date: targetData.date,
    target_sales: targetData.targetSales,
    updated_at: new Date().toISOString()
  }
  console.log('🔵 supabase.ts: upsertするデータ', dataToUpsert)

  const { data, error } = await supabase!
    .from('daily_targets')
    .upsert(
      dataToUpsert,
      { onConflict: 'store_id,date' }
    )
    .select()
    .single()

  console.log('🔵 supabase.ts: upsert結果', { data, error })

  return { data, error }
}

export const deleteDailyTarget = async (storeId: string, date: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 deleteDailyTarget: Supabase未設定、LocalStorageから削除')
    const targets = readMockDailyTargets()
    const filtered = targets.filter(t => !(t.store_id === storeId && t.date === date))
    writeMockDailyTargets(filtered)
    return { error: null }
  }

  const { error } = await supabase!
    .from('daily_targets')
    .delete()
    .eq('store_id', storeId)
    .eq('date', date)

  return { error }
}

// ============================================
// Brands (業態/ブランド) CRUD
// ============================================

export const getBrands = async (filters?: {
  organizationId?: string
  isActive?: boolean
}) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getBrands: Supabase未設定、空配列を返却')
    return { data: [], error: null }
  }

  let query = supabase!.from('brands').select('*').order('display_order', { ascending: true })

  if (filters?.organizationId) {
    query = query.eq('organization_id', filters.organizationId)
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  const { data, error } = await query
  return { data, error }
}

export const getBrandById = async (id: string) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase未設定' } }
  }

  const { data, error } = await supabase!
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export const createBrand = async (brandData: {
  organizationId: string
  name: string
  displayName: string
  type: string
  defaultTargetProfitMargin?: number
  defaultCostRate?: number
  defaultLaborRate?: number
  color?: string
  icon?: string
  description?: string
  displayOrder?: number
}) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase未設定' } }
  }

  const { data, error } = await supabase!
    .from('brands')
    .insert({
      organization_id: brandData.organizationId,
      name: brandData.name,
      display_name: brandData.displayName,
      type: brandData.type,
      default_target_profit_margin: brandData.defaultTargetProfitMargin ?? 20,
      default_cost_rate: brandData.defaultCostRate ?? 30,
      default_labor_rate: brandData.defaultLaborRate ?? 25,
      color: brandData.color ?? '#3B82F6',
      icon: brandData.icon ?? '🏪',
      description: brandData.description,
      display_order: brandData.displayOrder ?? 0
    })
    .select()
    .single()

  return { data, error }
}

export const updateBrand = async (id: string, updates: Partial<BrandDb>) => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase未設定' } }
  }

  const { data, error } = await supabase!
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export const deleteBrand = async (id: string) => {
  if (!isSupabaseConfigured()) {
    return { error: { message: 'Supabase未設定' } }
  }

  const { error } = await supabase!
    .from('brands')
    .delete()
    .eq('id', id)

  return { error }
}

// Health check
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('count')
      .limit(1)

    return { connected: !error, error }
  } catch (error) {
    return { connected: false, error }
  }
}

// Vendor Purchases
export const getVendorPurchasesForDate = async (storeId: string, date: string) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getVendorPurchasesForDate: Supabase未設定、空データを返却')
    return { data: [], error: null }
  }

  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) {
    console.error('❌ getVendorPurchasesForDate: ユーザーが認証されていません')
    return { data: [], error: { message: 'ユーザーが認証されていません' } }
  }

  const orgId = await getCurrentUserOrganizationId(user.id)
  if (!orgId) {
    console.error('❌ getVendorPurchasesForDate: 組織IDが取得できません')
    return { data: [], error: { message: '組織IDが取得できません' } }
  }

  let query = supabase!
    .from('daily_report_vendor_purchases')
    .select(`
      id,
      daily_report_id,
      vendor_id,
      amount,
      created_at,
      daily_reports!inner(id, date, store_id, organization_id),
      vendors!inner(id, name, category)
    `)
    .eq('daily_reports.organization_id', orgId)
    .eq('daily_reports.date', date)

  if (storeId !== 'all') {
    query = query.eq('daily_reports.store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ getVendorPurchasesForDate: エラー', error)
    return { data: [], error }
  }

  return { data, error: null }
}

export const getVendorPurchasesForPeriod = async (
  storeId: string,
  startDate: string,
  endDate: string
) => {
  if (!isSupabaseConfigured()) {
    console.log('🔧 getVendorPurchasesForPeriod: Supabase未設定、空データを返却')
    return { data: [], error: null }
  }

  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) {
    console.error('❌ getVendorPurchasesForPeriod: ユーザーが認証されていません')
    return { data: [], error: { message: 'ユーザーが認証されていません' } }
  }

  const orgId = await getCurrentUserOrganizationId(user.id)
  if (!orgId) {
    console.error('❌ getVendorPurchasesForPeriod: 組織IDが取得できません')
    return { data: [], error: { message: '組織IDが取得できません' } }
  }

  let query = supabase!
    .from('daily_report_vendor_purchases')
    .select(`
      id,
      daily_report_id,
      vendor_id,
      amount,
      created_at,
      daily_reports!inner(id, date, store_id, organization_id),
      vendors!inner(id, name, category)
    `)
    .eq('daily_reports.organization_id', orgId)
    .gte('daily_reports.date', startDate)
    .lte('daily_reports.date', endDate)

  if (storeId !== 'all') {
    query = query.eq('daily_reports.store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ getVendorPurchasesForPeriod: エラー', error)
    return { data: [], error }
  }

  return { data, error: null }
}
