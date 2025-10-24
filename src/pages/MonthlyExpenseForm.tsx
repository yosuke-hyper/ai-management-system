import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { CircleCheck as CheckCircle, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminData } from '@/contexts/AdminDataContext'
import { upsertMonthlyExpense, getMonthlyExpenses } from '@/services/supabase'

type MonthlyExpense = {
  id: string
  storeId: string
  month: string // 'YYYY-MM'
  laborCostEmployee: number
  laborCostPartTime: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  memo?: string
  createdAt: string
  updatedAt: string
}

const numAttr = { inputMode: 'numeric' as const, pattern: '[0-9]*' }
const thisMonth = () => new Date().toISOString().slice(0, 7) // YYYY-MM

export const MonthlyExpenseForm: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, getAccessibleStores } = useAuth()
  const { stores: adminStores } = useAdminData()

  const getInitialStoreId = () => {
    const paramStore = params.get('store')
    if (paramStore && paramStore !== 'all') {
      const accessibleStores = getAccessibleStores()
      const storeExists = accessibleStores.find(s => s.id === paramStore)
      if (storeExists) return paramStore
    }
    const accessibleStores = getAccessibleStores()
    return accessibleStores.length > 0 ? accessibleStores[0].id : ''
  }

  const initialMonth = params.get('month') || thisMonth()

  const [form, setForm] = useState<MonthlyExpense>({
    id: '',
    storeId: '',
    month: initialMonth,
    laborCostEmployee: 0,
    laborCostPartTime: 0,
    utilities: 0,
    rent: 0,
    consumables: 0,
    promotion: 0,
    cleaning: 0,
    misc: 0,
    communication: 0,
    others: 0,
    memo: '',
    createdAt: '',
    updatedAt: ''
  })
  const [saved, setSaved] = useState<null | 'ok'>(null)

  useEffect(() => {
    if (!form.storeId && user) {
      const initialStoreId = getInitialStoreId()
      setForm(f => ({ ...f, storeId: initialStoreId }))
    }
  }, [user])

  // Supabaseから既存データをロード
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!user || !form.storeId || !form.month) return
      
      try {
        const { data, error } = await getMonthlyExpenses({
          storeId: form.storeId,
          month: form.month,
          userId: user.id
        })
        
        if (!error && data && data.length > 0) {
          const existing = data[0]
          setForm({
            id: existing.id,
            storeId: existing.store_id,
            month: existing.month,
            laborCostEmployee: existing.labor_cost_employee,
            laborCostPartTime: existing.labor_cost_part_time,
            utilities: existing.utilities,
            rent: existing.rent || 0,
            consumables: existing.consumables || 0,
            promotion: existing.promotion,
            cleaning: existing.cleaning,
            misc: existing.misc,
            communication: existing.communication,
            others: existing.others,
            memo: existing.memo || '',
            createdAt: existing.created_at || '',
            updatedAt: existing.updated_at || ''
          })
        } else {
          // 新規作成の場合はフォームをリセット
          setForm(f => ({ 
            ...f, 
            id: '', 
            laborCostEmployee: 0,
            laborCostPartTime: 0,
            utilities: 0,
            rent: 0,
            consumables: 0,
            promotion: 0,
            cleaning: 0,
            misc: 0,
            communication: 0,
            others: 0,
            memo: '' 
          }))
        }
      } catch (err) {
        console.error('❌ 月次経費データ取得エラー:', err)
      }
    }
    
    fetchExistingData()
  }, [form.storeId, form.month, user])

  const total = form.laborCostEmployee + form.laborCostPartTime + form.utilities + form.rent + form.consumables + form.promotion + form.cleaning + form.misc + form.communication + form.others

  const setN = (key: keyof MonthlyExpense, val: number) =>
    setForm(f => ({ ...f, [key]: Math.max(0, Math.round(val)) }))

  const save = async () => {
    if (!user) {
      alert('ログインが必要です')
      return
    }

    if (!form.storeId || form.storeId === 'all') {
      alert('店舗を選択してください')
      return
    }
    
    try {
      const expenseData = {
        store_id: form.storeId,
        user_id: user.id,
        month: form.month,
        labor_cost_employee: form.laborCostEmployee,
        labor_cost_part_time: form.laborCostPartTime,
        utilities: form.utilities,
        rent: form.rent,
        consumables: form.consumables,
        promotion: form.promotion,
        cleaning: form.cleaning,
        misc: form.misc,
        communication: form.communication,
        others: form.others,
        memo: form.memo
      }
      
      const { data, error } = await upsertMonthlyExpense(expenseData)
      
      if (error) {
        throw new Error(error.message)
      }
      
      setSaved('ok')
      setTimeout(() => setSaved(null), 2000)
      
    } catch (err) {
      console.error('❌ 月次経費保存エラー:', err)
      alert('保存に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'))
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">月次経費入力</h1>
        <Badge>Demo / Local</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>対象</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">店舗</label>
            <select
              value={form.storeId}
              onChange={(e)=>setForm(f=>({...f, storeId: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-input bg-background">
              {storeOptions.map(s=>(
                <option key={s.id} value={s.id} disabled={(s as any).disabled}>
                  {'name' in s ? (s as any).name : s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">対象月</label>
            <input
              type="month"
              value={form.month}
              onChange={(e)=>setForm(f=>({...f, month: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-input bg-background" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>金額入力（1ヶ月分・税込み想定）</CardTitle>
          <div className="text-sm text-muted-foreground mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            💡 <strong>人件費について：</strong>日報で入力される人件費は想定値です。月末にこちらで正式な金額に修正してください。
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ['laborCostEmployee','人件費（社員）'],
            ['laborCostPartTime','人件費（アルバイト）'],
            ['utilities','水道光熱費'],
            ['rent','賃料'],
            ['consumables','消耗品費'],
            ['promotion','販促費'],
            ['cleaning','清掃費'],
            ['misc','雑費'],
            ['communication','通信費'],
            ['others','その他'], // 家賃など固定費
          ].map(([key,label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-24 text-sm text-muted-foreground">{label}</div>
              <div className="flex-1">
                <input {...numAttr}
                  value={(form as any)[key] || ''}
                  onChange={(e)=>setN(key as keyof MonthlyExpense, Number(e.target.value.replace(/[^0-9]/g,''))||0)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded border border-input bg-background text-right" />
              </div>
              <div className="text-sm w-28 text-right text-muted-foreground">{formatCurrency((form as any)[key] || 0)}</div>
            </div>
          ))}
          <div className="pt-3 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">合計</span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>メモ（任意）</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={form.memo || ''}
            onChange={(e)=>setForm(f=>({...f, memo: e.target.value }))}
            placeholder="例：家賃・ASP利用料を含む。"
            className="w-full px-3 py-2 rounded border border-input bg-background min-h-24"
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={save} disabled={form.storeId==='all'}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </Button>
        <Button variant="outline" className="w-36" onClick={()=>navigate('/dashboard/monthly')}>
          月次ダッシュボードへ
        </Button>
      </div>

      {saved && (
        <div className={cn('flex items-center gap-2 text-sm text-green-600')}>
          <CheckCircle className="h-4 w-4" />
          保存しました。ダッシュボードに反映されます。
        </div>
      )}
    </div>
  )
}