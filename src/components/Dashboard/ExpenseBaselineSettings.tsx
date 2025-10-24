import React, { useState, useEffect } from 'react'
import { Save, X, Calendar, DollarSign, Users, Zap, Hop as Home, Package, Megaphone, Sparkles, MessageSquare, MoveHorizontal as MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getExpenseBaseline, upsertExpenseBaseline } from '@/services/supabase'
import { formatCurrency } from '@/lib/format'

interface ExpenseBaselineSettingsProps {
  stores: Array<{ id: string; name: string }>
  onClose: () => void
  onSaved?: () => void
}

export const ExpenseBaselineSettings: React.FC<ExpenseBaselineSettingsProps> = ({
  stores,
  onClose,
  onSaved
}) => {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formData, setFormData] = useState({
    open_days: 26,
    labor_cost_employee: 0,
    labor_cost_part_time: 0,
    utilities: 0,
    rent: 0,
    consumables: 0,
    promotion: 0,
    cleaning: 0,
    misc: 0,
    communication: 0,
    others: 0
  })

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    loadBaseline()
  }, [selectedStoreId, selectedYear, selectedMonth])

  const loadBaseline = async () => {
    if (!selectedStoreId) return

    const month = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const { data } = await getExpenseBaseline(selectedStoreId, month)

    if (data) {
      setFormData({
        open_days: data.open_days,
        labor_cost_employee: data.labor_cost_employee,
        labor_cost_part_time: data.labor_cost_part_time,
        utilities: data.utilities,
        rent: data.rent || 0,
        consumables: data.consumables || 0,
        promotion: data.promotion,
        cleaning: data.cleaning,
        misc: data.misc,
        communication: data.communication,
        others: data.others
      })
    } else {
      setFormData({
        open_days: 26,
        labor_cost_employee: 0,
        labor_cost_part_time: 0,
        utilities: 0,
        rent: 0,
        consumables: 0,
        promotion: 0,
        cleaning: 0,
        misc: 0,
        communication: 0,
        others: 0
      })
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSave = async () => {
    if (!selectedStoreId) {
      showNotification('error', '店舗を選択してください')
      return
    }

    if (formData.open_days < 1 || formData.open_days > 31) {
      showNotification('error', '稼働日数は1-31日で入力してください')
      return
    }

    setLoading(true)
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const store = stores.find(s => s.id === selectedStoreId)

    const { error } = await upsertExpenseBaseline(selectedStoreId, month, formData)
    setLoading(false)

    if (error) {
      showNotification('error', error.message ?? String(error))
    } else {
      showNotification('success', `${store?.name}の参考経費を保存しました`)
      onSaved?.()
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: 0 }))
      return
    }
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({ ...prev, [field]: numValue }))
    }
  }

  const totalMonthly =
    formData.labor_cost_employee +
    formData.labor_cost_part_time +
    formData.utilities +
    formData.rent +
    formData.consumables +
    formData.promotion +
    formData.cleaning +
    formData.misc +
    formData.communication +
    formData.others

  const dailyAverage = Math.round(totalMonthly / Math.max(formData.open_days, 1))

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              参考経費（月次平均）設定
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            日報入力時の参考KPI計算に使用する月次平均経費を設定します。食材費は日報で入力するため、ここでは設定不要です。
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {notification && (
            <div
              className={`p-4 rounded-lg ${
                notification.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {notification.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">対象店舗</label>
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">対象年</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">対象月</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {months.map(month => (
                  <option key={month} value={month}>
                    {month}月
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">稼働日数</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={formData.open_days}
                onChange={e => handleInputChange('open_days', e.target.value)}
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                min="1"
                max="31"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">日</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">日割り計算に使用します（通常26日程度）</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              人件費（月額）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">社員人件費</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.labor_cost_employee || ''}
                    onChange={e => handleInputChange('labor_cost_employee', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">アルバイト人件費</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.labor_cost_part_time || ''}
                    onChange={e => handleInputChange('labor_cost_part_time', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">その他経費（月額）</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  水道光熱費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.utilities || ''}
                    onChange={e => handleInputChange('utilities', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  賃料
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.rent || ''}
                    onChange={e => handleInputChange('rent', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  消耗品費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.consumables || ''}
                    onChange={e => handleInputChange('consumables', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  販促費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.promotion || ''}
                    onChange={e => handleInputChange('promotion', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  清掃費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.cleaning || ''}
                    onChange={e => handleInputChange('cleaning', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  通信費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.communication || ''}
                    onChange={e => handleInputChange('communication', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  雑費
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.misc || ''}
                    onChange={e => handleInputChange('misc', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MoreHorizontal className="w-4 h-4" />
                  その他
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.others || ''}
                    onChange={e => handleInputChange('others', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center font-medium">
              <span>月額合計</span>
              <span className="text-lg">{formatCurrency(totalMonthly)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-2">
              <span>1日あたり平均（参考値）</span>
              <span>{formatCurrency(dailyAverage)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
