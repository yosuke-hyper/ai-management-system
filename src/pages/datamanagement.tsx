import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Upload, Download, FileText, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { CSVImport } from '@/components/data/csvimport'
import { DataExport } from '@/components/data/dataexport'
import { useAuth } from '@/contexts/authcontext'
import toast from 'react-hot-toast'

export const DataManagement: React.FC = () => {
  const { user, isDemoMode } = useAuth()
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'cleanup'>(
    isDemoMode ? 'cleanup' : 'import'
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            データ管理
          </h1>
          <p className="mt-2 text-slate-600">
            データのインポート・エクスポート、一括管理を行えます
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'import' | 'export' | 'cleanup')}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: isDemoMode ? '1fr' : '1fr 1fr 1fr' }}>
          {!isDemoMode && (
            <>
              <TabsTrigger value="import">
                <Upload className="w-4 h-4 mr-2" />
                CSVインポート
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="w-4 h-4 mr-2" />
                データエクスポート
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="cleanup">
            <Trash2 className="w-4 h-4 mr-2" />
            ローカルデータクリア
          </TabsTrigger>
        </TabsList>

        {!isDemoMode && (
          <>
            <TabsContent value="import">
              <CSVImport />
            </TabsContent>

            <TabsContent value="export">
              <DataExport />
            </TabsContent>
          </>
        )}

        <TabsContent value="cleanup">
          <LocalStorageCleanup user={user} isDemoMode={isDemoMode} />
        </TabsContent>
      </Tabs>

      {/* Help Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              使い方ガイド
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>CSVインポート:</strong> POSレジや他システムからエクスポートしたデータを一括登録できます
              </p>
              <p>
                <strong>データエクスポート:</strong> 登録済みのデータをCSVやExcel形式でダウンロードできます
              </p>
              <p className="mt-3">
                詳しい使い方は{' '}
                <a
                  href="/CSV_IMPORT_USER_MANUAL.md"
                  target="_blank"
                  className="underline font-semibold"
                >
                  ユーザーマニュアル
                </a>
                {' '}や{' '}
                <a
                  href="/POS_SETUP_GUIDES.md"
                  target="_blank"
                  className="underline font-semibold"
                >
                  POS設定ガイド
                </a>
                {' '}をご覧ください
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

const LocalStorageCleanup: React.FC<{ user: any; isDemoMode?: boolean }> = ({ user, isDemoMode }) => {
  const [info, setInfo] = useState<{
    reports: number
    autoSave: number
    lastReports: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const checkLocalStorage = () => {
    let reportsCount = 0
    let autoSaveCount = 0
    let lastReportsCount = 0

    if (isDemoMode) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('demoSession_') || key?.startsWith('demo_')) {
          autoSaveCount++
        }
      }
    } else if (user?.id) {
      const reportsKey = `userReports_${user.id}`
      const reportsData = localStorage.getItem(reportsKey)
      if (reportsData) {
        try {
          const parsed = JSON.parse(reportsData)
          reportsCount = Array.isArray(parsed) ? parsed.length : 0
        } catch (e) {
          console.error('Failed to parse reports data:', e)
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(`autoSave_${user.id}_`)) {
          autoSaveCount++
        } else if (key?.startsWith(`lastReport_${user.id}_`)) {
          lastReportsCount++
        }
      }
    }

    setInfo({
      reports: reportsCount,
      autoSave: autoSaveCount,
      lastReports: lastReportsCount,
      total: reportsCount + autoSaveCount + lastReportsCount
    })
  }

  React.useEffect(() => {
    checkLocalStorage()
  }, [user?.id])

  const clearAllLocalData = () => {
    const confirmed = window.confirm(
      'ローカルストレージに保存されているすべてのデータを削除します。\n' +
      'この操作は取り消せません。本当に削除しますか？'
    )

    if (!confirmed) return

    setLoading(true)

    try {
      const keysToRemove: string[] = []

      if (isDemoMode) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('demoSession_') || key?.startsWith('demo_')) {
            keysToRemove.push(key)
          }
        }
      } else if (user?.id) {
        const reportsKey = `userReports_${user.id}`
        localStorage.removeItem(reportsKey)

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(`autoSave_${user.id}_`) || key?.startsWith(`lastReport_${user.id}_`)) {
            keysToRemove.push(key)
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))

      toast.success(`${info?.total || 0}件のローカルデータを削除しました`)
      checkLocalStorage()
    } catch (error) {
      console.error('Failed to clear local storage:', error)
      toast.error('データの削除中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const clearReportsOnly = () => {
    if (!user?.id) {
      toast.error('ユーザー情報が取得できません')
      return
    }

    const confirmed = window.confirm(
      'ローカルに保存された日報データ（未送信分）を削除します。\n' +
      'この操作は取り消せません。本当に削除しますか？'
    )

    if (!confirmed) return

    setLoading(true)

    try {
      const reportsKey = `userReports_${user.id}`
      localStorage.removeItem(reportsKey)

      toast.success(`${info?.reports || 0}件の日報データを削除しました`)
      checkLocalStorage()
    } catch (error) {
      console.error('Failed to clear reports:', error)
      toast.error('データの削除中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const clearAutoSaveOnly = () => {
    if (!user?.id) {
      toast.error('ユーザー情報が取得できません')
      return
    }

    const confirmed = window.confirm(
      '自動保存された入力途中のデータを削除します。\n' +
      'この操作は取り消せません。本当に削除しますか？'
    )

    if (!confirmed) return

    setLoading(true)

    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(`autoSave_${user.id}_`) || key?.startsWith(`lastReport_${user.id}_`)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))

      toast.success(`${info?.autoSave || 0 + info?.lastReports || 0}件の自動保存データを削除しました`)
      checkLocalStorage()
    } catch (error) {
      console.error('Failed to clear auto-save:', error)
      toast.error('データの削除中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-lg mb-2">ローカルストレージクリーンアップ</h3>
            <p className="text-sm text-slate-600">
              ブラウザに保存されているローカルデータを削除します。
              通常、Supabaseへの保存が成功した場合は不要ですが、エラー時にローカルに退避されたデータが残っている場合があります。
            </p>
          </div>
        </div>

        {info && (
          <div className={`grid grid-cols-1 ${isDemoMode ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4 mb-6`}>
            {isDemoMode ? (
              <Card className="p-4 bg-blue-50">
                <div className="text-xs text-blue-600 mb-1">デモセッションデータ</div>
                <div className="text-2xl font-bold text-blue-900">{info.total}件</div>
              </Card>
            ) : (
              <>
                <Card className="p-4 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">未送信の日報</div>
                  <div className="text-2xl font-bold text-slate-900">{info.reports}件</div>
                </Card>
                <Card className="p-4 bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">自動保存データ</div>
                  <div className="text-2xl font-bold text-slate-900">{info.autoSave + info.lastReports}件</div>
                </Card>
                <Card className="p-4 bg-blue-50">
                  <div className="text-xs text-blue-600 mb-1">合計</div>
                  <div className="text-2xl font-bold text-blue-900">{info.total}件</div>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={clearAllLocalData}
            variant="outline"
            className="w-full justify-start border-red-200 hover:bg-red-50 hover:border-red-300"
            disabled={loading || !info || info.total === 0}
          >
            <Trash2 className="w-4 h-4 mr-2 text-red-600" />
            {isDemoMode ? 'デモセッションデータを削除' : 'すべてのローカルデータを削除'}
          </Button>

          {!isDemoMode && (
            <>
              <Button
                onClick={clearReportsOnly}
                variant="outline"
                className="w-full justify-start"
                disabled={loading || !info || info.reports === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                未送信の日報のみ削除 ({info?.reports || 0}件)
              </Button>

              <Button
                onClick={clearAutoSaveOnly}
                variant="outline"
                className="w-full justify-start"
                disabled={loading || !info || (info.autoSave + info.lastReports) === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                自動保存データのみ削除 ({info ? info.autoSave + info.lastReports : 0}件)
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">削除後の影響</h3>
            <ul className="text-sm text-green-800 space-y-1">
              {isDemoMode ? (
                <>
                  <li>• デモセッション用のローカルデータのみが削除されます</li>
                  <li>• ブラウザの動作が軽くなる場合があります</li>
                  <li>• 削除後も新しいデモセッションを開始できます</li>
                </>
              ) : (
                <>
                  <li>• Supabaseに保存済みのデータは削除されません（安全です）</li>
                  <li>• ローカルに退避された未送信データのみが削除されます</li>
                  <li>• 削除後も通常通り日報入力・閲覧が可能です</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
