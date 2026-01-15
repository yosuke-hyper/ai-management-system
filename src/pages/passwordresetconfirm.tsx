import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export const PasswordResetConfirm: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('パスワードリセットのセッションが無効です。もう一度リセットリンクをリクエストしてください。')
      }
    }
    checkSession()
  }, [])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'パスワードは8文字以上である必要があります'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'パスワードには大文字を1文字以上含める必要があります'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'パスワードには小文字を1文字以上含める必要があります'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'パスワードには数字を1文字以上含める必要があります'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationError(null)

    const validation = validatePassword(password)
    if (validation) {
      setValidationError(validation)
      return
    }

    if (password !== confirmPassword) {
      setValidationError('パスワードが一致しません')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      console.error('Password update error:', err)
      setError(err.message || 'パスワードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">パスワードを変更しました</CardTitle>
            <CardDescription>
              新しいパスワードでログインできます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-900">
                パスワードが正常に変更されました。
                まもなくログイン画面に移動します...
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              今すぐログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
          <CardDescription>
            安全なパスワードを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}

            {validationError && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-900">{validationError}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                新しいパスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="新しいパスワード"
                  required
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-xs text-gray-600 space-y-1 mt-2">
                <p className="font-medium">パスワードの要件：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={password.length >= 8 ? 'text-green-600' : ''}>8文字以上</li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>大文字を1文字以上</li>
                  <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>小文字を1文字以上</li>
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>数字を1文字以上</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                パスワード確認
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="パスワードを再入力"
                  required
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">パスワードが一致しません</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600">パスワードが一致しています</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
