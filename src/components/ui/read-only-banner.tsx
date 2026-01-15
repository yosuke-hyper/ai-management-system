import { Lock, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '@/contexts/organizationcontext'
import { useAuth } from '@/contexts/authcontext'
import { Button } from './button'

export function ReadOnlyBanner() {
  const navigate = useNavigate()
  const { subscriptionStatus } = useOrganization()
  const { isDemoMode } = useAuth()

  if (isDemoMode || !subscriptionStatus.isReadOnly) return null

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-4 shadow-md border-b-4 border-red-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">
                {subscriptionStatus.isExpired ? 'トライアル期間が終了しました' : 'サブスクリプションが無効です'}
              </h3>
              <p className="text-sm text-red-100">
                現在、読み取り専用モードです。データの閲覧のみ可能で、新規作成・編集・削除はできません。
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard/subscription')}
            variant="outline"
            className="bg-white text-red-600 border-white hover:bg-red-50 font-semibold flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            プランを選択して再開
          </Button>
        </div>
      </div>
    </div>
  )
}
