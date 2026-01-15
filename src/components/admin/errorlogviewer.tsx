/**
 * エラーログビューアーコンポーネント
 *
 * 管理者がエラーログを確認・管理するための画面
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/contexts/organizationcontext'
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Filter,
  Download,
  Trash2
} from 'lucide-react'

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  user_id?: string
  stack_trace?: string
  context?: any
  user_agent?: string
  url?: string
  ip_address?: string
  resolved: boolean
  resolved_at?: string
  resolved_by?: string
  notes?: string
  created_at: string
  user_email?: string
}

interface ErrorStats {
  total: number
  unresolved: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
}

export const ErrorLogViewer: React.FC = () => {
  const { organization } = useOrganization()
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterResolved, setFilterResolved] = useState<string>('unresolved')

  useEffect(() => {
    if (organization?.id) {
      loadErrorLogs()
      loadStats()
    }
  }, [organization?.id, filterSeverity, filterResolved])

  const loadErrorLogs = async () => {
    if (!organization?.id) return

    setLoading(true)
    try {
      let query = supabase
        .from('error_logs')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(100)

      // フィルター適用
      if (filterSeverity !== 'all') {
        query = query.eq('severity', filterSeverity)
      }

      if (filterResolved === 'resolved') {
        query = query.eq('resolved', true)
      } else if (filterResolved === 'unresolved') {
        query = query.eq('resolved', false)
      }

      const { data, error } = await query

      if (error) throw error

      const logsWithEmail = data?.map(log => ({
        ...log,
        user_email: log.profiles?.email
      })) || []

      setErrorLogs(logsWithEmail)
    } catch (error) {
      console.error('Failed to load error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!organization?.id) return

    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('severity, error_type, resolved')
        .eq('organization_id', organization.id)

      if (error) throw error

      const total = data?.length || 0
      const unresolved = data?.filter(log => !log.resolved).length || 0

      const by_severity: Record<string, number> = {}
      const by_type: Record<string, number> = {}

      data?.forEach(log => {
        by_severity[log.severity] = (by_severity[log.severity] || 0) + 1
        by_type[log.error_type] = (by_type[log.error_type] || 0) + 1
      })

      setStats({ total, unresolved, by_severity, by_type })
    } catch (error) {
      console.error('Failed to load error stats:', error)
    }
  }

  const markAsResolved = async (errorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', errorId)

      if (error) throw error

      loadErrorLogs()
      loadStats()
      setSelectedError(null)
    } catch (error) {
      console.error('Failed to mark error as resolved:', error)
    }
  }

  const deleteError = async (errorId: string) => {
    if (!confirm('このエラーログを削除しますか？')) return

    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .eq('id', errorId)

      if (error) throw error

      loadErrorLogs()
      loadStats()
      setSelectedError(null)
    } catch (error) {
      console.error('Failed to delete error:', error)
    }
  }

  const exportErrorLogs = async () => {
    const csvContent = [
      ['日時', 'エラータイプ', '深刻度', 'メッセージ', 'ユーザー', 'URL', '解決済み'].join(','),
      ...errorLogs.map(log => [
        new Date(log.created_at).toLocaleString('ja-JP'),
        log.error_type,
        log.severity,
        `"${log.error_message.replace(/"/g, '""')}"`,
        log.user_email || '-',
        log.url || '-',
        log.resolved ? '済' : '未'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `error_logs_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'MEDIUM':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'LOW':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'MEDIUM':
        return 'bg-orange-50 border-orange-200 text-orange-900'
      case 'LOW':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900'
    }
  }

  if (loading && !errorLogs.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">エラーログを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">総エラー数</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">未解決</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.unresolved}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">深刻度: HIGH/CRITICAL</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {(stats.by_severity['HIGH'] || 0) + (stats.by_severity['CRITICAL'] || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">解決済み</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.total - stats.unresolved}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* フィルターとアクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              エラーログ
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={loadErrorLogs}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                更新
              </Button>
              <Button
                onClick={exportErrorLogs}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* フィルター */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600">フィルター:</span>
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">すべての深刻度</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select
              value={filterResolved}
              onChange={(e) => setFilterResolved(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">すべて</option>
              <option value="unresolved">未解決のみ</option>
              <option value="resolved">解決済みのみ</option>
            </select>
          </div>

          {/* エラーログリスト */}
          <div className="space-y-2">
            {errorLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>エラーログがありません</p>
              </div>
            ) : (
              errorLogs.map(log => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedError?.id === log.id ? 'ring-2 ring-blue-500' : ''
                  } ${getSeverityColor(log.severity)}`}
                  onClick={() => setSelectedError(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(log.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {log.error_type}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-white/50 rounded">
                            {log.severity}
                          </span>
                          {log.resolved && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                              解決済み
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-1">{log.error_message}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>
                            {new Date(log.created_at).toLocaleString('ja-JP')}
                          </span>
                          {log.user_email && (
                            <span>ユーザー: {log.user_email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* エラー詳細モーダル */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedError.severity)}
                  エラー詳細
                </CardTitle>
                <button
                  onClick={() => setSelectedError(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">エラータイプ</h3>
                <p className="text-sm text-slate-900">{selectedError.error_type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">深刻度</h3>
                <p className="text-sm text-slate-900">{selectedError.severity}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">エラーメッセージ</h3>
                <p className="text-sm text-slate-900">{selectedError.error_message}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-1">発生日時</h3>
                <p className="text-sm text-slate-900">
                  {new Date(selectedError.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
              {selectedError.user_email && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">ユーザー</h3>
                  <p className="text-sm text-slate-900">{selectedError.user_email}</p>
                </div>
              )}
              {selectedError.url && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">URL</h3>
                  <p className="text-sm text-slate-900 break-all">{selectedError.url}</p>
                </div>
              )}
              {selectedError.stack_trace && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">スタックトレース</h3>
                  <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}
              {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">コンテキスト</h3>
                  <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {!selectedError.resolved && (
                  <Button
                    onClick={() => markAsResolved(selectedError.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    解決済みにする
                  </Button>
                )}
                <Button
                  onClick={() => deleteError(selectedError.id)}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </Button>
                <Button
                  onClick={() => setSelectedError(null)}
                  variant="outline"
                >
                  閉じる
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
