import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UserPlus, Trash2, Shield, User, Mail, Calendar, AlertCircle, Store, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import {
  getOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  getMemberStoreAssignments,
  assignStoreToMember,
  removeStoreFromMember
} from '@/services/organizationservice'
import { subscriptionService, SubscriptionLimits } from '@/services/subscriptionservice'
import { InviteModal } from './invitemodal'
import { supabase } from '@/lib/supabase'

type RoleType = 'owner' | 'admin' | 'manager' | 'staff'

interface StoreInfo {
  id: string
  name: string
  is_active?: boolean
}

interface Member {
  organization_id: string
  user_id: string
  role: RoleType
  joined_at: string
  profiles: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface MemberWithStores extends Member {
  stores?: StoreInfo[]
}

interface Props {
  organizationId: string
}

export const UnifiedMemberManagement: React.FC<Props> = ({ organizationId }) => {
  const { user } = useAuth()
  const { isAdmin, isOwner, organizationRole } = useOrganization()
  const [members, setMembers] = useState<MemberWithStores[]>([])
  const [allStores, setAllStores] = useState<StoreInfo[]>([])
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const isManager = organizationRole === 'manager' || isAdmin
  const canManageMembers = isAdmin
  const canManageStores = isManager

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: memberData, error: memberError } = await getOrganizationMembers(organizationId)

      if (memberError) {
        setError(`メンバー一覧の取得に失敗しました: ${memberError.message}`)
        return
      }

      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, is_active')
        .eq('organization_id', organizationId)
        // is_active フィルターを削除して、すべての店舗を表示
        .order('name')

      if (storesError) {
        console.error('Failed to fetch stores:', storesError)
      }

      setAllStores(storesData || [])

