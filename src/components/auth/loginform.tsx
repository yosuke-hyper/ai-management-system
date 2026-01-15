import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Lock, User, CircleAlert as AlertCircle, Building, Store, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/authcontext'
// Note: 新料金体系ではプラン選択が必要です。後で実装予定

export const LoginForm: React.FC = () => {
  console.log('📝 LoginForm rendering')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signUp, signIn, loading: authLoading } = useAuth()
  const redirectPath = searchParams.get('redirect')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    storeCount: 1
  })
  const [isSignUp, setIsSignUp] = useState(false)
  const [signupStep, setSignupStep] = useState(1)
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submitting = authLoading || localSubmitting

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
    setSuccess('')
  }

  const handleDemoMode = () => {
    navigate('/demo/register')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🟦 LoginForm: フォーム送信開始')
    setError('')
    setSuccess('')
    setLocalSubmitting(true)

    try {
      if (isSignUp) {
        // サインアップ
        if (!formData.name || !formData.email || !formData.password || !formData.organizationName) {
          setError('すべての項目を入力してください')
          setLocalSubmitting(false)
          return
        }

        if (formData.password.length < 8) {
          setError('パスワードは8文字以上で入力してください')
          setLocalSubmitting(false)
          return
        }

        console.log('🟦 LoginForm: サインアップ開始', { storeCount: formData.storeCount })
        const { data, error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          'owner',
          formData.organizationName,
          formData.storeCount
        )

        if (error) {
          console.error('❌ LoginForm: サインアップエラー', error)
          setError(error.message)
          setLocalSubmitting(false)
          return
        }

        if (data) {
          console.log('✅ LoginForm: サインアップ成功')
          setSuccess('アカウントと組織が作成されました。ログインしてください。')
          setIsSignUp(false)
          setSignupStep(1)
          setFormData({ name: '', email: formData.email, password: '', organizationName: '', storeCount: 1 })
          setLocalSubmitting(false)
        }
      } else {
        // サインイン
        if (!formData.email || !formData.password) {
          setError('メールアドレスとパスワードを入力してください')
          setLocalSubmitting(false)
          return
        }

        console.log('🟦 LoginForm: サインイン開始', formData.email)
        const { data, error } = await signIn(formData.email, formData.password)
        console.log('🟦 LoginForm: サインイン完了', { data, error })

        if (error) {
          console.error('❌ LoginForm: サインインエラー', error)
          setError(error.message || 'ログインに失敗しました')
          setLocalSubmitting(false)
          return
        }

        if (data) {
          console.log('✅ LoginForm: サインイン成功、リダイレクト:', redirectPath || '/dashboard/daily')
          navigate(redirectPath || '/dashboard/daily', { replace: true })
        }
      }
    } catch (err) {
      console.error('❌ LoginForm: 予期しないエラー', err)
      setError('予期しないエラーが発生しました')
      setLocalSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/src/assets/FoodValue AI Logo - Professional and Inviting (4).png"
              alt="FoodValue AI Logo"
              className="h-40 w-auto"
            />
          </div>
          <p className="text-center text-slate-600 text-sm mt-2">
            {isSignUp ? '新規アカウント登録' : 'ログイン'}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && signupStep === 1 && (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-600" />
                    利用予定店舗数を選択
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    後から変更も可能です（1〜4店舗まで）
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[1, 2, 3, 4].map((count) => {
                      // TODO: 新料金体系ではプラン単価 × 店舗数
                      const monthlyPrice = 3980 * count;
                      const sixMonthPrice = 20000 * count;
                      const isSelected = formData.storeCount === count;

                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, storeCount: count }))}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 mb-1">
                              {count}店舗
                            </div>
                            <div className="text-sm font-medium text-blue-700">
                              ¥{monthlyPrice.toLocaleString()}/月
                            </div>
                            <div className="text-xs text-gray-500">
                              6ヶ月 ¥{sixMonthPrice.toLocaleString()}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">選択中の料金</span>
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      ¥{(3980 * formData.storeCount).toLocaleString()}
                      <span className="text-sm font-normal text-gray-600">/月</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formData.storeCount}店舗 × ¥3,980
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900">
                      <strong>5店舗以上</strong>をご希望の場合は、登録後に見積依頼フォームからお問い合わせください。
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setSignupStep(2)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  次へ：アカウント情報入力
                </Button>
              </>
            )}

            {isSignUp && signupStep === 2 && (
              <>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">利用予定店舗数</span>
                    <div>
                      <span className="font-bold text-blue-700">{formData.storeCount}店舗</span>
                      <button
                        type="button"
                        onClick={() => setSignupStep(1)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        変更
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    月額 ¥{(3980 * formData.storeCount).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Building className="w-4 h-4 inline mr-2" />
                    組織名
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="株式会社〇〇"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    お名前
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="山田太郎"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="your-email@example.com"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    パスワード
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="8文字以上"
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            {!isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="your-email@example.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    パスワード
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="8文字以上"
                    disabled={submitting}
                  />
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/password-reset')}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition"
                      disabled={submitting}
                    >
                      パスワードをお忘れの方
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {(!isSignUp || signupStep === 2) && (
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    処理中...
                  </span>
                ) : isSignUp ? (
                  'アカウント作成'
                ) : (
                  'ログイン'
                )}
              </Button>
            )}

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setSignupStep(1)
                  setError('')
                  setSuccess('')
                }}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition"
                disabled={submitting}
              >
                {isSignUp
                  ? 'すでにアカウントをお持ちの方はこちら'
                  : '新規アカウント登録はこちら'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Button
              type="button"
              onClick={handleDemoMode}
              variant="outline"
              className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold"
              disabled={submitting}
            >
              デモを試す（7日間無料体験）
            </Button>
            <p className="text-xs text-center text-slate-500 mt-4">
              デモモードでは2店舗のサンプルデータを使って全機能をお試しいただけます
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
