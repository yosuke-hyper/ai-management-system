import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type DailyReportData } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CircleCheck as CheckCircle, Save, CloudUpload as UploadCloud, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { createDailyReport, updateDailyReport, isSupabaseReady, getDailyReports, getDailyTarget } from '@/services/supabase'
import { useExpenseBaseline } from '@/hooks/useExpenseBaseline'

const numberAttrs = {
  inputMode: 'numeric' as const,
  pattern: '[0-9]*',
}

type FormState = {
  date: string
  storeId: string
  salesCash10: number
  salesCash8: number
  salesCredit10: number
  salesCredit8: number
  sales: number
  // 業者別仕入（動的）
  vendorPurchases: Record<string, number>
  purchase: number
  laborCost: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  customers: number
  reportText: string
}

const todayISO = () => new Date().toISOString().split('T')[0]

export const ReportForm: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, getAccessibleStores } = useAuth()
  const { getStoreVendors, vendors, storeVendorAssignments, stores: adminStores } = useAdminData()

  // 編集モード：URLパラメータでidを受け取る
  const editingReportId = params.get('id')
  const isEditMode = !!editingReportId

  // URLパラメータまたはアクセス可能な最初の店舗を初期値にする
  const getInitialStoreId = () => {
    const paramStore = params.get('store')
    if (paramStore && paramStore !== 'all') {
      const accessibleStores = getAccessibleStores()
      const storeExists = accessibleStores.find(s => s.id === paramStore)
      if (storeExists) return paramStore
    }
    // パラメータが無効な場合は、アクセス可能な最初の店舗を使う
    const accessibleStores = getAccessibleStores()
    return accessibleStores.length > 0 ? accessibleStores[0].id : 'all'
  }

  const [form, setForm] = useState<FormState>({
    date: todayISO(),
    storeId: '',
    salesCash10: 0, salesCash8: 0, salesCredit10: 0, salesCredit8: 0,
    sales: 0,
    vendorPurchases: {},
    purchase: 0, laborCost: 0, utilities: 0, rent: 0, consumables: 0,
    promotion: 0, cleaning: 0, misc: 0, communication: 0, others: 0,
    customers: 0,
    reportText: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<null | 'local' | 'sent'>(null)
  const [monthlyManaged, setMonthlyManaged] = useState(true)
  const [loading, setLoading] = useState(false)
  const [targetAchieved, setTargetAchieved] = useState(false)

  useEffect(() => {
    if (!form.storeId && user) {
      const initialStoreId = getInitialStoreId()
      setForm(f => ({ ...f, storeId: initialStoreId }))
    }
  }, [user])

  // 店舗に割り当てられた業者をAdminDataContextから取得（useMemoで自動更新）
  const storeVendors = useMemo(() => {
    if (!form.storeId || form.storeId === 'all') {
      console.log('📋 ReportForm: storeId が "all" または空のため業者リストは空です')
      return []
    }
    const result = getStoreVendors(form.storeId)
    console.log('📋 ReportForm: 店舗業者取得:', { storeId: form.storeId, count: result.length, result })
    return result
  }, [form.storeId, getStoreVendors])

  // 編集モード：既存データを読み込む
  useEffect(() => {
    if (isEditMode && editingReportId) {
      const loadReport = async () => {
        setLoading(true)
        let existingReport: DailyReportData | undefined

        // ローカルIDの場合はローカルストレージから
        if (editingReportId.startsWith('local-')) {
          const localReports: DailyReportData[] = JSON.parse(localStorage.getItem('userReports') || '[]')
          existingReport = localReports.find(r => r.id === editingReportId)
        } else if (isSupabaseReady()) {
          // Supabaseから取得
          const { data } = await getDailyReports({ userId: user?.id })
          if (data) {
            existingReport = data.find(r => r.id === editingReportId)
          }
        }

        if (existingReport) {
          console.log('📝 編集モード：データ読み込み', existingReport)
          // 売上を逆算（仮に全て現金10%として扱う）
          const salesCash10 = existingReport.sales || 0
          setForm({
            date: existingReport.date,
            storeId: existingReport.storeId,
            salesCash10,
            salesCash8: 0,
            salesCredit10: 0,
            salesCredit8: 0,
            sales: existingReport.sales,
            vendorPurchases: existingReport.vendorPurchases || {},
            purchase: existingReport.purchase,
            laborCost: existingReport.laborCost,
            utilities: existingReport.utilities || 0,
            rent: (existingReport as any).rent || 0,
            consumables: (existingReport as any).consumables || 0,
            promotion: existingReport.promotion || 0,
            cleaning: existingReport.cleaning || 0,
            misc: existingReport.misc || 0,
            communication: existingReport.communication || 0,
            others: existingReport.others || 0,
            customers: existingReport.customers || 0,
            reportText: existingReport.reportText || ''
          })
          // 月次管理フラグも判定
          if (existingReport.utilities > 0 || existingReport.promotion > 0) {
            setMonthlyManaged(false)
          }
        } else {
          alert('指定された日報が見つかりませんでした')
          navigate('/dashboard/daily')
        }
        setLoading(false)
      }

      loadReport()
    }
  }, [isEditMode, editingReportId, navigate, user])

  // 前回入力の呼び出し（店舗単位で記憶） - 新規作成時のみ
  useEffect(() => {
    if (!isEditMode) {
      const last = localStorage.getItem(`lastReport_${form.storeId}`)
      if (last) {
        const v = JSON.parse(last)
        setForm((f) => ({ ...f, ...v, date: todayISO() }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.storeId, isEditMode])

  // 業者別仕入の合計を自動計算
  const purchase = Object.values(form.vendorPurchases).reduce((sum, val) => sum + (val || 0), 0)
  
  // purchaseをformに反映
  React.useEffect(() => {
    setForm(f => ({ ...f, purchase }))
  }, [purchase])

  // 売上合計を自動計算
  const sales = (form.salesCash10 || 0) + (form.salesCash8 || 0) + (form.salesCredit10 || 0) + (form.salesCredit8 || 0)
  // salesをformに反映
  React.useEffect(() => {
    setForm(f => ({ ...f, sales }))
  }, [sales])

  // 参考経費（月次平均の日割り）
  const yyyymm = form.date.slice(0, 7)
  const { expenseBaseline: refDaily } = useExpenseBaseline(form.storeId, yyyymm)

  // 実績KPI（入力された値のみ）
  const totalExpenses = form.purchase + form.laborCost + form.utilities + form.rent + form.consumables + form.promotion + form.cleaning + form.misc + form.communication + form.others
  const grossProfit   = form.sales - form.purchase
  const operatingProfit = form.sales - totalExpenses
  const profitMargin  = form.sales > 0 ? (operatingProfit / form.sales) * 100 : 0

  // 参考KPI（食材費+月次管理の場合は参考経費を合算）
  const referenceExpenses = form.purchase + (monthlyManaged ? refDaily.totalExpense : form.laborCost + form.utilities + form.rent + form.consumables + form.promotion + form.cleaning + form.misc + form.communication + form.others)
  const referenceOperatingProfit = form.sales - referenceExpenses
  const referenceProfitMargin = form.sales > 0 ? (referenceOperatingProfit / form.sales) * 100 : 0

  const purchaseRate  = form.sales > 0 ? (form.purchase / form.sales) * 100 : 0
  const laborRate     = form.sales > 0 ? (form.laborCost / form.sales) * 100 : 0
  const primeRate     = form.sales > 0 ? ((form.purchase + form.laborCost) / form.sales) * 100 : 0
  const averageTicket = form.customers > 0 ? Math.round(form.sales / form.customers) : 0

  const setN = (key: keyof FormState, val: number) => setForm((f) => ({ ...f, [key]: Math.max(0, Math.round(val)) }))
  const setVendorPurchase = (vendorId: string, val: number) => setForm(f => ({
    ...f,
    vendorPurchases: { ...f.vendorPurchases, [vendorId]: Math.max(0, Math.round(val)) }
  }))
  const bump = (key: keyof FormState, step: number) => setN(key, Number((form as any)[key] || 0) + step)
  const bumpVendor = (vendorId: string, step: number) => setVendorPurchase(vendorId, (form.vendorPurchases[vendorId] || 0) + step)


  const submit = async () => {
    if (!user) {
      alert('ログインが必要です')
      return
    }

    setSaving(true); setSaved(null)

    const selectedStore = getAccessibleStores().find(s => s.id === form.storeId)
    if (!selectedStore) {
      alert('選択された店舗にアクセス権限がありません')
      setSaving(false)
      return
    }

    const reportData = {
      date: form.date,
      storeId: form.storeId,
      storeName: selectedStore.name,
      staffName: user.name,
      sales: form.sales,
      purchase: form.purchase,
      laborCost: form.laborCost,
      utilities: monthlyManaged ? 0 : form.utilities,
      rent: monthlyManaged ? 0 : form.rent,
      consumables: monthlyManaged ? 0 : form.consumables,
      promotion: monthlyManaged ? 0 : form.promotion,
      cleaning: monthlyManaged ? 0 : form.cleaning,
      misc: monthlyManaged ? 0 : form.misc,
      communication: monthlyManaged ? 0 : form.communication,
      others: monthlyManaged ? 0 : form.others,
      reportText: form.reportText,
      customers: form.customers,
      userId: user.id,
      vendorPurchases: form.vendorPurchases
    }

    // ローカル保存関数（フォールバック用）
    const saveToLocal = () => {
      const key = 'userReports'
      const current = JSON.parse(localStorage.getItem(key) || '[]')

      if (isEditMode && editingReportId) {
        // 編集モード：既存データを更新
        const index = current.findIndex((r: any) => r.id === editingReportId)
        if (index !== -1) {
          current[index] = {
            ...current[index],
            ...reportData,
            updated_at: new Date().toISOString()
          }
          localStorage.setItem(key, JSON.stringify(current))
          setSaved('local')
          console.log('📦 ローカルストレージで更新:', current[index])
        }
      } else {
        // 新規作成
        const localReport = {
          id: `local-${Date.now()}`,
          ...reportData,
          createdAt: new Date().toISOString()
        }
        localStorage.setItem(key, JSON.stringify([localReport, ...current]))
        setSaved('local')
        console.log('📦 ローカルストレージに保存:', localReport)
      }
    }

    try {
      // Supabase未設定の場合は即ローカル保存
      if (!isSupabaseReady()) {
        console.log('🔧 Supabase未設定、ローカル保存します')
        saveToLocal()

        // 次回入力の補助データを保存（新規作成時のみ）
        // 仕入れデータはリセットし、その他の経費のみ保持
        if (!isEditMode) {
          localStorage.setItem(`lastReport_${form.storeId}`, JSON.stringify({
            storeId: form.storeId,
            vendorPurchases: {}, // 仕入れはリセット
            laborCost: form.laborCost,
            utilities: form.utilities,
            rent: form.rent,
            consumables: form.consumables,
            promotion: form.promotion,
            cleaning: form.cleaning,
            misc: form.misc,
            communication: form.communication,
            others: form.others
          }))
        }

        setTimeout(() => {
          navigate('/dashboard/daily')
        }, 800)
        return
      }

      // Supabaseに保存または更新
      let data, error
      if (isEditMode && editingReportId) {
        // 編集モード：更新
        const updates = {
          date: reportData.date,
          store_id: reportData.storeId,
          user_id: reportData.userId,
          sales: reportData.sales,
          purchase: reportData.purchase,
          labor_cost: reportData.laborCost,
          utilities: reportData.utilities,
          rent: reportData.rent,
          consumables: reportData.consumables,
          promotion: reportData.promotion,
          cleaning: reportData.cleaning,
          misc: reportData.misc,
          communication: reportData.communication,
          others: reportData.others,
          customers: reportData.customers,
          report_text: reportData.reportText
        }
        const result = await updateDailyReport(editingReportId, updates)
        data = result.data
        error = result.error
      } else {
        // 新規作成
        const result = await createDailyReport(reportData)
        data = result.data
        error = result.error
      }

      if (error) {
        // RLS等の失敗もローカル保存にフォールバック
        console.warn('⚠️ 日報保存失敗、ローカル保存にフォールバック:', error)
        saveToLocal()
      } else {
        console.log('✅ Supabaseに保存成功:', data)
        setSaved('sent')

        // 目標達成判定（新規作成時のみ）
        if (!isEditMode) {
          try {
            const { data: targetData } = await getDailyTarget(form.storeId, form.date)
            if (targetData && targetData.target_sales > 0) {
              const achieved = form.sales >= targetData.target_sales
              setTargetAchieved(achieved)
              if (achieved) {
                console.log('🎉 目標達成！', {
                  target: targetData.target_sales,
                  actual: form.sales
                })
              }
            }
          } catch (e) {
            console.log('目標達成判定エラー:', e)
          }
        }
      }

      // 次回入力の補助データを保存（新規作成時のみ）
      // 仕入れデータはリセットし、その他の経費のみ保持
      if (!isEditMode) {
        localStorage.setItem(`lastReport_${form.storeId}`, JSON.stringify({
          storeId: form.storeId,
          vendorPurchases: {}, // 仕入れはリセット
          laborCost: form.laborCost,
          utilities: form.utilities,
          rent: form.rent,
          consumables: form.consumables,
          promotion: form.promotion,
          cleaning: form.cleaning,
          misc: form.misc,
          communication: form.communication,
          others: form.others
        }))
      }

      // ダッシュボードに戻る（目標達成時は少し長めに表示）
      setTimeout(() => {
        navigate('/dashboard/daily')
      }, targetAchieved ? 2000 : 800)

    } catch (e) {
      console.error('❌ 報告作成エラー:', e)
      // 予期せぬ例外もローカルへ
      saveToLocal()
      alert('報告の保存に失敗しました（ローカルに退避しました）')
    } finally {
      setSaving(false)
    }
  }

  const storeOptions = useMemo(() => {
    let accessibleStores = getAccessibleStores()

    // もし accessibleStores が空で、AdminDataContext に stores がある場合はそれを使う
    if (accessibleStores.length === 0 && user?.role === 'admin' && adminStores.length > 0) {
      accessibleStores = adminStores.map(s => ({ id: s.id, name: s.name }))
    }

    return accessibleStores.map(store => ({
      id: store.id,
      name: store.name,
      disabled: false
    }))
  }, [getAccessibleStores, user?.role, adminStores])

  return (
    <div className="max-w-4xl mx-auto space-y-4 px-2 sm:px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{isEditMode ? '日報編集' : '日報入力'}</h1>
        <Badge>Mobile Friendly</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <input id="monthlyManaged" type="checkbox" checked={monthlyManaged} onChange={e=>setMonthlyManaged(e.target.checked)} />
            <label htmlFor="monthlyManaged" className="text-sm">
              水道光熱費/賃料/消耗品費/販促費/清掃費/通信費/雑費/その他は<strong>月次入力で管理</strong>する
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">日付</label>
              <input type="date" value={form.date} onChange={(e)=>setForm(f=>({...f, date: e.target.value}))}
                className="w-full px-3 py-3 rounded border border-input bg-background text-base min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">店舗</label>
              <select value={form.storeId} onChange={(e)=>setForm(f=>({...f, storeId: e.target.value}))}
                className="w-full px-3 py-3 rounded border border-input bg-background text-base min-h-[44px]">
                {storeOptions.map(s=>(
                  <option key={s.id} value={s.id} disabled={(s as any).disabled}>{'name' in s ? (s as any).name : s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>数値入力</CardTitle></CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
        {/* 売上の内訳入力 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
            💰 売上内訳（決済方法・税率別）
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">💵 現金・10%飲食</label>
              <input {...numberAttrs} inputMode="numeric"
                value={form.salesCash10 || ''} 
                onChange={(e)=>setN('salesCash10', Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                placeholder="0"
                className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">💵 現金・8%軽減</label>
              <input {...numberAttrs} inputMode="numeric"
                value={form.salesCash8 || ''} 
                onChange={(e)=>setN('salesCash8', Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                placeholder="0"
                className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">💳 クレジット・10%飲食</label>
              <input {...numberAttrs} inputMode="numeric"
                value={form.salesCredit10 || ''} 
                onChange={(e)=>setN('salesCredit10', Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                placeholder="0"
                className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">💳 クレジット・8%軽減</label>
              <input {...numberAttrs} inputMode="numeric"
                value={form.salesCredit8 || ''} 
                onChange={(e)=>setN('salesCredit8', Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                placeholder="0"
                className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px]" />
            </div>
          </div>
          <div className="mt-3 p-3 bg-white rounded border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">現金計：</span>
                <span className="font-mono">{formatCurrency((form.salesCash10 || 0) + (form.salesCash8 || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">クレジット計：</span>
                <span className="font-mono">{formatCurrency((form.salesCredit10 || 0) + (form.salesCredit8 || 0))}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-base font-medium">
              <span className="text-blue-800">売上合計：</span>
              <span className="font-mono text-blue-900">{formatCurrency(form.sales)}</span>
            </div>
          </div>
        </div>

        {/* 業者別仕入入力 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
            🛒 仕入内訳（店舗登録業者別）
          </h3>
          {(!form.storeId || form.storeId === 'all') ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">
                仕入内訳を入力するには、先に店舗を選択してください。
              </p>
            </div>
          ) : storeVendors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">
                この店舗に業者が割り当てられていません。
              </p>
              <p className="text-xs mt-1">設定画面で業者を追加してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {storeVendors.map(vendor => (
                <div key={vendor.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="w-full sm:w-32 text-xs text-muted-foreground">
                    {vendor.name}
                  </div>
                  <div className="flex-1 w-full">
                    <input {...numberAttrs} inputMode="numeric"
                      value={form.vendorPurchases[vendor.id] || ''} 
                      onChange={(e)=>setVendorPurchase(vendor.id, Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded border border-input bg-background text-right text-sm font-mono min-h-[36px]" />
                  </div>
                  <div className="flex gap-1 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={()=>bumpVendor(vendor.id, -1000)}
                      className="flex-1 sm:flex-none min-h-[36px] sm:h-7 text-xs">-1k</Button>
                    <Button variant="outline" size="sm" onClick={()=>bumpVendor(vendor.id, +1000)}
                      className="flex-1 sm:flex-none min-h-[36px] sm:h-7 text-xs">+1k</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 p-3 bg-white rounded border border-red-200">
            <div className="flex justify-between text-base font-medium">
              <span className="text-red-800">仕入合計：</span>
              <span className="font-mono text-red-900">{formatCurrency(form.purchase)}</span>
            </div>
          </div>
        </div>

          {[
            ['laborCost','人件費'],
            ['utilities','水道光熱費', 'monthly'],
            ['rent','賃料', 'monthly'],
            ['consumables','消耗品費', 'monthly'],
            ['promotion','販促費', 'monthly'],
            ['cleaning','清掃費', 'monthly'],
            ['misc','雑費', 'monthly'],
            ['communication','通信費', 'monthly'],
            ['others','その他', 'monthly'],
          ].map(([key,label, category]) => (
            <div key={key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="w-full sm:w-20 text-sm font-medium text-foreground sm:text-muted-foreground">
                {label}
                {category === 'monthly' && monthlyManaged && <span className="text-xs text-blue-600 ml-1">(月次)</span>}
              </div>
              <div className="flex-1 w-full">
                <input {...numberAttrs} inputMode="numeric"
                  value={(form as any)[key] || ''} 
                  onChange={(e)=>setN(key as keyof FormState, Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                  disabled={category === 'monthly' && monthlyManaged}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px] disabled:bg-muted disabled:text-muted-foreground" />
              </div>
              <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={()=>bump(key as keyof FormState, -1000)} 
                  disabled={category === 'monthly' && monthlyManaged}
                  className="flex-1 sm:flex-none min-h-[44px] sm:h-8 text-xs sm:text-sm">-1,000</Button>
                <Button variant="outline" size="sm" onClick={()=>bump(key as keyof FormState, +1000)}
                  disabled={category === 'monthly' && monthlyManaged}
                  className="flex-1 sm:flex-none min-h-[44px] sm:h-8 text-xs sm:text-sm">+1,000</Button>
              </div>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-full sm:w-20 text-sm font-medium text-foreground sm:text-muted-foreground">客数</div>
            <div className="flex-1 w-full">
              <input {...numberAttrs}
                value={form.customers || ''} onChange={(e)=>setN('customers', Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                placeholder="0"
                className="w-full px-4 py-3 rounded border border-input bg-background text-right text-lg sm:text-base font-mono min-h-[44px]" />
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={()=>bump('customers', -1)}
                className="flex-1 sm:flex-none min-h-[44px] sm:h-8 text-xs sm:text-sm">-1</Button>
              <Button variant="outline" size="sm" onClick={()=>bump('customers', +1)}
                className="flex-1 sm:flex-none min-h-[44px] sm:h-8 text-xs sm:text-sm">+1</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>自動計算（実績）</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <Stat label="経費合計" value={formatCurrency(totalExpenses)} />
          <Stat label="粗利益" value={formatCurrency(grossProfit)} pos={grossProfit>=0} />
          <Stat label="営業利益" value={formatCurrency(operatingProfit)} pos={operatingProfit>=0} />
          <Stat label="利益率" value={formatPercent(profitMargin)} pos={profitMargin>=0} />
          <Stat label="原価率" value={formatPercent(purchaseRate)} pos={purchaseRate<=32} />
          <Stat label="人件費率" value={formatPercent(laborRate)} pos={laborRate<=27} />
          <Stat label="プライムコスト率" value={formatPercent(primeRate)} pos={primeRate<=58} />
          <Stat label="客単価" value={averageTicket ? formatCurrency(averageTicket) : '-'} />
        </CardContent>
      </Card>

      {monthlyManaged && refDaily.totalExpense > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <span>📊</span>
              参考KPI（月次平均経費を使用）
            </CardTitle>
            <p className="text-xs text-amber-700 mt-1">
              食材費以外の経費を月次平均の日割り値で計算した参考値です。翌月に確定値を入力してください。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              <Stat label="参考 営業利益" value={formatCurrency(referenceOperatingProfit)} pos={referenceOperatingProfit>=0} />
              <Stat label="参考 利益率" value={formatPercent(referenceProfitMargin)} pos={referenceProfitMargin>=0} />
            </div>

            <div className="rounded-lg border border-amber-300 bg-white p-3">
              <div className="text-xs font-medium text-amber-900 mb-2">参考経費の内訳（1日あたり）</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-amber-800">
                {refDaily.laborCost > 0 && <div>人件費：{formatCurrency(refDaily.laborCost)}</div>}
                {refDaily.utilities > 0 && <div>水道光熱費：{formatCurrency(refDaily.utilities)}</div>}
                {refDaily.rent > 0 && <div>賃料：{formatCurrency(refDaily.rent)}</div>}
                {refDaily.consumables > 0 && <div>消耗品費：{formatCurrency(refDaily.consumables)}</div>}
                {refDaily.promotion > 0 && <div>販促費：{formatCurrency(refDaily.promotion)}</div>}
                {refDaily.cleaning > 0 && <div>清掃費：{formatCurrency(refDaily.cleaning)}</div>}
                {refDaily.communication > 0 && <div>通信費：{formatCurrency(refDaily.communication)}</div>}
                {refDaily.misc > 0 && <div>雑費：{formatCurrency(refDaily.misc)}</div>}
                {refDaily.others > 0 && <div>その他：{formatCurrency(refDaily.others)}</div>}
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200 text-sm font-medium text-amber-900 flex justify-between">
                <span>合計</span>
                <span>{formatCurrency(refDaily.totalExpense)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>メモ</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={form.reportText}
            onChange={(e)=>setForm(f=>({...f, reportText: e.target.value}))}
            placeholder="例：雨で来客減。テイクアウト強化で客単価維持。"
            className="w-full px-4 py-3 rounded border border-input bg-background min-h-24 text-base resize-none min-h-[44px]"
          />
          <p className="text-xs text-muted-foreground mt-2">💬 音声入力も可（スマホのマイク機能）</p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background p-4 -mx-2 sm:mx-0 sm:p-0 sm:bg-transparent rounded-lg sm:rounded-none border sm:border-none">
        <Button className="flex-1 min-h-[44px] sm:h-10 text-base sm:text-sm" onClick={submit} disabled={saving || form.storeId==='all' || loading}>
          {saving ? <UploadCloud className="h-4 w-4 mr-2 animate-pulse" /> : <Save className="h-4 w-4 mr-2" />}
          {isEditMode ? '更新' : '保存'}
        </Button>
        <Button variant="outline" className="w-full sm:w-36 min-h-[44px] sm:h-10 text-base sm:text-sm" onClick={()=>navigate('/dashboard/daily')}>
          ダッシュボードへ
        </Button>
      </div>

      {saved && (
        <div className={cn('flex items-center gap-2 text-sm p-3 rounded-lg border',
          saved==='local' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-green-700 bg-green-50 border-green-200')}>
          <CheckCircle className="h-4 w-4" />
          {saved==='sent' ? (
            <div>
              保存が完了しました。
              {monthlyManaged && <div className="text-xs mt-1">💡 月次経費は別途「月次経費入力」画面で管理してください</div>}
            </div>
          ) : '保存しました'}
        </div>
      )}

      {targetAchieved && (
        <div className="flex items-center gap-3 text-lg p-4 rounded-lg border bg-green-50 border-green-200 animate-pulse">
          <Trophy className="h-6 w-6 text-green-600" />
          <div className="font-bold text-green-700">
            本日の売上目標を達成しました！おめでとうございます！
          </div>
        </div>
      )}
    </div>
  )
}

const Stat: React.FC<{label:string; value:string; pos?: boolean}> = ({label, value, pos}) => (
  <div className="p-3 sm:p-4 rounded border border-border">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={cn('text-sm sm:text-base font-semibold leading-tight', pos==null ? '' : pos ? 'text-green-600' : 'text-red-600')}>
      {value}
    </div>
  </div>
)