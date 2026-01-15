/**
 * 管理者アクティビティログビューア
 *
 * スーパー管理者のすべてのアクションを表示・監視する
 * 監査ログビューアコンポーネント
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/authcontext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  User,
  FileText,
  Building2
} from 'lucide-react'
import type { AdminActivityLog } from '@/types'
import { format } from 'date-fns'

interface ExtendedActivityLog extends AdminActivityLog {
  admin_email?: string
  organization_name?: string
}

export const AdminActivityLogViewer: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ExtendedActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDays, setFilterDays] = useState(7)
  const [stats, setStats] = useState<{
    admin_user_id: string
    admin_email: string
    total_actions: number
    organizations_accessed: number
    last_activity: string
  }[]>([])

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchLogs()
      fetchStats()
    }
  }, [user, filterDays])

  const fetchLogs = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          profiles!admin_activity_logs_admin_user_id_fkey(email),
          organizations(name)
        `)
        .gte('created_at', new Date(Date.now() - filterDays * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const logsWithDetails = (data || []).map((log: any) => ({
        id: log.id,
        adminUserId: log.admin_user_id,
        action: log.action,
        targetTable: log.target_table,
        targetId: log.target_id,
        targetOrganizationId: log.target_organization_id,
        metadata: log.metadata,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at,
        admin_email: log.profiles?.email,
        organization_name: log.organizations?.name
      }))

      setLogs(logsWithDetails)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_admin_activity_stats', {
          admin_id: null,
          days_back: filterDays
        })

      if (error) throw error
      setStats(data || [])
    } catch (error) {
      console.error('Failed to fetch activity stats:', error)
    }
  }

  const exportToCSV = () => {
    const headers = ['日時', '管理者', 'アクション', '対象テーブル', '組織', 'IPアドレス']
    const rows = logs.map(log => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_email || '-',
      log.action,
      log.targetTable || '-',
      log.organization_name || '-',
      log.ipAddress || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `admin-activity-logs-${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
  }

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'SWITCH_ORGANIZATION':
        return 'bg-blue-100 text-blue-800'
      case 'VIEW_ERROR_LOG':
      case 'VIEW_ERROR_LOGS_BATCH':
        return 'bg-yellow-100 text-yellow-800'
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-orange-100 text-orange-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user?.isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            この機能はスーパー管理者のみ利用できます。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.admin_user_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(stat.last_activity), 'MM/dd HH:mm')}
                  </span>
                </div>
                <p className="font-semibold text-sm mb-1">{stat.admin_email}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{stat.total_actions} アクション</span>
                  <span>{stat.organizations_accessed} 組織</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* アクティビティログ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              管理者アクティビティログ
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(Number(e.target.value))}
                className="px-3 py-1.5 border border-input rounded-md text-sm"
              >
                <option value={1}>過去24時間</option>
                <option value={7}>過去7日間</option>
                <option value={30}>過去30日間</option>
                <option value={90}>過去90日間</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              読み込み中...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              アクティビティログがありません
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                      {log.targetTable && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {log.targetTable}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">管理者:</span>
                      <span className="ml-2 font-medium">{log.admin_email || '-'}</span>
                    </div>
                    {log.organization_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">組織:</span>
                        <span className="ml-2 font-medium">{log.organization_name}</span>
                      </div>
                    )}
                  </div>

                  {log.ipAddress && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      IP: {log.ipAddress}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        詳細情報
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
              {logs.length} 件のアクティビティ（過去 {filterDays} 日間）
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
