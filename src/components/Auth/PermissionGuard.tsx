import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, TriangleAlert as AlertTriangle, Lock, Users, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface PermissionGuardProps {
  children: React.ReactNode
  requiredRole?: 'staff' | 'manager' | 'admin'
  requiredStoreAccess?: string
  fallback?: React.ReactNode
  showError?: boolean
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRole,
  requiredStoreAccess,
  fallback,
  showError = true
}) => {
  const { user, hasPermission, canAccessStore } = useAuth()

  // ユーザーがログインしていない場合
  if (!user) {
    return fallback || null
  }

  // 必要な役割レベルをチェック
  if (requiredRole && !hasPermission(requiredRole)) {
    if (!showError) return fallback || null

    const roleNames = {
      staff: 'スタッフ',
      manager: '店長・マネージャー',
      admin: '統括責任者'
    }

    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-red-800">
              アクセス権限が不足しています
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-red-700">
                この機能を利用するには<strong>{roleNames[requiredRole]}</strong>以上の権限が必要です。
              </p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="border-red-300 text-red-700">
                  現在の権限: {roleNames[user.role]}
                </Badge>
                <Badge variant="destructive">
                  必要権限: {roleNames[requiredRole]}
                </Badge>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-left">
              <h4 className="text-sm font-medium text-gray-700 mb-2">利用可能な機能：</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {user.role === 'staff' && (
                  <>
                    <li>✅ 日報入力・編集</li>
                    <li>✅ 基本的なダッシュボード閲覧</li>
                    <li>✅ AI基本分析</li>
                    <li>❌ 店舗管理機能</li>
                    <li>❌ ユーザー管理</li>
                    <li>❌ システム設定</li>
                  </>
                )}
                {user.role === 'manager' && (
                  <>
                    <li>✅ 担当店舗管理</li>
                    <li>✅ スタッフ管理</li>
                    <li>✅ 詳細分析機能</li>
                    <li>✅ AI高度分析</li>
                    <li>❌ 全店舗統合管理</li>
                    <li>❌ システム設定</li>
                  </>
                )}
              </ul>
            </div>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              前のページに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 特定の店舗アクセス権をチェック
  if (requiredStoreAccess && !canAccessStore(requiredStoreAccess)) {
    if (!showError) return fallback || null

    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl font-bold text-yellow-800">
              店舗アクセス権限がありません
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-yellow-700">
              この店舗のデータにアクセスする権限がありません。
            </p>
            
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">アクセス可能な店舗：</h4>
              <div className="space-y-1">
                {user.assignedStores?.map(store => (
                  <div key={store.id} className="text-xs text-gray-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {store.name}
                  </div>
                )) || (
                  <p className="text-xs text-gray-500">アクセス可能な店舗がありません</p>
                )}
              </div>
            </div>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 権限チェック通過：子コンポーネントを表示
  return <>{children}</>
}