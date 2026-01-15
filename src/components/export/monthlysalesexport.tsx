import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileSpreadsheet, FileText, Calendar, Store, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { monthlySalesExportService } from '@/services/monthlysalesexport'
import { useOrganization } from '@/contexts/organizationcontext'
import { useAdminData } from '@/contexts/admindatacontext'
import { useError } from '@/contexts/errorcontext'

interface MonthlySalesExportProps {
  defaultMonth?: string
  defaultStoreId?: string
}

export const MonthlySalesExport: React.FC<MonthlySalesExportProps> = ({
  defaultMonth,
  defaultStoreId
}) => {
  const { organization } = useOrganization()
  const { stores } = useAdminData()
  const { showError } = useError()

  const currentMonth = useMemo(() => {
    if (defaultMonth) return defaultMonth
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [defaultMonth])

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    defaultStoreId && defaultStoreId !== 'all' ? [defaultStoreId] : []
  )
  const [format, setFormat] = useState<'csv' | 'excel'>('excel')
  const [exportMode, setExportMode] = useState<'combined' | 'individual'>('combined')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const handleExport = async () => {
    if (!organization?.id) {
      showError('組織情報が見つかりません')
      return
    }

    // Validate month is not in the future
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (selectedMonth > currentYearMonth) {
      showError('未来の月は選択できません')
      return
    }

    // Validate individual mode with CSV
    if (exportMode === 'individual' && format === 'csv') {
      showError('個別出力モードはExcel形式のみ対応しています')
      return
    }

    // Validate individual mode requires at least 1 store
    if (exportMode === 'individual' && stores.length === 0) {
      showError('エクスポートする店舗が登録されていません')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Individual export mode: Export each store as a separate sheet
      if (exportMode === 'individual') {
        // Filter stores based on selection
        const storesToExport = selectedStoreIds.length > 0
          ? stores.filter(s => selectedStoreIds.includes(s.id))
          : stores

        if (storesToExport.length === 0) {
          showError('エクスポートする店舗を選択してください')
          return
        }

        const result = await monthlySalesExportService.exportMonthlySalesByStore(
          organization.id,
          {
            month: selectedMonth,
            format: 'excel',
            stores: storesToExport
          }
        )

        if (result.success) {
          setMessage({
            type: 'success',
            text: `${selectedMonth}の月次売上一覧を個別シート（${storesToExport.length}店舗）でエクスポートしました`
          })
        } else {
          showError(result.error || 'エクスポートに失敗しました')
        }
      } else {
        // Combined export mode (existing logic)
        let storeName: string | undefined
        if (selectedStoreIds.length === 1) {
          const store = stores.find(s => s.id === selectedStoreIds[0])
          storeName = store?.name
        } else if (selectedStoreIds.length === 0) {
          storeName = '全店舗'
        } else {
          storeName = '複数店舗'
        }

        const result = await monthlySalesExportService.exportMonthlySalesSummary(
          organization.id,
          {
            month: selectedMonth,
            storeIds: selectedStoreIds.length > 0 ? selectedStoreIds : undefined,
            format,
            storeName
          }
        )

        if (result.success) {
          const recordInfo = result.recordCount ? ` (${result.recordCount}日分)` : ''
          setMessage({
            type: 'success',
            text: `${selectedMonth}の月次売上一覧を${format === 'excel' ? 'Excel' : 'CSV'}形式でエクスポートしました${recordInfo}`
          })
        } else {
          showError(result.error || 'エクスポートに失敗しました')
        }
      }
    } catch (err: any) {
      console.error('Export error:', err)
      showError(err.message || 'エクスポート中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    )
  }

  const selectAllStores = () => {
    if (selectedStoreIds.length === stores.length) {
      setSelectedStoreIds([])
    } else {
      setSelectedStoreIds(stores.map(s => s.id))
    }
  }

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const value = `${year}-${month}`
      const label = `${year}年${month}月`
      options.push({ value, label })
    }

    return options
  }, [])

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Info className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            月次売上一覧エクスポート
          </CardTitle>
          <CardDescription>
            選択した月の1日から月末までの売上データを日別に出力します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象月
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              エクスポート形式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('excel')}
                className={`px-4 py-3 border-2 rounded-lg transition ${
                  format === 'excel'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Excel</div>
                <div className="text-xs text-gray-500">.xlsx形式</div>
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`px-4 py-3 border-2 rounded-lg transition ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">CSV</div>
                <div className="text-xs text-gray-500">Excel互換</div>
              </button>
            </div>
          </div>

          {stores.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出力モード
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportMode('combined')}
                  className={`px-4 py-3 border-2 rounded-lg transition ${
                    exportMode === 'combined'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">合算出力</div>
                  <div className="text-xs text-gray-500">選択店舗を1シートに</div>
                </button>
                <button
                  onClick={() => {
                    setExportMode('individual')
                    if (format === 'csv') {
                      setFormat('excel')
                    }
                  }}
                  className={`px-4 py-3 border-2 rounded-lg transition ${
                    exportMode === 'individual'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">個別出力</div>
                  <div className="text-xs text-gray-500">各店舗別シート</div>
                </button>
              </div>
              {exportMode === 'individual' && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {selectedStoreIds.length > 0
                    ? `選択した${selectedStoreIds.length}店舗を個別のシートで出力します（Excel形式のみ）`
                    : `全店舗（${stores.length}店舗）を個別のシートで出力します（Excel形式のみ）`}
                </p>
              )}
            </div>
          )}

          {stores.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  店舗選択（オプション）
                </label>
                <button
                  onClick={selectAllStores}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedStoreIds.length === stores.length ? '選択解除' : 'すべて選択'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {stores.map(store => (
                  <Badge
                    key={store.id}
                    variant={selectedStoreIds.includes(store.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleStore(store.id)}
                  >
                    <Store className="w-3 h-3 mr-1" />
                    {store.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {exportMode === 'combined' ? (
                  selectedStoreIds.length === 0
                    ? '選択なしの場合、全店舗のデータを合算してエクスポートします'
                    : `${selectedStoreIds.length}店舗を選択中`
                ) : (
                  selectedStoreIds.length === 0
                    ? '選択なしの場合、全店舗を個別シートでエクスポートします'
                    : `${selectedStoreIds.length}店舗を選択中（各店舗が個別シートになります）`
                )}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              エクスポート内容
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 日付（月の全日付を含む）</li>
              <li>• 総売上（税込）</li>
              <li>• 現金売上・クレジット売上（税抜）</li>
              <li>• 消費税内訳（現金・クレジット別、8%・10%別）</li>
              <li>• 釣銭準備金、現金出金、実現金、銀行入金額</li>
              <li>• 月計（合計行）</li>
              {exportMode === 'individual' && (
                <li className="font-medium text-blue-900 mt-2">• 各店舗が個別のシートになります</li>
              )}
            </ul>
          </div>

          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                エクスポート中...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                月次売上一覧をエクスポート
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
