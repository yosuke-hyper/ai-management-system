import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionGuard } from '@/components/Auth/PermissionGuard'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Shield, Store, ChevronDown, ChevronUp } from 'lucide-react'

type UserRole = 'staff' | 'manager' | 'admin'

interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

interface StoreAssignment {
  store_id: string
  store_name: string
}

export const StaffManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [storeAssignments, setStoreAssignments] = useState<Record<string, StoreAssignment[]>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) {
        setError('Supabaseクライアントが利用できません')
        setLoading(false)
        return
      }

      const [usersResult, storesResult] = await Promise.all([
        supabase.from('profiles').select('id, email, name, role, created_at').order('created_at', { ascending: false }),
        supabase.from('stores').select('id, name').eq('is_active', true).order('name')
      ])

      if (usersResult.error) throw usersResult.error
      if (storesResult.error) throw storesResult.error

      setUsers(usersResult.data || [])
      setStores(storesResult.data || [])

      const assignmentsMap: Record<string, StoreAssignment[]> = {}
      for (const user of usersResult.data || []) {
        const { data: assignments } = await supabase
          .from('store_assignments')
          .select(`
            store_id,
            stores:store_id (
              name
            )
          `)
          .eq('user_id', user.id)

        assignmentsMap[user.id] = (assignments || []).map((a: any) => ({
          store_id: a.store_id,
          store_name: a.stores?.name || '不明な店舗'
        }))
      }

      setStoreAssignments(assignmentsMap)
    } catch (err) {
      console.error('データ読み込みエラー:', err)
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      alert('権限を更新しました')
    } catch (err) {
      console.error('権限更新エラー:', err)
      alert('権限の更新に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'))
    }
  }

  const assignStoreToUser = async (userId: string, storeId: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('store_assignments')
        .insert({
          user_id: userId,
          store_id: storeId
        })

      if (error) throw error

      await loadData()
      alert('店舗を割り当てました')
    } catch (err) {
      console.error('店舗割り当てエラー:', err)
      alert('店舗の割り当てに失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'))
    }
  }

  const unassignStoreFromUser = async (userId: string, storeId: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('store_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('store_id', storeId)

      if (error) throw error

      await loadData()
      alert('店舗の割り当てを解除しました')
    } catch (err) {
      console.error('店舗割り当て解除エラー:', err)
      alert('店舗の割り当て解除に失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'))
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'default'
      case 'manager': return 'secondary'
      case 'staff': return 'outline'
      default: return 'outline'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return '管理者'
      case 'manager': return '店長'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  if (loading) {
    return (
      <PermissionGuard requiredRole="manager">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard requiredRole="manager">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            スタッフ権限管理
          </h1>
          <p className="text-sm text-muted-foreground">登録スタッフの権限と店舗割り当てを管理します。</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>登録済みスタッフ（{users.length}名）</span>
              <Button variant="outline" size="sm" onClick={loadData}>
                更新
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>登録済みスタッフがいません</p>
                </div>
              ) : (
                users.map(user => {
                  const isExpanded = expandedUserId === user.id
                  const userStores = storeAssignments[user.id] || []
                  const unassignedStores = stores.filter(
                    s => !userStores.some(us => us.store_id === s.id)
                  )

                  return (
                    <div key={user.id} className="border border-border rounded-lg">
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm sm:text-base truncate">{user.email}</span>
                            </div>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="self-start">
                              <Shield className="w-3 h-3 mr-1" />
                              {getRoleLabel(user.role)}
                            </Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-2">
                            名前: {user.name} | 登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                          </div>
                          {userStores.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Store className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                割り当て店舗: {userStores.length}店舗
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                            className="w-full sm:w-auto"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                            {isExpanded ? '閉じる' : '管理'}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              権限変更
                            </h4>
                            <div className="flex gap-2 flex-wrap">
                              {(['staff', 'manager', 'admin'] as UserRole[]).map(role => (
                                <Button
                                  key={role}
                                  size="sm"
                                  variant={user.role === role ? 'default' : 'outline'}
                                  onClick={() => {
                                    if (user.role !== role) {
                                      if (confirm(`${user.email}の権限を「${getRoleLabel(role)}」に変更しますか？`)) {
                                        updateUserRole(user.id, role)
                                      }
                                    }
                                  }}
                                  disabled={user.role === role}
                                >
                                  {getRoleLabel(role)}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Store className="w-4 h-4" />
                              店舗割り当て
                            </h4>

                            {userStores.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs text-muted-foreground mb-2">割り当て済み店舗</div>
                                <div className="flex flex-wrap gap-2">
                                  {userStores.map(store => (
                                    <Badge key={store.store_id} variant="secondary" className="flex items-center gap-1">
                                      {store.store_name}
                                      <button
                                        onClick={() => {
                                          if (confirm(`${store.store_name}の割り当てを解除しますか？`)) {
                                            unassignStoreFromUser(user.id, store.store_id)
                                          }
                                        }}
                                        className="ml-1 hover:text-destructive"
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
                                <div className="text-xs text-muted-foreground mb-2">追加可能な店舗</div>
                                <div className="flex flex-wrap gap-2">
                                  {unassignedStores.map(store => (
                                    <Button
                                      key={store.id}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm(`${store.name}を割り当てますか？`)) {
                                          assignStoreToUser(user.id, store.id)
                                        }
                                      }}
                                    >
                                      + {store.name}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-2">
                                すべての店舗が割り当て済みです
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>権限レベルの説明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="default" className="mt-0.5">
                  <Shield className="w-3 h-3 mr-1" />
                  管理者
                </Badge>
                <div>
                  <p className="font-medium">すべての機能にアクセス可能</p>
                  <p className="text-muted-foreground">全店舗の管理、スタッフの権限変更、システム設定など</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">
                  <Shield className="w-3 h-3 mr-1" />
                  店長
                </Badge>
                <div>
                  <p className="font-medium">割り当て店舗の管理が可能</p>
                  <p className="text-muted-foreground">日報の確認・編集、月次経費入力、目標設定など</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">
                  <Shield className="w-3 h-3 mr-1" />
                  スタッフ
                </Badge>
                <div>
                  <p className="font-medium">基本的な日報入力のみ</p>
                  <p className="text-muted-foreground">割り当て店舗の日報入力のみが可能</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
