/**
 * 組織管理コンポーネント（スーパー管理者専用）
 *
 * 全組織の管理、データクリーンアップ、統計情報の表示を提供します。
 * 開発環境と本番環境の分離をサポートします。
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/authcontext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  Store,
  FileText,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  email: string
  subscription_status: string
  subscription_plan: string
  is_demo: boolean
  created_at: string
  demo_expires_at?: string
  store_count?: number
  report_count?: number
  member_count?: number
  last_activity?: string
}

interface OrganizationStats {
  organization_name: string
  total_stores: number
  active_stores: number
  total_reports: number
  latest_report_date: string
  total_members: number
  subscription_status: string
  subscription_plan: string
  ai_usage_this_month: number
}

interface DataIntegrityIssue {
  check_name: string
  issue_count: number
  details: string
}

export const OrganizationManagement: React.FC = () => {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'demo' | 'production' | 'test'>('all')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null)
  const [integrityIssues, setIntegrityIssues] = useState<DataIntegrityIssue[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchAllOrganizations()
      checkDataIntegrity()
    }
  }, [user])

  const fetchAllOrganizations = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc('get_all_organizations_summary')

      if (error) throw error

      setOrganizations(data || [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizationStats = async (orgId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_organization_stats', {
        org_id: orgId
      })

      if (error) throw error

      if (data && data.length > 0) {
        setOrgStats(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch organization stats:', error)
    }
  }

  const checkDataIntegrity = async () => {
    try {
      const { data, error } = await supabase.rpc('check_data_integrity')

      if (error) throw error

      setIntegrityIssues(data || [])
    } catch (error) {
      console.error('Failed to check data integrity:', error)
    }
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrg(org)
    fetchOrganizationStats(org.id)
  }

  const handleDeleteTestOrganizations = async () => {
    if (!confirm('本当にすべてのテスト組織を削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      setActionLoading(true)

      const { data, error } = await supabase.rpc('delete_test_organizations')

      if (error) throw error

      const result = data[0]
      alert(`${result.deleted_count}個のテスト組織を削除しました。\n組織名: ${result.org_names?.join(', ')}`)

      await fetchAllOrganizations()
    } catch (error) {
      console.error('Failed to delete test organizations:', error)
      alert('テスト組織の削除に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteExpiredDemos = async () => {
    if (!confirm('期限切れのデモ組織を削除しますか？')) {
      return
    }

    try {
      setActionLoading(true)

      const { data, error } = await supabase.rpc('purge_expired_demos')

      if (error) throw error

      const result = data[0]
      alert(`${result.deleted_count}個の期限切れデモ組織を削除しました`)

      await fetchAllOrganizations()
    } catch (error) {
      console.error('Failed to purge expired demos:', error)
      alert('デモ組織の削除に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`本当に組織「${orgName}」を削除しますか？この操作は取り消せません。`)) {
      return
    }

    const confirmation = prompt('確認のため、組織名を入力してください:')
    if (confirmation !== orgName) {
      alert('組織名が一致しません')
      return
    }

    try {
      setActionLoading(true)

      const { data, error } = await supabase.rpc('delete_organization_data', {
        org_id: orgId
      })

      if (error) throw error

      const result = data[0]
      alert(`組織を削除しました:\n店舗: ${result.deleted_stores}\nレポート: ${result.deleted_reports}\nメンバー: ${result.deleted_members}`)

      await fetchAllOrganizations()
      setSelectedOrg(null)
    } catch (error) {
      console.error('Failed to delete organization:', error)
      alert('組織の削除に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCleanupUnusedData = async () => {
    if (!confirm('未使用データをクリーンアップしますか？')) {
      return
    }

    try {
      setActionLoading(true)

      const { data, error } = await supabase.rpc('cleanup_unused_data')

      if (error) throw error

      const result = data[0]
      alert(`未使用データをクリーンアップしました:\nベンダー: ${result.deleted_vendors}\nターゲット: ${result.deleted_targets}\n経費基準: ${result.deleted_baselines}`)
    } catch (error) {
      console.error('Failed to cleanup unused data:', error)
      alert('データクリーンアップに失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'demo' && org.is_demo) ||
      (filterType === 'production' && !org.is_demo) ||
      (filterType === 'test' && (
        org.name.includes('テスト') ||
        org.name.toLowerCase().includes('test') ||
        org.name.includes('開発') ||
        org.slug.startsWith('test-')
      ))

    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    const colors = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      standard: 'bg-purple-100 text-purple-800',
      business: 'bg-orange-100 text-orange-800',
      enterprise: 'bg-red-100 text-red-800'
    }
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!user?.isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-600">この機能はスーパー管理者のみ利用できます</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            組織管理
          </CardTitle>
          <CardDescription>
            すべての組織の管理、データクリーンアップ、統計情報の確認
          </CardDescription>
        </CardHeader>
      </Card>

      {/* データ整合性チェック */}
      {integrityIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              データ整合性の問題
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrityIssues.map((issue, index) => (
                issue.issue_count > 0 && (
                  <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">{issue.check_name}</p>
                      <p className="text-sm text-gray-600">{issue.details}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100">
                      {issue.issue_count}件
                    </Badge>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button
          onClick={handleDeleteTestOrganizations}
          disabled={actionLoading}
          variant="outline"
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          テスト組織を削除
        </Button>
        <Button
          onClick={handleDeleteExpiredDemos}
          disabled={actionLoading}
          variant="outline"
          className="w-full"
        >
          <Clock className="w-4 h-4 mr-2" />
          期限切れデモ削除
        </Button>
        <Button
          onClick={handleCleanupUnusedData}
          disabled={actionLoading}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          未使用データ削除
        </Button>
        <Button
          onClick={fetchAllOrganizations}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="組織名、メール、スラッグで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'production', 'demo', 'test'] as const).map((type) => (
                <Button
                  key={type}
                  onClick={() => setFilterType(type)}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                >
                  {type === 'all' && 'すべて'}
                  {type === 'production' && '本番'}
                  {type === 'demo' && 'デモ'}
                  {type === 'test' && 'テスト'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 組織リスト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 組織一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>組織一覧 ({filteredOrganizations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <p className="text-center py-4 text-gray-500">読み込み中...</p>
              ) : filteredOrganizations.length === 0 ? (
                <p className="text-center py-4 text-gray-500">組織が見つかりません</p>
              ) : (
                filteredOrganizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => handleSelectOrganization(org)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrg?.id === org.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          {org.name}
                          {org.is_demo && (
                            <Badge variant="outline" className="bg-yellow-100">デモ</Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{org.email}</p>
                        <p className="text-xs text-gray-500">slug: {org.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge className={getStatusBadge(org.subscription_status)}>
                        {org.subscription_status}
                      </Badge>
                      <Badge className={getPlanBadge(org.subscription_plan)}>
                        {org.subscription_plan}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Store className="w-4 h-4" />
                        {org.store_count || 0}店舗
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {org.report_count || 0}レポート
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {org.member_count || 0}メンバー
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      作成日: {new Date(org.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 組織詳細 */}
        <Card>
          <CardHeader>
            <CardTitle>組織詳細</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrg ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedOrg.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">メール</p>
                      <p className="font-medium">{selectedOrg.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">スラッグ</p>
                      <p className="font-medium">{selectedOrg.slug}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">ステータス</p>
                      <Badge className={getStatusBadge(selectedOrg.subscription_status)}>
                        {selectedOrg.subscription_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600">プラン</p>
                      <Badge className={getPlanBadge(selectedOrg.subscription_plan)}>
                        {selectedOrg.subscription_plan}
                      </Badge>
                    </div>
                  </div>
                </div>

                {orgStats && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">統計情報</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">総店舗数</p>
                        <p className="text-2xl font-bold">{orgStats.total_stores}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">アクティブ店舗</p>
                        <p className="text-2xl font-bold">{orgStats.active_stores}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">総レポート数</p>
                        <p className="text-2xl font-bold">{orgStats.total_reports}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">メンバー数</p>
                        <p className="text-2xl font-bold">{orgStats.total_members}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">今月のAI使用量</p>
                        <p className="text-2xl font-bold">{orgStats.ai_usage_this_month}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">最新レポート</p>
                        <p className="font-medium">
                          {orgStats.latest_report_date
                            ? new Date(orgStats.latest_report_date).toLocaleDateString('ja-JP')
                            : 'なし'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 text-red-600">危険な操作</h4>
                  <Button
                    onClick={() => handleDeleteOrganization(selectedOrg.id, selectedOrg.name)}
                    disabled={actionLoading}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    この組織を削除
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    この操作は取り消せません。すべての関連データが削除されます。
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                左側の組織リストから組織を選択してください
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
