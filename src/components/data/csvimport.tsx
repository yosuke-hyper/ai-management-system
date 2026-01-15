/**
 * CSV Import Component
 * POSレジからのCSVデータをインポートするUI
 */

import React, { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, History, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  importDailyReportCSV,
  importMonthlyExpenseCSV,
  downloadCSVTemplate,
  saveImportHistory,
  getImportHistory,
  deleteReportsByDateRange,
  type CSVImportResult,
  type ImportHistoryRecord
} from '@/services/csvimport'
import { useOrganization } from '@/contexts/organizationcontext'
import { useAdminData } from '@/contexts/admindatacontext'
import { useAuth } from '@/contexts/authcontext'

type ImportType = 'daily_report' | 'monthly_expense'

export const CSVImport: React.FC = () => {
  const { organization } = useOrganization()
  const { stores } = useAdminData()
  const { user } = useAuth()
  const [importType, setImportType] = useState<ImportType>('daily_report')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStoreId, setDeleteStoreId] = useState('')
  const [deleteStartDate, setDeleteStartDate] = useState('')
  const [deleteEndDate, setDeleteEndDate] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ deleted: number; error?: string } | null>(null)

  useEffect(() => {
    if (organization?.id) {
      loadImportHistory()
    }
  }, [organization?.id])

  const loadImportHistory = async () => {
    if (!organization?.id) return
    const history = await getImportHistory(organization.id)
    setImportHistory(history)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      alert('CSVファイルを選択してください')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      alert('CSVファイルをドロップしてください')
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !organization || !user) {
      alert('ファイルと組織を選択してください')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      let result: CSVImportResult

      if (importType === 'daily_report') {
        result = await importDailyReportCSV(
          selectedFile,
          organization.id,
          selectedStoreId || undefined
        )
      } else {
        result = await importMonthlyExpenseCSV(
          selectedFile,
          organization.id,
          selectedStoreId || undefined
        )
      }

      setImportResult(result)

      await saveImportHistory(
        organization.id,
        user.id,
        importType,
        selectedFile.name,
        selectedFile.size,
        result,
        selectedStoreId || undefined
      )

      await loadImportHistory()

      if (result.success && result.failed === 0) {
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      }
    } catch (err: any) {
      alert(err.message || 'インポートに失敗しました')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteReports = async () => {
    if (!organization || !deleteStoreId || !deleteStartDate || !deleteEndDate) {
      alert('店舗と日付範囲を選択してください')
      return
    }

    if (!confirm(`${deleteStartDate} から ${deleteEndDate} までのレポートを削除します。この操作は取り消せません。続行しますか？`)) {
      return
    }

    setIsDeleting(true)
    setDeleteResult(null)

    try {
      const result = await deleteReportsByDateRange(
        organization.id,
        deleteStoreId,
        deleteStartDate,
        deleteEndDate
      )
      setDeleteResult(result)

      if (!result.error && result.deleted > 0) {
        setTimeout(() => {
          setShowDeleteModal(false)
          window.location.reload()
        }, 2000)
      }
    } catch (err: any) {
      setDeleteResult({ deleted: 0, error: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(importType)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">CSVインポート</h2>
        <p className="text-slate-600">
          POSレジや他システムからエクスポートしたCSVファイルをインポートできます
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            テンプレートダウンロード
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            インポート用のCSVテンプレートをダウンロードできます。
            このテンプレートに沿ってデータを入力してください。
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setImportType('daily_report')
                downloadCSVTemplate('daily_report')
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              日次レポート テンプレート
            </Button>

            <Button
              onClick={() => {
                setImportType('monthly_expense')
                downloadCSVTemplate('monthly_expense')
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              月次経費 テンプレート
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>ヒント:</strong> 既存のPOSレジデータをお持ちの場合、
              テンプレートの形式に合わせて変換してください。
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            対応POSレジ
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            以下のPOSレジからエクスポートしたCSVに対応しています
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Airレジ:</strong> 売上日報、取引履歴</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>スマレジ:</strong> 日別売上、商品別売上</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>ユビレジ:</strong> 日次レポート、売上分析</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Square:</strong> 売上レポート、取引履歴</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>その他:</strong> 汎用CSVフォーマット</span>
            </li>
          </ul>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-800">
              POSレジの形式が異なる場合は、テンプレートに合わせて
              データを整形してください。
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">インポート設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              インポート種別
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as ImportType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily_report">日次レポート</option>
              <option value="monthly_expense">月次経費</option>
            </select>
          </div>

          {stores && stores.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                デフォルト店舗（CSVに店舗IDがない場合）
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                CSV内に店舗IDが含まれていない場合、ここで選択した店舗に紐付けられます
              </p>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="outline"
                  size="sm"
                >
                  ファイルを削除
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600">
                  CSVファイルをドラッグ&ドロップ
                </p>
                <p className="text-xs text-slate-500">または</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">ファイルを選択</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="w-full"
          >
            {isImporting ? 'インポート中...' : 'インポート実行'}
          </Button>
        </div>
      </Card>

      {importResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {importResult.success && importResult.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : importResult.success && importResult.failed > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            インポート結果
          </h3>

          {importResult.imported > 0 && importResult.failed > 0 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">部分的に取り込みが完了しました</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {importResult.imported}件が成功しましたが、{importResult.failed}件が失敗しました。
                    下記のエラー詳細を確認し、失敗したデータは修正後に再度インポートしてください。
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    <strong>重要:</strong> 誤ったデータがインポートされた場合は、下部の「データ復旧」機能で削除できます。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
              <p className="text-sm text-green-600">成功</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
              <p className="text-sm text-red-600">失敗</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{importResult.skipped}</p>
              <p className="text-sm text-slate-600">スキップ</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {importResult.imported + importResult.failed + importResult.skipped}
              </p>
              <p className="text-sm text-blue-600">合計</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2 text-red-700">エラー詳細:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {importResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    行 {error.row}: {error.message}
                  </div>
                ))}
                {importResult.errors.length > 10 && (
                  <p className="text-xs text-slate-500 italic">
                    ...他 {importResult.errors.length - 10} 件のエラー
                  </p>
                )}
              </div>
            </div>
          )}

          {importResult.success && importResult.failed === 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                インポートが完了しました。3秒後にページを更新します...
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          インポート履歴 {importHistory.length > 0 && `(${importHistory.length})`}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          データ復旧（一括削除）
        </Button>
      </div>

      {showHistory && importHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            インポート履歴
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">日時</th>
                  <th className="text-left py-2 px-3">ファイル名</th>
                  <th className="text-left py-2 px-3">種別</th>
                  <th className="text-left py-2 px-3">店舗</th>
                  <th className="text-center py-2 px-3">成功</th>
                  <th className="text-center py-2 px-3">失敗</th>
                  <th className="text-center py-2 px-3">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(record.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={record.file_name}>
                      {record.file_name}
                    </td>
                    <td className="py-2 px-3">
                      {record.import_type === 'daily_report' ? '日次レポート' : '月次経費'}
                    </td>
                    <td className="py-2 px-3">
                      {record.store_name || '-'}
                    </td>
                    <td className="py-2 px-3 text-center text-green-600">
                      {record.imported_count}
                    </td>
                    <td className="py-2 px-3 text-center text-red-600">
                      {record.failed_count}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === 'success' ? 'bg-green-100 text-green-800' :
                        record.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status === 'success' ? '成功' :
                         record.status === 'partial' ? '部分成功' : '失敗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              日次レポート一括削除
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              誤ってインポートしたデータを削除できます。指定した店舗・日付範囲のレポートがすべて削除されます。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">店舗</label>
                <select
                  value={deleteStoreId}
                  onChange={(e) => setDeleteStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">選択してください</option>
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {deleteResult && (
                <div className={`p-3 rounded-lg ${deleteResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  {deleteResult.error ? (
                    <p className="text-sm text-red-800">エラー: {deleteResult.error}</p>
                  ) : (
                    <p className="text-sm text-green-800">{deleteResult.deleted}件のレポートを削除しました</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteResult(null)
                  }}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleDeleteReports}
                  disabled={isDeleting || !deleteStoreId || !deleteStartDate || !deleteEndDate}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? '削除中...' : '削除実行'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6 bg-slate-50">
        <h3 className="text-lg font-semibold mb-4">使い方ガイド</h3>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>
              <strong>テンプレートをダウンロード:</strong>
              上のボタンからCSVテンプレートをダウンロードします
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>
              <strong>データを入力:</strong>
              テンプレートにデータを入力、またはPOSレジからエクスポートしたデータを整形します
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>
              <strong>インポート種別を選択:</strong>
              日次レポートか月次経費を選択します
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <span>
              <strong>店舗を選択（任意）:</strong>
              CSVに店舗IDがない場合は、デフォルト店舗を選択します
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              5
            </span>
            <span>
              <strong>ファイルをアップロード:</strong>
              CSVファイルをドラッグ&ドロップ、または選択します
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              6
            </span>
            <span>
              <strong>インポート実行:</strong>
              ボタンをクリックしてインポートを開始します
            </span>
          </li>
        </ol>
      </Card>
    </div>
  )
}