      const membersWithStores = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: storeAssignments } = await getMemberStoreAssignments(member.user_id)
          return {
            ...member,
            stores: storeAssignments || []
          }
        })
      )

      setMembers(membersWithStores)

      try {
        const limitsData = await subscriptionService.getSubscriptionLimits(organizationId)
        setLimits(limitsData)
      } catch (limitsError) {
        console.error('Failed to load subscription limits:', limitsError)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('このメンバーを削除してもよろしいですか？')) {
      return
    }

    try {
      setActionLoading(userId)
      const { error: removeError } = await removeOrganizationMember(organizationId, userId)

      if (removeError) {
        alert('メンバーの削除に失敗しました')
        return
      }

      await loadData()
    } catch (err) {
      alert('メンバーの削除に失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async (userId: string, newRole: RoleType) => {
    if (!confirm(`このメンバーの権限を「${getRoleLabel(newRole)}」に変更してもよろしいですか？`)) {
      return
    }

    try {
      setActionLoading(userId)
      const { error: updateError } = await updateOrganizationMemberRole(
        organizationId,
        userId,
        newRole
      )

      if (updateError) {
        alert('権限の変更に失敗しました')
        return
      }

      await loadData()
    } catch (err) {
      alert('権限の変更に失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignStore = async (userId: string, storeId: string) => {
    try {
      setActionLoading(`${userId}-store`)
      const { error } = await assignStoreToMember(userId, storeId)

      if (error) {
        alert('店舗の割り当てに失敗しました')
        return
      }

      await loadData()
    } catch (err) {
      alert('店舗の割り当てに失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveStore = async (userId: string, storeId: string) => {
    if (!confirm('この店舗の割り当てを解除してもよろしいですか？')) {
      return
    }

    try {
      setActionLoading(`${userId}-store`)
      const { error } = await removeStoreFromMember(userId, storeId)

      if (error) {
        alert('店舗の割り当て解除に失敗しました')
        return
      }

      await loadData()
    } catch (err) {
      alert('店舗の割り当て解除に失敗しました')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー'
      case 'admin':
        return '管理者'
      case 'manager':
        return 'マネージャー'
      case 'staff':
        return 'スタッフ'
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'manager':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'staff':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>メンバー・権限管理</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              組織メンバーの権限変更と店舗割り当てを管理
            </p>
          </div>
          {canManageMembers && (
            <Button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              メンバーを招待
            </Button>
          )}
        </div>
        {!canManageMembers && (
          <p className="text-xs text-slate-500 mt-2">
            あなたの権限: {getRoleLabel(organizationRole || 'staff')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {limits && (
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">ユーザー数</span>
              </div>
              <span className={`text-sm font-semibold ${
                (limits.currentUsers / limits.maxUsers) * 100 >= 90 ? 'text-red-600' :
                (limits.currentUsers / limits.maxUsers) * 100 >= 70 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {limits.currentUsers} / {limits.maxUsers}
              </span>
            </div>
            <Progress
              value={(limits.currentUsers / limits.maxUsers) * 100}
              className="h-2 mb-2"
              indicatorClassName={
                (limits.currentUsers / limits.maxUsers) * 100 >= 90 ? 'bg-red-600' :
                (limits.currentUsers / limits.maxUsers) * 100 >= 70 ? 'bg-yellow-600' :
                'bg-green-600'
              }
            />
            <p className="text-xs text-slate-600">
              {limits.contractedStores}契約 × 5人 = 最大{limits.maxUsers}人まで利用可能
            </p>
            {(limits.currentUsers / limits.maxUsers) * 100 >= 90 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-900 font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  ユーザー数の上限に近づいています
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 mb-2">{error}</p>
              <button
                onClick={loadData}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {members.filter(m => m.profiles !== null).map((member) => {
            const isCurrentUser = member.user_id === user?.id
            const canManageThisMember = canManageMembers && !isCurrentUser && member.role !== 'owner'
            const isExpanded = expandedUserId === member.user_id
            const unassignedStores = allStores.filter(
              s => !member.stores?.some(ms => ms.id === s.id)
            )

            return (
              <div
                key={member.user_id}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-slate-900">
                            {member.profiles?.name || '名前未設定'}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-slate-500">(あなた)</span>
                            )}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor(
                              member.role
                            )}`}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                          {member.stores && member.stores.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Store className="w-3 h-3 mr-1" />
                              {member.stores.length}店舗
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {member.profiles?.email || 'メールアドレス未設定'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            参加: {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(canManageThisMember || canManageStores) && (
                        <Button
                          onClick={() => setExpandedUserId(isExpanded ? null : member.user_id)}
                          variant="outline"
                          size="sm"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              閉じる
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              管理
                            </>
                          )}
                        </Button>
                      )}
                      {canManageThisMember && (
                        <Button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={actionLoading === member.user_id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          {actionLoading === member.user_id ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (canManageThisMember || canManageStores) && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                    {canManageThisMember && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          権限変更
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {(['staff', 'manager', 'admin', 'owner'] as RoleType[])
                            .filter(role => role !== 'owner' || isOwner)
                            .map(role => (
                              <Button
                                key={role}
                                size="sm"
                                variant={member.role === role ? 'default' : 'outline'}
                                onClick={() => {
                                  if (member.role !== role) {
                                    handleChangeRole(member.user_id, role)
                                  }
                                }}
                                disabled={member.role === role || actionLoading === member.user_id}
                              >
                                {getRoleLabel(role)}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}

                    {canManageStores && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          店舗割り当て
                        </h4>

                        {member.stores && member.stores.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-slate-600 mb-2">割り当て済み店舗</div>
                            <div className="flex flex-wrap gap-2">
                              {member.stores.filter(store => store !== null).map(store => (
                                <Badge key={store.id} variant="secondary" className="flex items-center gap-1">
                                  {store.name}
                                  <button
                                    onClick={() => handleRemoveStore(member.user_id, store.id)}
                                    disabled={actionLoading === `${member.user_id}-store`}
                                    className="ml-1 hover:text-red-600 transition-colors"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {unassignedStores.length > 0 ? (
                          <div>
                            <div className="text-xs text-slate-600 mb-2">追加可能な店舗</div>
                            <div className="flex flex-wrap gap-2">
                              {unassignedStores.map(store => (
                                <Button
                                  key={store.id}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAssignStore(member.user_id, store.id)}
                                  disabled={actionLoading === `${member.user_id}-store`}
                                  className={store.is_active === false ? 'opacity-60' : ''}
                                >
                                  + {store.name}
                                  {store.is_active === false && (
                                    <span className="ml-1 text-xs text-slate-500">(非アクティブ)</span>
                                  )}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 text-center py-2">
                            すべての店舗が割り当て済みです
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">メンバーがいません</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            権限レベルの説明
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor('owner')}`}>
                {getRoleLabel('owner')}
              </span>
              <p>組織の全権限（組織削除、サブスク管理含む）</p>
            </div>
            <div className="flex items-start gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor('admin')}`}>
                {getRoleLabel('admin')}
              </span>
              <p>メンバー管理、全店舗アクセス、設定変更</p>
            </div>
            <div className="flex items-start gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor('manager')}`}>
                {getRoleLabel('manager')}
              </span>
              <p>店舗割り当て管理、割り当て店舗のデータ管理</p>
            </div>
            <div className="flex items-start gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor('staff')}`}>
                {getRoleLabel('staff')}
              </span>
              <p>割り当て店舗のデータ入力のみ</p>
            </div>
          </div>
        </div>
      </CardContent>

      {showInviteModal && user?.id && (
        <InviteModal
          organizationId={organizationId}
          userId={user.id}
          onClose={() => setShowInviteModal(false)}
          onInvited={loadData}
        />
      )}
    </Card>
  )
}
