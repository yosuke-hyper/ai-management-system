import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Calendar,
  Store,
  Users,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Crown
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  subscription_status: string
  subscription_plan: string
  trial_ends_at?: string
  max_stores: number
  max_users: number
  max_ai_requests_per_month: number
  created_at?: string
}

interface Props {
  organization: Organization
  onUpdate?: () => void
}

export const SubscriptionInfo: React.FC<Props> = ({ organization, onUpdate }) => {
  const getStatusBadge = () => {
    switch (organization.subscription_status) {
      case 'trial':
        return {
          icon: Calendar,
          label: 'トライアル中',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'active':
        return {
          icon: CheckCircle,
          label: '有効',
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'suspended':
        return {
          icon: AlertTriangle,
          label: '一時停止',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'キャンセル済み',
          color: 'bg-red-100 text-red-800 border-red-200'
        }
      default:
        return {
          icon: AlertTriangle,
          label: '不明',
          color: 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }
  }

  const getPlanLabel = () => {
    switch (organization.subscription_plan) {
      case 'starter':
        return { name: 'Starter', price: '¥3,588/月', originalPrice: '¥5,980/月', discount: '40%OFF' }
      case 'standard':
        return { name: 'Standard', price: '¥5,586/月', originalPrice: '¥7,980/月', discount: '30%OFF' }
      case 'premium':
        return { name: 'Premium', price: '¥11,840/月', originalPrice: '¥14,800/月', discount: '20%OFF' }
      default:
        return { name: organization.subscription_plan, price: '-' }
    }
  }

  const getPlanFeatures = () => {
    return [
      {
        icon: Store,
        label: '最大店舗数',
        value: organization.max_stores === 0 ? '無制限' : `${organization.max_stores}店舗`,
        color: 'text-blue-600'
      },
      {
        icon: Users,
        label: '最大ユーザー数',
        value: organization.max_users === 0 ? '無制限' : `${organization.max_users}名`,
        color: 'text-green-600'
      },
      {
        icon: MessageSquare,
        label: 'AI使用回数/月',
        value:
          organization.max_ai_requests_per_month === 0
            ? '無制限'
            : `${organization.max_ai_requests_per_month}回`,
        color: 'text-orange-600'
      }
    ]
  }

  const statusBadge = getStatusBadge()
  const planInfo = getPlanLabel()
  const features = getPlanFeatures()

  const trialDaysLeft =
    organization.trial_ends_at && organization.subscription_status === 'trial'
      ? Math.ceil(
          (new Date(organization.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>現在のプラン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-6 h-6 text-blue-600" />
                <h3 className="text-2xl font-bold text-slate-900">{planInfo.name}プラン</h3>
                {planInfo.discount && (
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">
                    {planInfo.discount}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {planInfo.originalPrice && (
                  <p className="text-sm text-slate-400 line-through">{planInfo.originalPrice}</p>
                )}
                <p className="text-lg font-bold text-red-600">{planInfo.price}</p>
                {planInfo.discount && (
                  <p className="text-xs text-slate-500">キャンペーン期間: 2025年12月〜2026年5月</p>
                )}
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-full border flex items-center gap-2 ${statusBadge.color}`}
            >
              <statusBadge.icon className="w-4 h-4" />
              <span className="font-medium">{statusBadge.label}</span>
            </div>
          </div>

          {trialDaysLeft !== null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">トライアル期間</p>
                  <p className="text-sm text-blue-700 mt-1">
                    残り<strong className="text-lg mx-1">{trialDaysLeft}</strong>日
                    {trialDaysLeft <= 3 && (
                      <span className="ml-2 text-red-600 font-medium">まもなく終了</span>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    終了日: {new Date(organization.trial_ends_at!).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">プラン内容</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    <span className="text-sm text-slate-600">{feature.label}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{feature.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              プランをアップグレード
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>プラン比較</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-600">
                    機能
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-slate-600">
                    Starter
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-slate-600">
                    Standard
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-slate-600">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">月額料金</td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-xs text-slate-400 line-through">¥5,980</div>
                    <div className="text-sm font-bold text-red-600">¥3,588</div>
                    <div className="text-xs text-red-500">(40%OFF)</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-xs text-slate-400 line-through">¥7,980</div>
                    <div className="text-sm font-bold text-red-600">¥5,586</div>
                    <div className="text-xs text-red-500">(30%OFF)</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-xs text-slate-400 line-through">¥14,800</div>
                    <div className="text-sm font-bold text-red-600">¥11,840</div>
                    <div className="text-xs text-red-500">(20%OFF)</div>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">推奨店舗数</td>
                  <td className="py-3 px-4 text-center text-sm">1店舗</td>
                  <td className="py-3 px-4 text-center text-sm">2〜3店舗</td>
                  <td className="py-3 px-4 text-center text-sm">4店舗以上</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">ユーザー数</td>
                  <td className="py-3 px-4 text-center text-sm">5名</td>
                  <td className="py-3 px-4 text-center text-sm">10名</td>
                  <td className="py-3 px-4 text-center text-sm">20名</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">AI使用回数/月</td>
                  <td className="py-3 px-4 text-center text-sm">50回</td>
                  <td className="py-3 px-4 text-center text-sm">300回</td>
                  <td className="py-3 px-4 text-center text-sm">2,000回</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">AI自動レポート</td>
                  <td className="py-3 px-4 text-center text-sm">月2回</td>
                  <td className="py-3 px-4 text-center text-sm">週1回</td>
                  <td className="py-3 px-4 text-center text-sm">毎日</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-700">データ保持期間</td>
                  <td className="py-3 px-4 text-center text-sm">1年</td>
                  <td className="py-3 px-4 text-center text-sm">3年</td>
                  <td className="py-3 px-4 text-center text-sm">無制限</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-slate-700">サポート</td>
                  <td className="py-3 px-4 text-center text-sm">メール</td>
                  <td className="py-3 px-4 text-center text-sm">優先サポート</td>
                  <td className="py-3 px-4 text-center text-sm">専任担当者</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
