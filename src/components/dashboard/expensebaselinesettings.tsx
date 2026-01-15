import React, { useState, useEffect } from 'react'
import { Save, X, Calendar, DollarSign, Users, Zap, Hop as Home, Package, Megaphone, Sparkles, MessageSquare, MoveHorizontal as MoreHorizontal, CheckCircle2, Circle, RefreshCw, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getExpenseBaseline, upsertExpenseBaseline } from '@/services/supabase'
import { calculateOpenDays } from '@/services/storeholidays'
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
  const [storeConfigStatus, setStoreConfigStatus] = useState<Record<string, boolean>>({})
  const [calculatedOpenDays, setCalculatedOpenDays] = useState<number | null>(null)

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

  useEffect(() => {
    checkStoresConfigStatus()
  }, [selectedYear, selectedMonth, stores])

  const checkStoresConfigStatus = async () => {
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const statusMap: Record<string, boolean> = {}

    for (const store of stores) {
      const { data } = await getExpenseBaseline(store.id, month)
      statusMap[store.id] = !!data
    }

    setStoreConfigStatus(statusMap)
  }

  const loadBaseline = async () => {
    if (!selectedStoreId) return

    const month = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

    const { data: calculatedDays } = await calculateOpenDays(selectedStoreId, month)
    setCalculatedOpenDays(calculatedDays)

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
        open_days: calculatedDays || 26,
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
      await checkStoresConfigStatus()
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

  const handleCalculateOpenDays = async () => {
    if (!selectedStoreId) return

    setLoading(true)
    const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const { data, error } = await calculateOpenDays(selectedStoreId, yearMonth)
    setLoading(false)

    if (error) {
      showNotification('error', '営業日数の計算に失敗しました')
    } else if (data !== null) {
      setCalculatedOpenDays(data)
      setFormData(prev => ({ ...prev, open_days: data }))
      showNotification('success', `休日設定から営業日数を計算しました: ${data}日`)
    }
  }

  const handleCopyFromPreviousMonth = async () => {
    if (!selectedStoreId) return

    let prevYear = selectedYear
    let prevMonth = selectedMonth - 1
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }

    setLoading(true)
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
    const { data } = await getExpenseBaseline(selectedStoreId, prevMonthStr)

    const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const { data: calculatedDays } = await calculateOpenDays(selectedStoreId, currentMonthStr)
    setLoading(false)

    if (data) {
      if (calculatedDays !== null) {
        setCalculatedOpenDays(calculatedDays)
      }
      setFormData({
        open_days: calculatedDays !== null ? calculatedDays : data.open_days,
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
      showNotification('success', `${prevYear}年${prevMonth}月のデータをコピーしました${calculatedDays !== null ? `（稼働日数は${calculatedDays}日に自動調整）` : ''}`)
    } else {
      showNotification('error', `前月（${prevYear}年${prevMonth}月）のデータが見つかりません`)
    }
  }

  const totalLaborCost = formData.labor_cost_employee + formData.labor_cost_part_time
  const totalOtherExpenses =
    formData.utilities +
    formData.rent +
    formData.consumables +
    formData.promotion +
    formData.cleaning +
    formData.misc +
    formData.communication +
    formData.others

  const totalMonthly = totalLaborCost + totalOtherExpenses
  const dailyLaborCost = Math.round(totalLaborCost / Math.max(formData.open_days, 1))
  const dailyOtherExpenses = Math.round(totalOtherExpenses / Math.max(formData.open_days, 1))
  const dailyTotal = dailyLaborCost + dailyOtherExpenses

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-3xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col my-2 sm:my-8">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              参考経費（月次平均）設定
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            日報入力時の参考KPI計算に使用する月次平均経費を設定します。食材費は日報で入力するため、ここでは設定不要です。
          </p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6 overflow-y-auto flex-1">
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              設定状況（{selectedYear}年{selectedMonth}月）
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {stores.map(store => (
                <div
                  key={store.id}
                  className={`flex items-center gap-2 text-sm p-2 rounded ${
                    storeConfigStatus[store.id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {storeConfigStatus[store.id] ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{store.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">対象店舗</label>
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} {storeConfigStatus[store.id] ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">対象年</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
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
                className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                {months.map(month => (
                  <option key={month} value={month}>
                    {month}月
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Copy className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-medium text-purple-900 text-sm">前月データコピー</h4>
                  <p className="text-xs text-purple-600 mt-0.5 hidden sm:block">
                    前月の経費データをコピーして時間を節約
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFromPreviousMonth}
                disabled={loading}
                className="bg-white hover:bg-purple-50 border-purple-300 text-purple-700 hover:text-purple-800 flex-shrink-0 text-xs sm:text-sm"
              >
                <Copy className={`w-3.5 h-3.5 mr-1 sm:mr-1.5 ${loading ? 'animate-pulse' : ''}`} />
                <span className="hidden xs:inline">前月から</span>コピー
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">稼働日数</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateOpenDays}
                disabled={loading}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600 hover:border-blue-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                休日設定から計算
              </Button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={formData.open_days}
                onChange={e => handleInputChange('open_days', e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right min-h-[44px] font-medium text-lg"
                min="1"
                max="31"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">日</span>
            </div>
            {calculatedOpenDays !== null && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <p className="text-blue-700">
                  <span className="font-medium">休日設定から計算:</span> {calculatedOpenDays}日
                  {formData.open_days !== calculatedOpenDays && (
                    <span className="text-amber-600 ml-1">（入力値と異なります）</span>
                  )}
                </p>
                {formData.open_days !== calculatedOpenDays && (
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, open_days: calculatedOpenDays }))}
                    className="text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    計算値を適用
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-blue-600 mt-2 leading-relaxed">
              定休日と特定日の休日を考慮して自動計算します。休日設定ページで定休日や臨時休業日を登録すると、正確な稼働日数が計算されます。
            </p>
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
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
                    className="w-full px-3 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right min-h-[44px]"
                    placeholder="0"
                    step="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">円</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">人件費（月額）</span>
                <span className="font-medium">{formatCurrency(totalLaborCost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">その他経費（月額）</span>
                <span className="font-medium">{formatCurrency(totalOtherExpenses)}</span>
              </div>
              <div className="flex justify-between items-center font-medium border-t pt-2">
                <span>月額合計</span>
                <span className="text-lg">{formatCurrency(totalMonthly)}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600">参考人件費（1日あたり）</span>
                <span className="font-medium text-blue-600">{formatCurrency(dailyLaborCost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600">参考その他経費（1日あたり）</span>
                <span className="font-medium text-blue-600">{formatCurrency(dailyOtherExpenses)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-blue-700 border-t border-blue-200 pt-2">
                <span>参考経費合計（1日あたり）</span>
                <span className="text-lg">{formatCurrency(dailyTotal)}</span>
              </div>
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
