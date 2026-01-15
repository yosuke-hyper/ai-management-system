import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Shield, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface Props {
  userId: string
  onAccepted: () => void
}

const TERMS_VERSION = '1.0'
const PRIVACY_VERSION = '1.0'

export const TermsAcceptanceModal: React.FC<Props> = ({ userId, onAccepted }) => {
  const navigate = useNavigate()
  const [termsChecked, setTermsChecked] = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    if (!termsChecked || !privacyChecked) {
      setError('利用規約とプライバシーポリシーの両方に同意する必要があります')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { error: rpcError } = await supabase.rpc('accept_terms_and_privacy', {
        p_user_id: userId,
        p_terms_version: TERMS_VERSION,
        p_privacy_version: PRIVACY_VERSION
      })

      if (rpcError) {
        console.error('Failed to record acceptance:', rpcError)
        setError('同意の記録に失敗しました。再度お試しください。')
        return
      }

      onAccepted()
    } catch (err) {
      console.error('Error accepting terms:', err)
      setError('エラーが発生しました。再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">利用規約とプライバシーポリシーへの同意</h2>
              <p className="text-sm text-slate-600">サービスのご利用には同意が必要です</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">サービスを利用する前に</p>
                <p>
                  本サービスをご利用いただく前に、利用規約とプライバシーポリシーを必ずお読みいただき、内容をご理解の上で同意してください。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="terms" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900">利用規約</span>
                  </label>
                  <p className="text-sm text-slate-600 mt-1 mb-2">
                    本サービスの利用条件、禁止事項、免責事項などが記載されています。
                  </p>
                  <Button
                    onClick={() => window.open('/terms', '_blank')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    利用規約を読む
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacyChecked}
                    onChange={(e) => setPrivacyChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="privacy" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900">プライバシーポリシー</span>
                  </label>
                  <p className="text-sm text-slate-600 mt-1 mb-2">
                    個人情報の取扱い、収集する情報、利用目的などが記載されています。
                  </p>
                  <Button
                    onClick={() => window.open('/privacy', '_blank')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                    size="sm"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    プライバシーポリシーを読む
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAccept}
              disabled={!termsChecked || !privacyChecked || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  処理中...
                </>
              ) : (
                '同意してサービスを利用する'
              )}
            </Button>
            <Button
              onClick={handleLogout}
              disabled={loading}
              className="sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700"
            >
              ログアウト
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            バージョン: 利用規約 {TERMS_VERSION} / プライバシーポリシー {PRIVACY_VERSION}
          </p>
        </div>
      </div>
    </div>
  )
}
