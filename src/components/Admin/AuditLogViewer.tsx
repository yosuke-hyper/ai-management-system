import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUserOrganizationId } from '@/services/organizationService'
import {
  getAuditLogs,
  getAuditLogStats,
  getActionLabel,
  getResourceTypeLabel,
  AuditLogEntry,
  AuditLogFilters,
  AuditAction,
  ResourceType
} from '@/services/auditLog'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const AuditLogViewer: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0
  })
  const [stats, setStats] = useState({
    totalLogs: 0,
    successCount: 0,
    failureCount: 0
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('')
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<'success' | 'failure' | ''>('')

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [user, filters])

  const loadLogs = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const organizationId = await getCurrentUserOrganizationId(user.id)
      if (!organizationId) {
        setError('組織が見つかりません')
        return
      }

      const { data, error: fetchError } = await getAuditLogs(organizationId, filters)

      if (fetchError) {
        setError('監査ログの取得に失敗しました')
        return
      }

      setLogs(data || [])
    } catch (err) {
      setError('監査ログの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!user?.id) return

    const organizationId = await getCurrentUserOrganizationId(user.id)
    if (!organizationId) return

    const statsData = await getAuditLogStats(organizationId)
    setStats(statsData)
  }

  const applyFilters = () => {
    setFilters({
      ...filters,
      action: selectedAction || undefined,
      resourceType: selectedResourceType || undefined,
      status: selectedStatus || undefined,
      offset: 0
    })
  }

  const clearFilters = () => {
    setSelectedAction('')
    setSelectedResourceType('')
    setSelectedStatus('')
    setSearchTerm('')
    setFilters({
      limit: 50,
      offset: 0
    })
  }

  const exportLogs = () => {
    const csv = [
      ['日時', 'ユーザーID', 'アクション', 'リソース', 'ステータス', '詳細'].join(','),
      ...logs.map((log) =>
        [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.user_id || 'システム',
          getActionLabel(log.action),
          `${getResourceTypeLabel(log.resource_type)} (${log.resource_id || 'N/A'})`,
          log.status === 'success' ? '成功' : '失敗',
          JSON.stringify(log.details)
        ].join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const filteredLogs = logs.filter((log) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        log.action.toLowerCase().includes(term) ||
        log.resource_type.toLowerCase().includes(term) ||
        log.resource_id?.toLowerCase().includes(term) ||
        log.user_id?.toLowerCase().includes(term)
      )
    }
    return true
  })

  const actions: AuditAction[] = [
    'user.created',
    'user.updated',
    'user.deleted',
    'user.invited',
    'user.role_changed',
    'store.created',
    'store.updated',
    'store.deleted',
    'report.created',
    'report.updated',
    'report.deleted',
    'organization.updated'
  ]

  const resourceTypes: ResourceType[] = ['user', 'store', 'report', 'organization', 'auth']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">総ログ数</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">成功</p>
                <p className="text-2xl font-bold text-green-600">{stats.successCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">失敗</p>
                <p className="text-2xl font-bold text-red-600">{stats.failureCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              監査ログ
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={loadLogs}
                disabled={loading}
                className="bg-slate-600 hover:bg-slate-700 text-white"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                更新
              </Button>
              <Button
                onClick={exportLogs}
                disabled={logs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-700">フィルター</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    検索
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="検索..."
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    アクション
                  </label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value as AuditAction | '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">すべて</option>
                    {actions.map((action) => (
                      <option key={action} value={action}>
                        {getActionLabel(action)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    リソース
                  </label>
                  <select
                    value={selectedResourceType}
                    onChange={(e) =>
                      setSelectedResourceType(e.target.value as ResourceType | '')
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">すべて</option>
                    {resourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {getResourceTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as 'success' | 'failure' | '')
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">すべて</option>
                    <option value="success">成功</option>
                    <option value="failure">失敗</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={applyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  フィルター適用
                </Button>
                <Button
                  onClick={clearFilters}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700"
                  size="sm"
                >
                  クリア
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-slate-600 mt-2">読み込み中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600">監査ログがありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() =>
                        setExpandedLog(expandedLog === log.id ? null : log.id)
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">
                              {getActionLabel(log.action)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                log.status === 'success'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {log.status === 'success' ? '成功' : '失敗'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <span>
                              {getResourceTypeLabel(log.resource_type)}
                              {log.resource_id && ` (ID: ${log.resource_id})`}
                            </span>
                            <span className="mx-2">•</span>
                            <span>
                              {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', {
                                locale: ja
                              })}
                            </span>
                          </div>
                        </div>
                        {expandedLog === log.id ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {expandedLog === log.id && (
                      <div className="border-t border-slate-200 p-4 bg-slate-50">
                        <div className="space-y-2 text-sm">
                          {log.user_id && (
                            <div>
                              <span className="font-medium text-slate-700">ユーザーID:</span>
                              <span className="ml-2 text-slate-600">{log.user_id}</span>
                            </div>
                          )}
                          {log.error_message && (
                            <div>
                              <span className="font-medium text-red-700">エラー:</span>
                              <span className="ml-2 text-red-600">{log.error_message}</span>
                            </div>
                          )}
                          {Object.keys(log.details).length > 0 && (
                            <div>
                              <span className="font-medium text-slate-700">詳細:</span>
                              <pre className="mt-1 p-2 bg-white border border-slate-200 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
