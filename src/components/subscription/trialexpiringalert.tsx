import { useState, useEffect } from 'react'
import { AlertCircle, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '@/contexts/organizationcontext'
import { useAuth } from '@/contexts/authcontext'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

export function TrialExpiringAlert() {
  const navigate = useNavigate()
  const { subscriptionStatus } = useOrganization()
  const { isDemoMode } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    if (isDemoMode || !subscriptionStatus.shouldAlert || dismissed) {
      setShowAlert(false)
      return
    }

    const hasSeenAlert = localStorage.getItem('trial-alert-seen')
    const lastSeenDate = hasSeenAlert ? new Date(hasSeenAlert) : null
    const now = new Date()

    if (!lastSeenDate || now.getTime() - lastSeenDate.getTime() > 24 * 60 * 60 * 1000) {
      setShowAlert(true)
    }
  }, [isDemoMode, subscriptionStatus.shouldAlert, dismissed])

  const handleDismiss = () => {
    setDismissed(true)
    setShowAlert(false)
    localStorage.setItem('trial-alert-seen', new Date().toISOString())
  }

  const handleSelectPlan = () => {
    handleDismiss()
    navigate('/dashboard/subscription')
  }

  if (!showAlert) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="relative p-8">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                トライアル期間が残りわずかです
              </h2>
              <div className="flex items-center gap-2 text-orange-600 mb-4">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-semibold">
                  残り {subscriptionStatus.daysLeft} 日
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>14日間の無料トライアル</strong>をご利用いただき、ありがとうございます。<br />
              引き続きサービスをご利用いただくには、プランの選択が必要です。
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900">このまま使い続けるには</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">①</span>
                <span>お客様に最適なプランを選択してください（月額3,980円〜）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">②</span>
                <span>すべてのデータは保持されたまま、継続してご利用いただけます</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">③</span>
                <span>年額プランなら10%割引でさらにお得です</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-900">
                <strong>トライアル期間終了後：</strong><br />
                データは保持されますが、新規データの入力ができなくなります。<br />
                引き続きご利用いただくには、期間内にプランを選択してください。
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSelectPlan}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 text-base"
            >
              プランを選択する
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="px-6"
            >
              後で
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            このアラートは24時間後に再度表示されます
          </p>
        </div>
      </Card>
    </div>
  )
}
