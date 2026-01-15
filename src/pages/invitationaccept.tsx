import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building, CheckCircle, XCircle, AlertTriangle, Loader, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/authcontext'
import { getInvitationByToken, acceptInvitation } from '@/services/organizationservice'
import { supabase } from '@/lib/supabase'

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
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)

  useEffect(() => {
    console.log('🔗 [InvitationAccept] ページロード:', {
      token,
      pathname: window.location.pathname,
      href: window.location.href,
      isAuthenticated
    })
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 招待情報を取得中...', { token })

      const { data, error: fetchError } = await getInvitationByToken(token)

      console.log('📩 招待情報の取得結果:', { data, error: fetchError })

      if (fetchError) {
        console.error('❌ 招待情報の取得エラー:', fetchError)
        setError(`招待情報の取得に失敗しました: ${fetchError.message || '不明なエラー'}`)
        return
      }

      if (!data) {
        console.warn('⚠️ 招待が見つかりません')
        setError('招待が見つかりません。リンクが無効か、既に使用されている可能性があります。')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        console.warn('⏰ 招待の有効期限が切れています')
        setError('この招待は有効期限が切れています')
        return
      }

      if (!data.organization) {
        console.error('🏢 組織情報が見つかりません:', data)
        setError('招待情報が不完全です。組織情報が見つかりません。')
        return
      }

      console.log('✅ 招待情報の取得に成功:', data)
      setInvitation(data as Invitation)
    } catch (err) {
      console.error('💥 予期しないエラー:', err)
      setError(`招待情報の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invitation || !token) return

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    try {
      setCreatingAccount(true)
      setError(null)

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            email: invitation.email,
          },
        },
      })

      if (signUpError) {
        setError('アカウントの作成に失敗しました: ' + signUpError.message)
        return
      }

      if (!authData.user) {
        setError('アカウントの作成に失敗しました')
        return
      }

      const { data, error: acceptError } = await acceptInvitation(token, authData.user.id)

      if (acceptError) {
        setError('招待の承認に失敗しました: ' + acceptError.message)
        return
      }

      if (data) {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard/daily'
        }, 2000)
      }
    } catch (err) {
      console.error('Account creation error:', err)
      setError('アカウントの作成に失敗しました')
    } finally {
      setCreatingAccount(false)
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
          window.location.href = '/dashboard/daily'
        }, 2000)
      }
    } catch (err) {
      setError('招待の承認に失敗しました')
    } finally {
      setAccepting(false)
    }
  }

  if (!isAuthenticated && !loading && invitation) {
    if (showPasswordForm) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">アカウントを作成</h2>
                <p className="text-slate-600 text-sm">
                  {invitation.organization?.name} への招待
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>{invitation.email}</strong> でアカウントを作成します
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    パスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="8文字以上"
                      disabled={creatingAccount}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    パスワード（確認）
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="パスワードを再入力"
                      disabled={creatingAccount}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    disabled={creatingAccount}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creatingAccount ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      'アカウントを作成して参加'
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    disabled={creatingAccount}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    戻る
                  </Button>
                </div>
              </form>

              <p className="text-xs text-slate-500 text-center mt-6">
                アカウントを作成すると、自動的に組織に参加します
              </p>
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
                {invitation.organization?.name} に招待されています
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">招待先:</span>
                  <span className="font-medium text-slate-900">{invitation.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">役割:</span>
                  <span className="font-medium text-slate-900">
                    {invitation.role === 'owner' && 'オーナー'}
                    {invitation.role === 'admin' && '管理者'}
                    {invitation.role === 'manager' && 'マネージャー'}
                    {invitation.role === 'staff' && 'スタッフ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setShowPasswordForm(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                新しいアカウントを作成
              </Button>

              <Button
                onClick={() => navigate(`/login?redirect=/invitation/${token}`)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
              >
                既存のアカウントでログイン
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-6">
              招待を承認すると、この組織のメンバーとなります
            </p>
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
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                    loadInvitation()
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  もう一度試す
                </Button>
                {isAuthenticated && (
                  <Button
                    onClick={() => navigate('/dashboard/daily')}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    ダッシュボードへ戻る
                  </Button>
                )}
                {!isAuthenticated && (
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
                  >
                    ログインページへ
                  </Button>
                )}
              </div>
              <div className="mt-6 text-xs text-slate-500 text-left bg-slate-50 p-3 rounded">
                <p className="font-medium mb-1">トラブルシューティング:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>招待リンクの有効期限が切れていないか確認</li>
                  <li>正しいメールアドレスで確認しているか確認</li>
                  <li>問題が続く場合は招待元に連絡してください</li>
                </ul>
              </div>
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
                {invitation?.organization?.name} のメンバーになりました
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
              {invitation?.organization?.name} に招待されています
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">組織名:</span>
                <span className="font-medium text-slate-900">{invitation?.organization?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">役割:</span>
                <span className="font-medium text-slate-900">
                  {invitation?.role === 'owner' && 'オーナー'}
                  {invitation?.role === 'admin' && '管理者'}
                  {invitation?.role === 'manager' && 'マネージャー'}
                  {invitation?.role === 'staff' && 'スタッフ'}
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
