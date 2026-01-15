import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export const PasswordReset: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      })

      if (error) throw error

      setSent(true)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'パスワードリセットメールの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">メールを送信しました</CardTitle>
            <CardDescription>
              パスワードリセット用のリンクをメールで送信しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{email}</strong> 宛にパスワードリセット用のリンクを送信しました。
                メールをご確認いただき、リンクをクリックしてパスワードをリセットしてください。
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>メールが届かない場合：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>迷惑メールフォルダをご確認ください</li>
                <li>メールアドレスが正しいか確認してください</li>
                <li>数分待ってから再度お試しください</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                別のメールアドレスで試す
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/login')}
              >
                ログイン画面へ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">パスワードリセット</CardTitle>
          <CardDescription>
            登録済みのメールアドレスを入力してください
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

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '送信中...' : 'リセットリンクを送信'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                ログイン画面に戻る
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
