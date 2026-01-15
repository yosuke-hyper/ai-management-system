import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAdminData } from '@/contexts/admindatacontext'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import { formatCurrency } from '@/lib/format'
import { PermissionGuard } from '@/components/auth/permissionguard'
import { type VendorDb, getBrands, getStores, getExpenseBaseline, type ExpenseBaselineDb } from '@/services/supabase'
import { Database, DollarSign, Brain, Shield, Store, AlertCircle, Download, AlertTriangle, Calendar, Receipt, Target, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { subscriptionService } from '@/services/subscriptionservice'
import { SuperAdminBanner } from '@/components/admin/superadminbanner'
import { OrganizationSwitcher } from '@/components/admin/organizationswitcher'
import { insertSampleData } from '@/services/sampledata'

const ExpenseBaselineSettings = lazy(() => import('@/components/dashboard/expensebaselinesettings').then(m => ({ default: m.ExpenseBaselineSettings })))
const TargetSettings = lazy(() => import('@/components/dashboard/targetsettings').then(m => ({ default: m.TargetSettings })))
const StoreAIUsageManagement = lazy(() => import('@/components/admin/storeaiusagemanagement').then(m => ({ default: m.StoreAIUsageManagement })))
const AuditLogViewer = lazy(() => import('@/components/admin/auditlogviewer').then(m => ({ default: m.AuditLogViewer })))
const BrandManagement = lazy(() => import('@/components/admin/brandmanagement').then(m => ({ default: m.BrandManagement })))
const ErrorLogViewer = lazy(() => import('@/components/admin/errorlogviewer').then(m => ({ default: m.ErrorLogViewer })))
const ErrorStatsDashboard = lazy(() => import('@/components/admin/errorstatsdashboard').then(m => ({ default: m.ErrorStatsDashboard })))
const RealtimeErrorMonitor = lazy(() => import('@/components/admin/realtimeerrormonitor').then(m => ({ default: m.RealtimeErrorMonitor })))
const DataExport = lazy(() => import('@/components/data/dataexport').then(m => ({ default: m.DataExport })))
const StoreHolidayManagement = lazy(() => import('@/components/stores/storeholidaymanagement').then(m => ({ default: m.StoreHolidayManagement })))
const AdminActivityLogViewer = lazy(() => import('@/components/admin/adminactivitylogviewer').then(m => ({ default: m.AdminActivityLogViewer })))
const SystemHealthDashboard = lazy(() => import('@/components/system/systemhealthdashboard').then(m => ({ default: m.SystemHealthDashboard })))
const DemoDataManagement = lazy(() => import('@/components/admin/demodatamanagement').then(m => ({ default: m.DemoDataManagement })))
const VendorAssignmentManager = lazy(() => import('@/components/admin/vendorassignmentmanager').then(m => ({ default: m.VendorAssignmentManager })))
const InlineVendorCategoryManager = lazy(() => import('@/components/admin/inlinevendorcategorymanager').then(m => ({ default: m.InlineVendorCategoryManager })))

type VendorForm = {
  name: string
  category: VendorDb['category']
  contact_info: string
  is_active: boolean
}

interface StoreExpenseBaseline {
  storeName: string
  storeId: string
  baseline: ExpenseBaselineDb | null
  loading: boolean
}

export const AdminSettings: React.FC = () => {
  const { organization } = useOrganization()
  const { user, isDemoMode } = useAuth()
  const {
    stores, targets, vendors, storeVendorAssignments,
    addStore, updateStore, deleteStore, upsertTarget, deleteTarget,
    addVendor, updateVendor, deleteVendor, getStoreVendors,
    assignVendorToStore, unassignVendorFromStore
  } = useAdminData()
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)

  const [storeForm, setStoreForm] = useState({
    id: '', name: '', address: '', manager: '', brandId: '', changeFund: '', isActive: true, editing: false
  })
  const [brands, setBrands] = useState<any[]>([])
  const [vendorCategories, setVendorCategories] = useState<any[]>([])
  const [storeLimits, setStoreLimits] = useState<{
    current: number;
    contracted: number;
    canAdd: boolean;
  } | null>(null)

  const [vendorForm, setVendorForm] = useState<VendorForm & { id: string; editing: boolean }>({
    id: '',
    name: '',
    category: vendorCategories[0]?.id || 'others',
    contact_info: '',
    is_active: true,
    editing: false
  })

  const [error, setError] = useState<string>('')
  const [sampleDataLoading, setSampleDataLoading] = useState(false)
  const [sampleDataMessage, setSampleDataMessage] = useState<string>('')

  const [assignmentForm, setAssignmentForm] = useState({
    selectedStoreId: '',
    unassignedVendors: [] as string[]
  })

  const [showExpenseBaselineModal, setShowExpenseBaselineModal] = useState(false)
  const [showTargetSettingsModal, setShowTargetSettingsModal] = useState(false)
  const [selectedHolidayStoreId, setSelectedHolidayStoreId] = useState<string>('')
  const [expenseMonth, setExpenseMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [storeExpenses, setStoreExpenses] = useState<StoreExpenseBaseline[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)

  const loadVendorCategories = async () => {
    if (!organization?.id) return

    const { data: categoriesData } = await supabase
      .from('vendor_categories')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('display_order')

    setVendorCategories(categoriesData || [])
    if (categoriesData && categoriesData.length > 0) {
      setVendorForm(prev => ({
        ...prev,
        category: prev.category === 'others' || !prev.category ? categoriesData[0].id : prev.category
      }))
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!organization?.id) {
        console.log('⚠️ AdminSettings: organization.idがありません')
        return
      }
      console.log('🔍 AdminSettings: ブランド取得開始', { organizationId: organization.id })
      const { data, error } = await getBrands({ organizationId: organization.id, isActive: true })
      console.log('🔍 AdminSettings: ブランド取得結果', { data, error })
      setBrands(data || [])

      // 業者カテゴリを取得
      await loadVendorCategories()

      // 契約状況を取得
      const limits = await subscriptionService.getSubscriptionLimits(organization.id)
      if (limits) {
        setStoreLimits({
          current: limits.currentStores,
          contracted: limits.contractedStores,
          canAdd: limits.currentStores < limits.contractedStores
        })
      }
    }
    loadData()
  }, [organization, stores.length])

  useEffect(() => {
    const loadExpenseBaselines = async () => {
      setLoadingExpenses(true)
      try {
        const { data: storesData, error: storesError } = await getStores()

        if (storesError || !storesData) {
          setLoadingExpenses(false)
          return
        }

        const expensePromises = storesData.map(async (store) => {
          const { data: baseline } = await getExpenseBaseline(store.id, expenseMonth)
          return {
            storeName: store.name,
            storeId: store.id,
            baseline: baseline || null,
            loading: false
          }
        })

        const results = await Promise.all(expensePromises)
        setStoreExpenses(results)
      } catch (err) {
        console.error('参考経費の取得に失敗:', err)
      } finally {
        setLoadingExpenses(false)
      }
    }

    loadExpenseBaselines()
  }, [expenseMonth])

  const handleInsertSampleData = async () => {
    if (isDemoMode) {
      setSampleDataMessage('デモモードでは実データの生成は行いません。ログイン後にお試しください。')
      return
    }

    if (!confirm('サンプルデータを投入します。既存のデータには影響しません。よろしいですか？')) {
      return
    }

    setSampleDataLoading(true)
    setSampleDataMessage('')

    try {
      const result = await insertSampleData()

      setSampleDataLoading(false)
      setSampleDataMessage(result.message)

      if (result.success) {
        alert(`${result.message}\n\nデータが投入されました。ダッシュボードで確認してください。`)
      } else {
        alert(`${result.message}\n\nSupabase接続時: 権限（admin）やRLSポリシーを確認してください。\nローカルモード: ブラウザのストレージ設定を確認してください。`)
      }
    } catch (e: any) {
      setSampleDataLoading(false)
      setSampleDataMessage('エラーが発生しました')
      alert(`エラー: ${e?.message ?? '不明なエラー'}`)
    }
  }

  const resetStoreForm = () => setStoreForm({ id:'', name:'', address:'', manager:'', brandId:'', changeFund:'', isActive:true, editing:false })
  const resetVendorForm = () => setVendorForm({
    id: '',
    name: '',
    category: vendorCategories[0]?.id || 'others',
    contact_info: '',
    is_active: true,
    editing: false
  })

  // 安全な onChange ハンドラ
  const handleVendorFormChange = <K extends keyof VendorForm>(key: K) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e?.target?.value ?? ''
      setVendorForm(prev => ({ ...prev, [key]: value }))
    }
  
  const onSubmitStore = async () => {
    setError('')

    if (!(storeForm.name ?? '').trim()) {
      setError('店舗名を入力してください')
      return { ok: false, error: '店舗名を入力してください' }
    }

    try {
      if (storeForm.editing && storeForm.id) {
        await updateStore(storeForm.id, {
          name: storeForm.name,
          address: storeForm.address,
          manager: storeForm.manager,
          brandId: storeForm.brandId || undefined,
          changeFund: storeForm.changeFund ? parseInt(storeForm.changeFund, 10) : undefined,
          isActive: storeForm.isActive
        })
        resetStoreForm()
        return { ok: true }
      } else {
        const result = await addStore({
          name: storeForm.name,
          address: storeForm.address,
          manager: storeForm.manager,
          brandId: storeForm.brandId || undefined,
          changeFund: storeForm.changeFund ? parseInt(storeForm.changeFund, 10) : undefined,
          isActive: storeForm.isActive
        })

        if (result.ok) {
          resetStoreForm()
        } else if (result.error) {
          setError(result.error)
        }
        return result
      }
    } catch (err) {
      console.error('❌ onSubmitStore: エラー:', err)
      const errorMsg = err instanceof Error ? err.message : '店舗の保存に失敗しました'
      setError(errorMsg)
      return { ok: false, error: errorMsg }
    }
  }

  const onSubmitVendor = async () => {
    setError('')
    const name = (vendorForm.name ?? '').trim()
    
    if (!name) {
      setError('業者名を入力してください')
      return
    }
    
    console.log('📝 onSubmitVendor: 開始', { editing: vendorForm.editing, id: vendorForm.id, name })
    
    if (vendorForm.editing && vendorForm.id) {
      // 編集時は差分のみ送信
      const updates: Partial<VendorDb> = {}
      if (name !== vendors.find(v => v.id === vendorForm.id)?.name) {
        updates.name = name
      }
      if (vendorForm.category !== vendors.find(v => v.id === vendorForm.id)?.category) {
        updates.category = vendorForm.category
      }
      const trimmedContact = vendorForm.contact_info.trim()
      if (trimmedContact !== (vendors.find(v => v.id === vendorForm.id)?.contact_info ?? '')) {
        updates.contact_info = trimmedContact
      }
      if (vendorForm.is_active !== vendors.find(v => v.id === vendorForm.id)?.is_active) {
        updates.is_active = vendorForm.is_active
      }
      
      try {
        await updateVendor(vendorForm.id, updates)
        console.log('✅ onSubmitVendor: 更新完了')
      } catch (err) {
        console.error('❌ onSubmitVendor: 更新エラー:', err)
        setError('業者の更新に失敗しました')
        return
      }
    } else {
      try {
        await addVendor({
          name,
          category: vendorForm.category,
          contactInfo: vendorForm.contact_info.trim(),
          isActive: vendorForm.is_active
        })
        console.log('✅ onSubmitVendor: 新規作成完了')
      } catch (err) {
        console.error('❌ onSubmitVendor: 作成エラー:', err)
        setError('業者の作成に失敗しました')
        return
      }
    }
    resetVendorForm()
  }

  const [targetForm, setTargetForm] = useState({
    storeId: '',
    period: new Date().toISOString().substring(0,7),
    targetSales: 0,
    targetProfitMargin: 20,
    targetCostRate: 30,
    targetLaborRate: 25
  })
  const [targetStatus, setTargetStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [targetFilterPeriod, setTargetFilterPeriod] = useState<string>('all')
  const selectedStoreName = useMemo(() => stores.find(s => s.id === targetForm.storeId)?.name ?? '', [stores, targetForm.storeId])
  const onSubmitTarget = async () => {
    if (!targetForm.storeId || !targetForm.period) {
      setTargetStatus({ success: false, message: '店舗と対象月を選択してください' })
      setTimeout(() => setTargetStatus(null), 3000)
      return
    }

    if (targetForm.targetSales === 0) {
      setTargetStatus({ success: false, message: '目標売上を入力してください' })
      setTimeout(() => setTargetStatus(null), 3000)
      return
    }

    try {
      const targetProfit = Math.round(targetForm.targetSales * (targetForm.targetProfitMargin / 100))
      console.log('📊 目標保存:', {
        storeId: targetForm.storeId,
        period: targetForm.period,
        targetSales: targetForm.targetSales,
        targetProfit,
        targetProfitMargin: targetForm.targetProfitMargin
      })

      await upsertTarget({
        storeId: targetForm.storeId,
        period: targetForm.period,
        targetSales: targetForm.targetSales,
        targetProfit,
        targetProfitMargin: targetForm.targetProfitMargin,
        targetCostRate: targetForm.targetCostRate,
        targetLaborRate: targetForm.targetLaborRate
      })

      setTargetStatus({ success: true, message: `${selectedStoreName}の${targetForm.period}目標を保存しました` })
      setTargetForm({ storeId: '', period: new Date().toISOString().substring(0,7), targetSales: 0, targetProfitMargin: 20, targetCostRate: 30, targetLaborRate: 25 })
      setTimeout(() => setTargetStatus(null), 3000)
    } catch (err) {
      console.error('❌ 目標保存エラー:', err)
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました'
      setTargetStatus({ success: false, message: `保存に失敗: ${errorMessage}` })
      setTimeout(() => setTargetStatus(null), 5000)
    }
  }

  const categoryLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    vendorCategories.forEach((cat: any) => {
      labels[cat.id] = cat.name
    })
    return labels
  }, [vendorCategories])

  return (
    <PermissionGuard requiredRole="manager">
    <div className="space-y-6">
      {/* スーパー管理者バナー */}
      {user?.isSuperAdmin && (
        <SuperAdminBanner
          organizationName={organization?.name}
          onSwitchOrganization={() => setShowOrgSwitcher(!showOrgSwitcher)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">設定（管理）</h1>
        <p className="text-sm text-muted-foreground">店舗情報、業者管理、月次目標、システム設定を行います。</p>
      </div>

      <Tabs defaultValue="store-management">
        <TabsList>
          <TabsTrigger value="store-management">
            <Store className="w-4 h-4 mr-2" />
            店舗管理
          </TabsTrigger>
          <TabsTrigger value="system-settings">
            <Database className="w-4 h-4 mr-2" />
            システム設定
          </TabsTrigger>
        </TabsList>

        {/* 店舗管理タブ */}
        <TabsContent value="store-management" className="mt-4">
          <Tabs defaultValue="stores">
            <TabsList>
              <TabsTrigger value="stores">
                <Store className="w-4 h-4 mr-2" />
                店舗登録
              </TabsTrigger>
              <TabsTrigger value="holidays">
                <Calendar className="w-4 h-4 mr-2" />
                休日設定
              </TabsTrigger>
              <TabsTrigger value="brands">
                業態管理
              </TabsTrigger>
              <TabsTrigger value="vendors">業者</TabsTrigger>
              <TabsTrigger value="targets">月次目標</TabsTrigger>
              <TabsTrigger value="expense-baseline">参考経費</TabsTrigger>
            </TabsList>

            {/* サンプルデータ投入 */}
            {stores.length === 0 && (
              <Card className="mt-4 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Database className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">初めてご利用の方へ</h3>
                      <p className="text-sm text-blue-800 mb-4">
                        店舗・業者・目標値のサンプルデータを一括で投入できます。
                        システムの動作確認やテストにご利用ください。
                      </p>
                      <Button
                        onClick={handleInsertSampleData}
                        disabled={sampleDataLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        {sampleDataLoading ? 'データ投入中...' : 'サンプルデータを投入'}
                      </Button>
                      {sampleDataMessage && (
                        <p className="text-sm text-blue-700 mt-3">{sampleDataMessage}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <TabsContent value="brands" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <BrandManagement />
              </Suspense>
            </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Store List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    店舗一覧
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {stores.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">店舗が登録されていません</p>
                    </div>
                  ) : (
                    stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => setSelectedHolidayStoreId(store.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedHolidayStoreId === store.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm mb-1">{store.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {store.address || '住所未設定'}
                        </div>
                        {store.brand_id && brands.find(b => b.id === store.brand_id) && (
                          <Badge variant="outline" className="text-xs mt-2">
                            {brands.find(b => b.id === store.brand_id)?.icon}{' '}
                            {brands.find(b => b.id === store.brand_id)?.name}
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Holiday Settings */}
            <div className="lg:col-span-2">
              {selectedHolidayStoreId && organization ? (
                <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                  <StoreHolidayManagement
                    storeId={selectedHolidayStoreId}
                    storeName={stores.find(s => s.id === selectedHolidayStoreId)?.name || ''}
                    organizationId={organization.id}
                    inline={true}
                  />
                </Suspense>
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">店舗を選択してください</p>
                      <p className="text-sm">
                        左側の店舗一覧から店舗を選択すると、休日設定を表示・編集できます
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stores" className="mt-4">
          {storeLimits && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">契約店舗数の状況</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        現在の登録店舗数: <span className="font-semibold">{storeLimits.current}</span> /
                        契約上限: <span className="font-semibold">{storeLimits.contracted}</span>店舗
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {storeLimits.canAdd ? (
                      <Badge className="bg-green-600 text-white">
                        残り {storeLimits.contracted - storeLimits.current}店舗登録可能
                      </Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        上限到達
                      </Badge>
                    )}
                  </div>
                </div>
                {!storeLimits.canAdd && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900">
                      店舗を追加するには、組織設定から契約店舗数を増やしてください。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>店舗の登録/編集</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm">店舗名</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.name} onChange={(e)=>setStoreForm(s=>({...s,name:e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">業態</label>
                  <select className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.brandId}
                    onChange={(e)=>setStoreForm(s=>({...s,brandId:e.target.value}))}>
                    <option value="">業態未設定</option>
                    {brands.map(b=>(
                      <option key={b.id} value={b.id}>{b.icon} {b.display_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">住所</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.address} onChange={(e)=>setStoreForm(s=>({...s,address:e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">店長/責任者</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.manager} onChange={(e)=>setStoreForm(s=>({...s,manager:e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">釣銭準備金（円）</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.changeFund}
                    onChange={(e)=>setStoreForm(s=>({...s,changeFund:e.target.value}))}
                    placeholder="例：50000"/>
                  <p className="text-xs text-muted-foreground">店舗で保持する釣銭用の現金準備金</p>
                </div>
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" checked={storeForm.isActive}
                    onChange={(e)=>setStoreForm(s=>({...s,isActive:e.target.checked}))}/>
                  <label htmlFor="active" className="text-sm">稼働中</label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onSubmitStore}
                    disabled={!storeForm.editing && storeLimits && !storeLimits.canAdd}
                  >
                    {storeForm.editing ? '更新' : '登録'}
                  </Button>
                  <Button variant="outline" onClick={resetStoreForm}>クリア</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>登録済み店舗</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stores.map(s=>(
                  <div key={s.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        {s.name}
                        {s.brand_id && brands.find(b=>b.id===s.brand_id) && (
                          <Badge variant="outline" className="text-xs">
                            {brands.find(b=>b.id===s.brand_id)?.icon} {brands.find(b=>b.id===s.brand_id)?.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">{s.address} / {s.manager}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? '稼働' : '停止'}</Badge>
                      <Button variant="outline" size="sm"
                        onClick={()=>setStoreForm({ id:s.id, name:s.name, address:s.address, manager:s.manager, brandId:s.brand_id||'', changeFund:(s as any).change_fund ? String((s as any).change_fund) : '', isActive:s.isActive, editing:true })}>
                        編集
                      </Button>
                      <Button variant="destructive" size="sm" onClick={()=>deleteStore(s.id)}>削除</Button>
                    </div>
                  </div>
                ))}
                {stores.length===0 && <div className="text-sm text-muted-foreground">店舗がありません。</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          {/* カテゴリ管理セクション */}
          <Suspense fallback={<div className="flex items-center justify-center p-4">読み込み中...</div>}>
            <InlineVendorCategoryManager onCategoryChange={loadVendorCategories} />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>業者の登録/編集</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm">業者名</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={vendorForm.name} 
                    onChange={handleVendorFormChange('name')}
                    placeholder="例：築地青果卸"/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">カテゴリ</label>
                  <select className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={vendorForm.category}
                    onChange={handleVendorFormChange('category')}>
                    {vendorCategories.length === 0 ? (
                      <option value="others">その他</option>
                    ) : (
                      vendorCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">連絡先（任意）</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={vendorForm.contact_info} 
                    onChange={handleVendorFormChange('contact_info')}
                    placeholder="例：03-1234-5678"/>
                </div>
                <div className="flex items-center gap-2">
                  <input id="vendorActive" type="checkbox" checked={vendorForm.is_active}
                    onChange={(e)=>setVendorForm(v=>({...v, is_active: e.target.checked}))}/>
                  <label htmlFor="vendorActive" className="text-sm">使用中</label>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={onSubmitVendor}
                    disabled={!(vendorForm.name ?? '').trim()}
                  >
                    {vendorForm.editing ? '更新' : '登録'}
                  </Button>
                  <Button variant="outline" onClick={resetVendorForm}>クリア</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>登録済み業者</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {/* 有効な業者 */}
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                    ✅ 使用中の業者 ({vendors.filter(v => v.isActive).length}件)
                  </h4>
                  <div className="space-y-2">
                    {vendors.filter(v => v.isActive).map(v => (
                      <div key={v.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-green-50">
                        <div className="text-sm">
                          <div className="font-medium">
                            📦 {(v.name ?? '').trim() !== '' ? v.name : '（名称未設定）'}
                          </div>
                          <div className="text-muted-foreground">{categoryLabels[v.category]}</div>
                          {(v.contact_info ?? '').trim() && (
                            <div className="text-xs text-muted-foreground">📞 {v.contact_info}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">使用中</Badge>
                          <Button variant="outline" size="sm"
                            onClick={() => setVendorForm({ 
                              id: v.id, 
                              name: (v.name ?? '').toString(), 
                              category: v.category ?? 'others', 
                              contact_info: (v.contact_info ?? '').toString(), 
                              is_active: v.is_active ?? true, 
                              editing: true 
                            })}>
                            編集
                          </Button>
                          <Button variant="destructive" size="sm" 
                            onClick={() => {
                              if (confirm(`業者「${(v.name ?? '').trim() || '（名称未設定）'}」を停止しますか？`)) {
                                deleteVendor(v.id)
                              }
                            }}>
                            停止
                          </Button>
                        </div>
                      </div>
                    ))}
                    {vendors.filter(v => v.isActive).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        使用中の業者がありません
                      </div>
                    )}
                  </div>
                </div>

                {/* 停止中の業者 */}
                {vendors.filter(v => !v.isActive).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                      ⛔ 停止中の業者 ({vendors.filter(v => !v.isActive).length}件)
                    </h4>
                    <div className="space-y-2">
                      {vendors.filter(v => !v.isActive).map(v => (
                        <div key={v.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-red-50">
                          <div className="text-sm">
                            <div className="font-medium text-red-700">
                              📦 {(v.name ?? '').trim() !== '' ? v.name : '（名称未設定）'}
                            </div>
                            <div className="text-red-600">
                              {categoryLabels[v.category]}
                              {(v.contact_info ?? '').trim() && ` / ${v.contact_info}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">停止中</Badge>
                            <Button variant="default" size="sm"
                              onClick={() => {
                                if (confirm(`業者「${(v.name ?? '').trim() || '（名称未設定）'}」を再開しますか？`)) {
                                  updateVendor(v.id, { isActive: true })
                                }
                              }}>
                              再開
                            </Button>
                            <Button variant="destructive" size="sm"
                              onClick={() => {
                                if (confirm(`業者「${(v.name ?? '').trim() || '（名称未設定）'}」を完全削除しますか？この操作は取り消せません。`)) {
                                 deleteVendor(v.id)
                                }
                              }}>
                              削除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 全業者がない場合のメッセージ */}
                {vendors.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">業者がまだ登録されていません</p>
                    <p className="text-xs mt-1">👆 左側のフォームから業者を追加してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 店舗別業者割り当て - 新しいトグルスイッチUI */}
          <div className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
              <VendorAssignmentManager
                stores={stores}
                vendors={vendors}
                selectedStoreId={assignmentForm.selectedStoreId}
                onStoreChange={(storeId) => setAssignmentForm(f => ({ ...f, selectedStoreId: storeId }))}
                getStoreVendors={getStoreVendors}
                assignVendorToStore={assignVendorToStore}
                unassignVendorFromStore={unassignVendorFromStore}
              />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">業態別テンプレートから一括設定</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    店舗の業態（居酒屋、カフェ、ラーメン店など）に応じた標準的な目標値を、
                    テンプレートから簡単に適用できます。複数店舗をまとめて管理できます。
                  </p>
                  <Button
                    onClick={() => setShowTargetSettingsModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    テンプレートから目標を設定
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>月次目標の設定（個別入力）</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {targetStatus && (
                  <div className={`p-3 rounded-lg border ${
                    targetStatus.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {targetStatus.message}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm">店舗</label>
                  <select className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.storeId}
                    onChange={(e)=>setTargetForm(f=>({...f, storeId:e.target.value}))}>
                    <option value="">選択してください</option>
                    {stores.map(s=>(
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">対象月</label>
                  <input type="month" className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.period}
                    onChange={(e)=>setTargetForm(f=>({...f, period:e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">月次目標売上（円）</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="8000000"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.targetSales === 0 ? '' : targetForm.targetSales}
                    onChange={(e)=>{
                      const numValue = e.target.value.replace(/[^0-9]/g,'')
                      setTargetForm(f=>({...f, targetSales: numValue === '' ? 0 : Number(numValue)}))
                    }}
                  />
                  <div className="text-xs text-muted-foreground">例: 8,000,000円（800万円）</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">目標営業利益率（%）</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="20"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.targetProfitMargin === 0 ? '' : targetForm.targetProfitMargin}
                    onChange={(e)=>{
                      const numValue = e.target.value.replace(/[^0-9.]/g,'')
                      setTargetForm(f=>({...f, targetProfitMargin: numValue === '' ? 0 : Number(numValue)}))
                    }}
                  />
                  <div className="text-xs text-muted-foreground">例: 20%（業界標準15-25%）</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">目標原価率（%）</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="30"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.targetCostRate === 0 ? '' : targetForm.targetCostRate}
                    onChange={(e)=>{
                      const numValue = e.target.value.replace(/[^0-9.]/g,'')
                      setTargetForm(f=>({...f, targetCostRate: numValue === '' ? 0 : Number(numValue)}))
                    }}
                  />
                  <div className="text-xs text-muted-foreground">例: 30%（飲食店の標準原価率）</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">目標人件費率（%）</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="25"
                    className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={targetForm.targetLaborRate === 0 ? '' : targetForm.targetLaborRate}
                    onChange={(e)=>{
                      const numValue = e.target.value.replace(/[^0-9.]/g,'')
                      setTargetForm(f=>({...f, targetLaborRate: numValue === '' ? 0 : Number(numValue)}))
                    }}
                  />
                  <div className="text-xs text-muted-foreground">例: 25%（飲食店の標準人件費率）</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  自動計算 目標営業利益：{formatCurrency(Math.round(targetForm.targetSales * (targetForm.targetProfitMargin/100)))}
                  {targetForm.storeId && selectedStoreName && (
                    <div className="mt-1 text-primary">
                      📊 {selectedStoreName} / {targetForm.period}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onSubmitTarget}
                    disabled={!targetForm.storeId || !targetForm.period || targetForm.targetSales === 0}
                  >
                    保存/更新
                  </Button>
                  <Button variant="outline" onClick={()=>setTargetForm({ storeId:'', period:new Date().toISOString().substring(0,7), targetSales:0, targetProfitMargin:20, targetCostRate:30, targetLaborRate:25 })}>
                    クリア
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>設定済み目標</CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-normal text-muted-foreground">表示月:</label>
                    <select
                      value={targetFilterPeriod}
                      onChange={(e) => setTargetFilterPeriod(e.target.value)}
                      className="px-3 py-1 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="all">すべて表示</option>
                      {Array.from(new Set(targets.map(t => t.period)))
                        .sort((a, b) => b.localeCompare(a))
                        .map(period => {
                          const [year, month] = period.split('-')
                          return (
                            <option key={period} value={period}>
                              {year}年{parseInt(month)}月
                            </option>
                          )
                        })}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {targets.length === 0 && <div className="text-sm text-muted-foreground">目標がありません。</div>}
                {(() => {
                  const filteredTargets = targetFilterPeriod === 'all'
                    ? targets
                    : targets.filter(t => t.period === targetFilterPeriod)

                  if (targets.length > 0 && filteredTargets.length === 0) {
                    const [year, month] = targetFilterPeriod.split('-')
                    return (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">{year}年{parseInt(month)}月の目標はありません</p>
                        <p className="text-xs mt-1">左側のフォームから目標を設定してください</p>
                      </div>
                    )
                  }

                  return filteredTargets
                    .sort((a,b)=> (a.storeId+a.period).localeCompare(b.storeId+b.period))
                    .map(t=>(
                  <div key={`${t.storeId}-${t.period}`} className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">
                        {stores.find(s=>s.id===t.storeId)?.name ?? t.storeId} / {t.period}
                      </div>
                      <div className="text-muted-foreground">
                        売上 {formatCurrency(t.targetSales)}・利益 {formatCurrency(t.targetProfit)}・利益率 {t.targetProfitMargin}%
                        {(t.targetCostRate > 0 || t.targetLaborRate > 0) && (
                          <span className="ml-2">
                            {t.targetCostRate > 0 && `・原価率 ${t.targetCostRate}%`}
                            {t.targetLaborRate > 0 && `・人件費率 ${t.targetLaborRate}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={()=>setTargetForm({ storeId: t.storeId, period: t.period, targetSales: t.targetSales, targetProfitMargin: t.targetProfitMargin, targetCostRate: t.targetCostRate || 30, targetLaborRate: t.targetLaborRate || 25 })}>
                        編集
                      </Button>
                      <Button variant="destructive" size="sm" onClick={()=>deleteTarget(t.storeId, t.period)}>削除</Button>
                    </div>
                  </div>
                  ))
                })()}
                {targets.length > 0 && (() => {
                  const filteredCount = targetFilterPeriod === 'all'
                    ? targets.length
                    : targets.filter(t => t.period === targetFilterPeriod).length
                  return (
                    <div className="pt-2 mt-2 border-t border-border text-xs text-muted-foreground text-center">
                      {targetFilterPeriod === 'all'
                        ? `全${targets.length}件の目標を表示中`
                        : `${filteredCount}件の目標を表示中（全${targets.length}件中）`}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expense-baseline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                参考経費（月次平均）設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">参考経費とは？</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>日報入力時に、食材費以外の経費を参考値として表示する機能です</li>
                    <li>光熱費・販促費・通信費など、請求書が月末に来る経費の月次平均を設定します</li>
                    <li>日報では自動的に日割り計算され、「参考KPI」として営業利益・利益率を表示します</li>
                    <li>翌月に確定値を月次経費として入力すれば、正確なPLに更新されます</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">💡 使い方</h4>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                    <li>下のボタンから店舗・月を選んで参考経費を設定</li>
                    <li>日報入力時に「参考KPI」として営業利益・利益率が表示されます</li>
                    <li>翌月、確定した経費を「月次経費入力」で登録してPLを確定</li>
                  </ol>
                </div>

                <Button
                  onClick={() => setShowExpenseBaselineModal(true)}
                  className="w-full sm:w-auto"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  参考経費を設定
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-lg">店舗別参考経費一覧</CardTitle>
                </div>
                <input
                  type="month"
                  value={expenseMonth}
                  onChange={(e) => setExpenseMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : storeExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  登録されている店舗がありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">店舗名</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">人件費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">光熱費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">家賃</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">消耗品</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">販促費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">清掃費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">雑費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">通信費</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">その他</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">営業日数</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 bg-emerald-50">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeExpenses.map((store) => {
                        const baseline = store.baseline
                        const hasData = baseline !== null

                        const laborCost = hasData
                          ? (baseline.labor_cost_employee || 0) + (baseline.labor_cost_part_time || 0)
                          : 0
                        const utilities = baseline?.utilities || 0
                        const rent = baseline?.rent || 0
                        const consumables = baseline?.consumables || 0
                        const promotion = baseline?.promotion || 0
                        const cleaning = baseline?.cleaning || 0
                        const misc = baseline?.misc || 0
                        const communication = baseline?.communication || 0
                        const others = baseline?.others || 0
                        const openDays = baseline?.open_days || 0
                        const total = laborCost + utilities + rent + consumables + promotion + cleaning + misc + communication + others

                        return (
                          <tr
                            key={store.storeId}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              !hasData ? 'opacity-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {store.storeName}
                              {!hasData && (
                                <span className="ml-2 text-xs text-gray-400">(未登録)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(laborCost) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(utilities) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(rent) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(consumables) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(promotion) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(cleaning) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(misc) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(communication) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? formatCurrency(others) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {hasData ? `${openDays}日` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700 bg-emerald-50">
                              {hasData ? formatCurrency(total) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                      {storeExpenses.some(s => s.baseline !== null) && (
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-4 py-3 text-sm text-gray-900">合計</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => {
                                const b = s.baseline
                                return sum + ((b?.labor_cost_employee || 0) + (b?.labor_cost_part_time || 0))
                              }, 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.utilities || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.rent || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.consumables || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.promotion || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.cleaning || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.misc || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.communication || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => sum + (s.baseline?.others || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {storeExpenses.reduce((sum, s) => sum + (s.baseline?.open_days || 0), 0)}日
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 bg-emerald-100">
                            {formatCurrency(
                              storeExpenses.reduce((sum, s) => {
                                const b = s.baseline
                                if (!b) return sum
                                const laborCost = (b.labor_cost_employee || 0) + (b.labor_cost_part_time || 0)
                                return sum + laborCost + (b.utilities || 0) + (b.rent || 0) +
                                  (b.consumables || 0) + (b.promotion || 0) + (b.cleaning || 0) +
                                  (b.misc || 0) + (b.communication || 0) + (b.others || 0)
                              }, 0)
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-600">
                <p>選択月: {new Date(expenseMonth + '-01').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</p>
                <p className="mt-1">
                  参考経費は月次計画で登録された金額です。未登録の店舗は「-」で表示されます。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          </Tabs>
        </TabsContent>

        {/* システム設定タブ */}
        <TabsContent value="system-settings" className="mt-4">
          <Tabs defaultValue="audit-logs">
            <TabsList>
              <TabsTrigger value="audit-logs">
                <Shield className="w-4 h-4 mr-2" />
                監査ログ
              </TabsTrigger>
              <TabsTrigger value="error-logs">
                <AlertTriangle className="w-4 h-4 mr-2" />
                エラーログ
              </TabsTrigger>
              <TabsTrigger value="data-export">
                <Download className="w-4 h-4 mr-2" />
                データエクスポート
              </TabsTrigger>
              <TabsTrigger value="ai-limits">
                <Brain className="w-4 h-4 mr-2" />
                AI使用制限
              </TabsTrigger>
              {user?.isSuperAdmin && (
                <>
                  <TabsTrigger value="system-health">
                    <Activity className="w-4 h-4 mr-2" />
                    システム監視
                  </TabsTrigger>
                  <TabsTrigger value="demo-data">
                    <Database className="w-4 h-4 mr-2" />
                    デモデータ管理
                  </TabsTrigger>
                  <TabsTrigger value="super-admin-activity">
                    <Shield className="w-4 h-4 mr-2" />
                    管理者ログ
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="audit-logs" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <AuditLogViewer />
              </Suspense>
            </TabsContent>

            <TabsContent value="error-logs" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <div className="space-y-6">
                  <ErrorStatsDashboard />
                  <RealtimeErrorMonitor />
                  <ErrorLogViewer />
                </div>
              </Suspense>
            </TabsContent>

            <TabsContent value="data-export" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <DataExport />
              </Suspense>
            </TabsContent>

            <TabsContent value="ai-limits" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <StoreAIUsageManagement />
              </Suspense>
            </TabsContent>

            {/* スーパー管理者専用タブ */}
            {user?.isSuperAdmin && (
              <>
                <TabsContent value="system-health" className="mt-4">
                  <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                    <SystemHealthDashboard />
                  </Suspense>
                </TabsContent>
                <TabsContent value="demo-data" className="mt-4">
                  <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                    <DemoDataManagement />
                  </Suspense>
                </TabsContent>
                <TabsContent value="super-admin-activity" className="mt-4">
                  <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                    <AdminActivityLogViewer />
                  </Suspense>
                </TabsContent>
              </>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* 組織切り替えモーダル */}
      {showOrgSwitcher && user?.isSuperAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">組織を切り替え</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrgSwitcher(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <OrganizationSwitcher />
            </div>
          </div>
        </div>
      )}

    </div>
      {showExpenseBaselineModal && (
        <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
          <ExpenseBaselineSettings
            stores={stores}
            onClose={() => setShowExpenseBaselineModal(false)}
            onSaved={() => {
              setShowExpenseBaselineModal(false)
            }}
          />
        </Suspense>
      )}
      {showTargetSettingsModal && (
        <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
          <TargetSettings
          stores={stores}
          existingTargets={targets}
          onClose={() => setShowTargetSettingsModal(false)}
          onSaved={() => {
            setShowTargetSettingsModal(false)
          }}
          upsertTarget={upsertTarget}
          deleteTarget={deleteTarget}
        />
        </Suspense>
      )}
    </PermissionGuard>
  )
}