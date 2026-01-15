/**
 * エラー統計ダッシュボードコンポーネント
 *
 * エラーログの統計情報を視覚的に表示
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/organizationcontext'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  Activity,
  Clock,
  Users,
  Zap
} from 'lucide-react'

interface ErrorStats {
  total: number
  unresolved: number
  critical: number
  high: number
  medium: number
  low: number
  last24Hours: number
  lastHour: number
  byType: Record<string, number>
  topUsers: Array<{ email: string; count: number }>
  trend: 'up' | 'down' | 'stable'
  averagePerDay: number
}

interface RecentError {
  id: string
  error_type: string
  error_message: string
  severity: string
  created_at: string
  user_email?: string
}

export const ErrorStatsDashboard: React.FC = () => {
  const { organization } = useOrganization()
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (organization?.id) {
      loadStats()
      loadRecentErrors()
    }
  }, [organization?.id])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadStats()
      loadRecentErrors()
    }, 30000) // 30秒ごとに更新

    return () => clearInterval(interval)
  }, [autoRefresh, organization?.id])

  const loadStats = async () => {
    if (!organization?.id) return

    try {
      const { data: errorLogs, error } = await supabase
        .from('error_logs')
        .select('severity, error_type, resolved, created_at, user_id')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // 基本統計
      const total = errorLogs?.length || 0
      const unresolved = errorLogs?.filter(log => !log.resolved).length || 0
      const critical = errorLogs?.filter(log => log.severity === 'CRITICAL').length || 0
      const high = errorLogs?.filter(log => log.severity === 'HIGH').length || 0
      const medium = errorLogs?.filter(log => log.severity === 'MEDIUM').length || 0
      const low = errorLogs?.filter(log => log.severity === 'LOW').length || 0

      // 時間ベースの統計
      const last24HoursCount = errorLogs?.filter(
        log => new Date(log.created_at) > last24Hours
      ).length || 0

      const lastHourCount = errorLogs?.filter(
        log => new Date(log.created_at) > lastHour
      ).length || 0

      // トレンド分析
      const last7DaysCount = errorLogs?.filter(
        log => new Date(log.created_at) > last7Days
      ).length || 0

      const prev7DaysCount = errorLogs?.filter(
        log => new Date(log.created_at) > prev7Days && new Date(log.created_at) <= last7Days
      ).length || 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (last7DaysCount > prev7DaysCount * 1.1) trend = 'up'
      else if (last7DaysCount < prev7DaysCount * 0.9) trend = 'down'

      // エラータイプ別集計
      const byType: Record<string, number> = {}
      errorLogs?.forEach(log => {
        byType[log.error_type] = (byType[log.error_type] || 0) + 1
      })

      // ユーザー別集計
      const userCounts: Record<string, number> = {}
      errorLogs?.forEach(log => {
        if (log.user_id) {
          userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1
        }
      })

      // 1日あたりの平均
      const daysCount = Math.max(1, Math.ceil((now.getTime() - new Date(errorLogs?.[errorLogs.length - 1]?.created_at || now).getTime()) / (24 * 60 * 60 * 1000)))
      const averagePerDay = total / daysCount

      setStats({
        total,
        unresolved,
        critical,
        high,
        medium,
        low,
        last24Hours: last24HoursCount,
        lastHour: lastHourCount,
        byType,
        topUsers: [], // ユーザー情報の取得は省略（パフォーマンス）
        trend,
        averagePerDay
      })
    } catch (error) {
      console.error('Failed to load error stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentErrors = async () => {
    if (!organization?.id) return

    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select(`
          id,
          error_type,
          error_message,
          severity,
          created_at,
          profiles:user_id (
            email
          )
        `)
        .eq('organization_id', organization.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      const errorsWithEmail = data?.map(log => ({
        ...log,
        user_email: log.profiles?.email
      })) || []

      setRecentErrors(errorsWithEmail)
    } catch (error) {
      console.error('Failed to load recent errors:', error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <XCircle className="w-4 h-4" />
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4" />
      case 'LOW':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600'
      case 'HIGH':
        return 'text-red-500'
      case 'MEDIUM':
        return 'text-orange-500'
      case 'LOW':
        return 'text-yellow-500'
      default:
        return 'text-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">統計情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">統計情報を取得できませんでした</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">エラー監視ダッシュボード</h2>
          <p className="text-sm text-slate-600 mt-1">
            リアルタイムでエラーの発生状況を監視
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              autoRefresh
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            {autoRefresh ? '自動更新: ON' : '自動更新: OFF'}
          </button>
          <button
            onClick={() => {
              loadStats()
              loadRecentErrors()
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            <Activity className="w-4 h-4 inline mr-1" />
            更新
          </button>
        </div>
      </div>

      {/* メインメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 総エラー数 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">総エラー数</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  平均 {stats.averagePerDay.toFixed(1)}/日
                </p>
              </div>
              <Activity className="w-10 h-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* 未解決 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">未解決</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.unresolved}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.total > 0 ? `${((stats.unresolved / stats.total) * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        {/* 24時間 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">過去24時間</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.last24Hours}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  )}
                  {stats.trend === 'down' && (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                  <p className="text-xs text-slate-500">
                    {stats.trend === 'up' && '増加傾向'}
                    {stats.trend === 'down' && '減少傾向'}
                    {stats.trend === 'stable' && '安定'}
                  </p>
                </div>
              </div>
              <Clock className="w-10 h-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        {/* 過去1時間 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">過去1時間</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.lastHour}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.lastHour > 10 ? '⚠️ 高頻度' : stats.lastHour > 5 ? '注意' : '正常'}
                </p>
              </div>
              <Zap className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 深刻度別 */}
      <Card>
        <CardHeader>
          <CardTitle>深刻度別エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700 font-medium">CRITICAL</p>
                <p className="text-2xl font-bold text-red-900">{stats.critical}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-700 font-medium">HIGH</p>
                <p className="text-2xl font-bold text-orange-900">{stats.high}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700 font-medium">MEDIUM</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.medium}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700 font-medium">LOW</p>
                <p className="text-2xl font-bold text-blue-900">{stats.low}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラータイプ別 & 最近のエラー */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* エラータイプ別 */}
        <Card>
          <CardHeader>
            <CardTitle>エラータイプ別 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => {
                  const percentage = (count / stats.total) * 100
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{type}</span>
                        <span className="text-sm text-slate-600">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(stats.byType).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  エラーがありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 最近のエラー */}
        <Card>
          <CardHeader>
            <CardTitle>最近の未解決エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentErrors.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  未解決エラーがありません
                </p>
              ) : (
                recentErrors.map(error => (
                  <div
                    key={error.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className={getSeverityColor(error.severity)}>
                        {getSeverityIcon(error.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-700">
                            {error.error_type}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(error.severity)} bg-white`}>
                            {error.severity}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 truncate mb-1">
                          {error.error_message}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(error.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* アラート */}
      {stats.critical > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  重大なエラーが検出されています
                </h3>
                <p className="text-sm text-red-700">
                  {stats.critical}件のCRITICALエラーが未解決です。直ちに対応してください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.lastHour > 10 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">
                  エラーが高頻度で発生しています
                </h3>
                <p className="text-sm text-orange-700">
                  過去1時間に{stats.lastHour}件のエラーが発生しました。システムに問題がある可能性があります。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
