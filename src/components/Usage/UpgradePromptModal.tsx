import React from 'react'
import { Button } from '@/components/ui/button'
import { X, Crown, Check, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  type: 'stores' | 'users' | 'ai'
  currentLimit: number
  onClose: () => void
}

export const UpgradePromptModal: React.FC<Props> = ({ type, currentLimit, onClose }) => {
  const navigate = useNavigate()

  const getContent = () => {
    switch (type) {
      case 'stores':
        return {
          title: '店舗数の上限に達しました',
          description: `現在のプランでは${currentLimit}店舗まで登録できます。`,
          features: [
            'より多くの店舗を管理',
            '店舗間の詳細な比較分析',
            'マルチストア運営の効率化',
            '統合レポート機能'
          ]
        }
      case 'users':
        return {
          title: 'ユーザー数の上限に達しました',
          description: `現在のプランでは${currentLimit}名まで招待できます。`,
          features: [
            'より多くのスタッフを追加',
            'チーム全体での情報共有',
            '権限管理の柔軟性向上',
            '組織全体の可視化'
          ]
        }
      case 'ai':
        return {
          title: 'AI使用回数の上限に達しました',
          description: `現在のプランでは月${currentLimit}回までAI機能を使用できます。`,
          features: [
            'より多くのAI分析',
            '高度な経営洞察',
            '24時間いつでも質問可能',
            '精度の高い予測分析'
          ]
        }
    }
  }

  const content = getContent()

  const plans = [
    {
      name: 'Starter',
      price: '¥9,800/月',
      stores: 3,
      users: 5,
      ai: 100,
      popular: false
    },
    {
      name: 'Business',
      price: '¥29,800/月',
      stores: 10,
      users: 20,
      ai: 500,
      popular: true
    },
    {
      name: 'Enterprise',
      price: '要相談',
      stores: '無制限',
      users: '無制限',
      ai: '無制限',
      popular: false
    }
  ]

  const handleUpgrade = () => {
    navigate('/organization?tab=subscription')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
              <p className="text-sm text-slate-600">{content.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              アップグレードで利用可能になる機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">プランを選択</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative border-2 rounded-lg p-6 ${
                    plan.popular
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                        おすすめ
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h4>
                    <p className="text-2xl font-bold text-blue-600">{plan.price}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 mb-6">
                    <p>店舗: {plan.stores}</p>
                    <p>ユーザー: {plan.users}</p>
                    <p>AI使用: {plan.ai}回/月</p>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {plan.popular ? (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        今すぐアップグレード
                      </>
                    ) : (
                      '詳細を見る'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 text-center">
              プランの詳細やカスタマイズについては、サブスクリプションページでご確認ください
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
