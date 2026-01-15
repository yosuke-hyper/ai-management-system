import React, { useState, lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Database, Calendar, Store, Target, DollarSign, Package, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { dataExportService } from '@/services/dataexport'
import { useOrganization } from '@/contexts/organizationcontext'
import { useAdminData } from '@/contexts/admindatacontext'
import { useError } from '@/contexts/errorcontext'
import { format, subMonths } from 'date-fns'

const MonthlySalesExport = lazy(() => import('@/components/export/monthlysalesexport').then(m => ({ default: m.MonthlySalesExport })))

export const DataExport: React.FC = () => {
  const { organization } = useOrganization()
  const { stores } = useAdminData()
  const { addError } = useError()
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showMonthlySalesExport, setShowMonthlySalesExport] = useState(false)

  const [exportOptions, setExportOptions] = useState({
    format: 'csv' as 'csv' | 'json',
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedStores: [] as string[]
  })

  const handleExport = async (type: string) => {
    if (!organization?.id) {
      addError(new Error('組織情報が見つかりません'))
      return
    }

    setLoading(type)
    setMessage(null)

    try {
      const options = {
        format: exportOptions.format,
        startDate: exportOptions.startDate,
        endDate: exportOptions.endDate,
        storeIds: exportOptions.selectedStores.length > 0 ? exportOptions.selectedStores : undefined
      }

      let result
      switch (type) {
        case 'daily-reports':
          result = await dataExportService.exportDailyReports(organization.id, options)
          break
        case 'monthly-expenses':
          result = await dataExportService.exportMonthlyExpenses(organization.id, options)
          break
        case 'targets':
          result = await dataExportService.exportTargets(organization.id, options)
          break
        case 'stores':
          result = await dataExportService.exportStores(organization.id)
          break
        case 'all':
          result = await dataExportService.exportAllData(organization.id)
          break
      }

      if (result?.success) {
        const recordInfo = result.recordCount ? ` (${result.recordCount.toLocaleString()}件)` : ''
        setMessage({
          type: 'success',
          text: `データのエクスポートが完了しました${recordInfo}`
        })
      } else {
        addError(new Error(result?.error || 'エクスポートに失敗しました'))
      }
    } catch (err: any) {
      console.error('Export error:', err)
      addError(err)
    } finally {
      setLoading(null)
    }
  }

  const toggleStore = (storeId: string) => {
    setExportOptions(prev => ({
      ...prev,
      selectedStores: prev.selectedStores.includes(storeId)
        ? prev.selectedStores.filter(id => id !== storeId)
        : [...prev.selectedStores, storeId]
    }))
  }

  const exportItems = [
    {
      id: 'daily-reports',
      title: '日報データ',
      description: '日次の売上・経費データ',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'monthly-expenses',
      title: '月次経費データ',
      description: '固定費・月次経費データ',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'targets',
      title: '目標データ',
      description: '売上・利益目標データ',
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'stores',
      title: '店舗マスタ',
      description: '店舗情報・設定データ',
      icon: Store,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            エクスポート設定
          </CardTitle>
          <CardDescription>
            データの期間とフォーマットを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={exportOptions.startDate}
                onChange={(e) => setExportOptions(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={exportOptions.endDate}
                onChange={(e) => setExportOptions(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              エクスポート形式
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition ${
                  exportOptions.format === 'csv'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">CSV</div>
                <div className="text-xs text-gray-500">Excel対応</div>
              </button>
              <button
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition ${
                  exportOptions.format === 'json'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">JSON</div>
                <div className="text-xs text-gray-500">開発者向け</div>
              </button>
            </div>
          </div>

          {stores.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗フィルター（オプション）
              </label>
              <div className="flex flex-wrap gap-2">
                {stores.map(store => (
                  <Badge
                    key={store.id}
                    variant={exportOptions.selectedStores.includes(store.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleStore(store.id)}
                  >
                    {store.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                選択なしの場合、全店舗のデータがエクスポートされます
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">月次売上一覧</h3>
                <p className="text-sm text-gray-600 mb-3">日別の売上・決済方法・消費税内訳</p>
                <Button
                  onClick={() => setShowMonthlySalesExport(true)}
                  disabled={loading !== null}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  設定してエクスポート
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {exportItems.map(item => (
          <Card key={item.id} className="hover:shadow-lg transition">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  <Button
                    onClick={() => handleExport(item.id)}
                    disabled={loading !== null}
                    size="sm"
                    className="w-full"
                  >
                    {loading === item.id ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                        エクスポート中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        エクスポート
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 text-lg">完全バックアップ</h3>
              <p className="text-sm text-gray-600 mb-4">
                すべてのデータを一括でエクスポートします。
                日報、月次経費、目標、店舗、仕入先などすべてのデータが含まれます。
              </p>
              <Button
                onClick={() => handleExport('all')}
                disabled={loading !== null}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading === 'all' ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    完全バックアップをエクスポート
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Sales Export Modal */}
      {showMonthlySalesExport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">月次売上一覧エクスポート</h2>
              <button
                onClick={() => setShowMonthlySalesExport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <Suspense fallback={<div className="flex items-center justify-center p-8">読み込み中...</div>}>
                <MonthlySalesExport />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
