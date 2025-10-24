import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInvitationByToken, acceptInvitation } from '@/services/organizationService'

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  status: string
  expires_at: string
  organization: {
    id: string
    name: string
    slug: string
  }
}

export const InvitationAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getInvitationByToken(token)

      if (fetchError || !data) {
        setError('招待が見つかりません。リンクが無効か、既に使用されている可能性があります。')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('この招待は有効期限が切れています')
        return
      }

      setInvitation(data as Invitation)
    } catch (err) {
      setError('招待情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!token || !user?.id || !invitation) return

    try {
      setAccepting(true)
      setError(null)

      const { data, error: acceptError } = await acceptInvitation(token, user.id)

      if (acceptError) {
        setError(acceptError.message || '招待の承認に失敗しました')
        return
      }

      if (data) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/dashboard/daily')
        }, 2000)
      }
    } catch (err) {
      setError('招待の承認に失敗しました')
    } finally {
      setAccepting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">ログインが必要です</h2>
              <p className="text-slate-600 mb-6">
                招待を承認するには、まずログインしてください
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                ログインページへ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-600">招待情報を確認しています...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">エラー</h2>
              <p className="text-slate-600 mb-6">{error}</p>
              <Button
                onClick={() => navigate('/dashboard/daily')}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white"
              >
                ダッシュボードへ戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">招待を承認しました</h2>
              <p className="text-slate-600 mb-2">
                {invitation?.organization.name} のメンバーになりました
              </p>
              <p className="text-sm text-slate-500">
                まもなくダッシュボードへ移動します...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">組織への招待</h2>
            <p className="text-slate-600">
              {invitation?.organization.name} に招待されています
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">組織名:</span>
                <span className="font-medium text-slate-900">{invitation?.organization.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">役割:</span>
                <span className="font-medium text-slate-900">
                  {invitation?.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">招待先:</span>
                <span className="font-medium text-slate-900">{invitation?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">有効期限:</span>
                <span className="font-medium text-slate-900">
                  {invitation?.expires_at &&
                    new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {accepting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  承認中...
                </>
              ) : (
                '招待を承認する'
              )}
            </Button>

            <Button
              onClick={() => navigate('/dashboard/daily')}
              disabled={accepting}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
            >
              キャンセル
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-6">
            招待を承認すると、この組織のメンバーとなり、組織のデータにアクセスできるようになります
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
