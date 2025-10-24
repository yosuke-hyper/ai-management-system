import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAdminData } from '@/contexts/AdminDataContext'
import { formatCurrency } from '@/lib/format'
import { PermissionGuard } from '@/components/Auth/PermissionGuard'
import { type VendorDb } from '@/services/supabase'
import { insertSampleData } from '@/services/sampleData'
import { Database, DollarSign, Brain, Shield } from 'lucide-react'
import { ExpenseBaselineSettings } from '@/components/Dashboard/ExpenseBaselineSettings'
import { AIUsageLimitManagement } from '@/components/Admin/AIUsageLimitManagement'
import { AuditLogViewer } from '@/components/Admin/AuditLogViewer'

type VendorForm = {
  name: string
  category: VendorDb['category']
  contact_info: string
  is_active: boolean
}

export const AdminSettings: React.FC = () => {
  const { 
    stores, targets, vendors, storeVendorAssignments,
    addStore, updateStore, deleteStore, upsertTarget, deleteTarget,
    addVendor, updateVendor, deleteVendor, getStoreVendors,
    assignVendorToStore, unassignVendorFromStore
  } = useAdminData()

  const [storeForm, setStoreForm] = useState({
    id: '', name: '', address: '', manager: '', isActive: true, editing: false
  })
  
  const [vendorForm, setVendorForm] = useState<VendorForm & { id: string; editing: boolean }>({
    id: '',
    name: '',
    category: 'others',
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

  const handleInsertSampleData = async () => {
    if (!confirm('サンプルデータを投入します。既存のデータには影響しません。よろしいですか？')) {
      return
    }

    setSampleDataLoading(true)
    setSampleDataMessage('')

    const result = await insertSampleData()

    setSampleDataLoading(false)
    setSampleDataMessage(result.message)

    if (result.success) {
      alert(`${result.message}\n\nページをリロードしてデータを確認してください。`)
      window.location.reload()
    } else {
      alert(result.message)
    }
  }

  const resetStoreForm = () => setStoreForm({ id:'', name:'', address:'', manager:'', isActive:true, editing:false })
  const resetVendorForm = () => setVendorForm({ 
    id: '', 
    name: '', 
    category: 'others', 
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
  
  const onSubmitStore = () => {
    if (!(storeForm.name ?? '').trim()) return
    if (storeForm.editing && storeForm.id) {
      updateStore(storeForm.id, { name: storeForm.name, address: storeForm.address, manager: storeForm.manager, isActive: storeForm.isActive })
    } else {
      addStore({ id: storeForm.id || undefined, name: storeForm.name, address: storeForm.address, manager: storeForm.manager, isActive: storeForm.isActive })
    }
    resetStoreForm()
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

  const categoryLabels = {
    vegetable_meat: '野菜・肉類',
    seafood: '魚介類',
    alcohol: '酒類',
    rice: '米穀',
    seasoning: '調味料',
    frozen: '冷凍食品',
    dessert: '製菓・デザート',
    others: 'その他'
  }

  return (
    <PermissionGuard requiredRole="manager">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">設定（管理）</h1>
        <p className="text-sm text-muted-foreground">店舗情報、業者管理、月次目標の設定を行います。</p>
      </div>

      <Tabs defaultValue="stores">
        <TabsList>
          <TabsTrigger value="stores">店舗</TabsTrigger>
          <TabsTrigger value="vendors">業者</TabsTrigger>
          <TabsTrigger value="targets">月次目標</TabsTrigger>
          <TabsTrigger value="audit-logs">
            <Shield className="w-4 h-4 mr-2" />
            監査ログ
          </TabsTrigger>
          <TabsTrigger value="expense-baseline">参考経費</TabsTrigger>
          <TabsTrigger value="ai-limits">AI使用制限</TabsTrigger>
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

        <TabsContent value="stores" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>店舗の登録/編集</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">店舗名</label>
                  <input className="w-full border border-input rounded-md px-3 py-2 bg-background"
                    value={storeForm.name} onChange={(e)=>setStoreForm(s=>({...s,name:e.target.value}))}/>
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
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" checked={storeForm.isActive}
                    onChange={(e)=>setStoreForm(s=>({...s,isActive:e.target.checked}))}/>
                  <label htmlFor="active" className="text-sm">稼働中</label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onSubmitStore}>{storeForm.editing ? '更新' : '登録'}</Button>
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
                      <div className="font-medium">{s.name}</div>
                      <div className="text-muted-foreground">{s.address} / {s.manager}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? '稼働' : '停止'}</Badge>
                      <Button variant="outline" size="sm"
                        onClick={()=>setStoreForm({ id:s.id, name:s.name, address:s.address, manager:s.manager, isActive:s.isActive, editing:true })}>
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
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
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

          {/* 店舗別業者割り当て */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>店舗別業者割り当て</CardTitle>
              <div className="text-sm text-muted-foreground mt-2">
                📋 <strong>手順：</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>下から店舗を選択</li>
                  <li>右側の「未割り当て業者」から「追加」で割り当て</li>
                  <li>左側の「割り当て済み」から「削除」で解除</li>
                </ol>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm">店舗選択</label>
                <select 
                  value={assignmentForm.selectedStoreId}
                  onChange={(e)=>setAssignmentForm(f=>({...f, selectedStoreId:e.target.value}))}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background text-base min-h-[44px]">
                  <option value="">選択してください</option>
                  {stores.map(s=>(
                    <option key={s.id} value={s.id}>🏪 {s.name}</option>
                  ))}
                </select>
                {!assignmentForm.selectedStoreId && (
                  <p className="text-xs text-blue-600">👆 まず店舗を選択してください</p>
                )}
              </div>

              {assignmentForm.selectedStoreId && (
                <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    📍 <strong>{stores.find(s => s.id === assignmentForm.selectedStoreId)?.name}</strong> の業者管理
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    現在 {getStoreVendors(assignmentForm.selectedStoreId).length}業者 / 全{vendors.filter(v=>v.isActive).length}業者中
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      ✅ 割り当て済み業者 ({getStoreVendors(assignmentForm.selectedStoreId).length}件)
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {getStoreVendors(assignmentForm.selectedStoreId).length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded">
                          <p className="text-sm">まだ業者が割り当てられていません</p>
                          <p className="text-xs mt-1">右側から業者を追加してください →</p>
                        </div>
                      ) : getStoreVendors(assignmentForm.selectedStoreId).map(vendor => (
                        <div key={vendor.id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                          <div>
                            <div className="font-medium">
                              📦 {(vendor.name ?? '').trim() !== '' ? vendor.name : '（名称未設定）'}
                            </div>
                            <div className="text-muted-foreground">{categoryLabels[vendor.category]}</div>
                            {(vendor.contact_info ?? '').trim() && (
                              <div className="text-xs text-muted-foreground">📞 {vendor.contact_info}</div>
                            )}
                          </div>
                          <Button size="sm" variant="destructive" 
                            onClick={()=>unassignVendorFromStore(assignmentForm.selectedStoreId, vendor.id)}>
                            削除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      ➕ 未割り当て業者 ({vendors.filter(v => v.isActive && !getStoreVendors(assignmentForm.selectedStoreId).some(av => av.id === v.id)).length}件)
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {vendors
                        .filter(v => v.isActive && !getStoreVendors(assignmentForm.selectedStoreId).some(av => av.id === v.id))
                        .length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded">
                          <p className="text-sm">すべての業者が割り当て済みです</p>
                          <p className="text-xs mt-1">✅ 完了</p>
                        </div>
                      ) : vendors
                        .filter(v => v.isActive && !getStoreVendors(assignmentForm.selectedStoreId).some(av => av.id === v.id))
                        .map(vendor => (
                        <div key={vendor.id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                          <div>
                            <div className="font-medium">
                              📦 {(vendor.name ?? '').trim() !== '' ? vendor.name : '（名称未設定）'}
                            </div>
                            <div className="text-muted-foreground">{categoryLabels[vendor.category]}</div>
                            {(vendor.contact_info ?? '').trim() && (
                              <div className="text-xs text-muted-foreground">📞 {vendor.contact_info}</div>
                            )}
                          </div>
                          <Button size="sm" variant="default"
                            onClick={()=>assignVendorToStore(assignmentForm.selectedStoreId, vendor.id)}>
                            追加
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 一括割り当てオプション */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-2">クイック操作</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        vendors.filter(v => v.isActive).forEach(vendor => {
                          assignVendorToStore(assignmentForm.selectedStoreId, vendor.id)
                        })
                      }}
                      disabled={!assignmentForm.selectedStoreId}
                    >
                      全業者を割り当て
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        getStoreVendors(assignmentForm.selectedStoreId).forEach(vendor => {
                          unassignVendorFromStore(assignmentForm.selectedStoreId, vendor.id)
                        })
                      }}
                      disabled={!assignmentForm.selectedStoreId || getStoreVendors(assignmentForm.selectedStoreId).length === 0}
                    >
                      全業者の割り当て解除
                    </Button>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>月次目標の設定</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>設定済み目標</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {targets.length === 0 && <div className="text-sm text-muted-foreground">目標がありません。</div>}
                {targets
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
                ))}
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
        </TabsContent>

        <TabsContent value="ai-limits" className="mt-4">
          <AIUsageLimitManagement />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>

    </div>
      {showExpenseBaselineModal && (
        <ExpenseBaselineSettings
          stores={stores}
          onClose={() => setShowExpenseBaselineModal(false)}
          onSaved={() => {
            setShowExpenseBaselineModal(false)
          }}
        />
      )}
    </PermissionGuard>
  )
}