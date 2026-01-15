import React from 'react'
import { X, Lock, Check, Sparkles } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/authcontext'

interface FeatureLockedModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  featureDescription?: string
}

export function FeatureLockedModal({
  isOpen,
  onClose,
  featureName,
  featureDescription
}: FeatureLockedModalProps) {
  const navigate = useNavigate()
  const { exitDemoMode } = useAuth()

  if (!isOpen) return null

  const handleRegister = () => {
    exitDemoMode()
    navigate('/login', { replace: true })
  }

  const benefits = [
    'データの入力・編集が可能に',
    'スタッフアカウントの作成と管理',
    '月次経費の記録と分析',
    'レポートの作成と共有',
    'AI機能の無制限利用',
    '組織設定のカスタマイズ'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
        <CardHeader className="relative pb-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1.5 shadow-md">
                <Sparkles className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-center">
            {featureName}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm mt-2">
            本登録してご利用ください
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {featureDescription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {featureDescription}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                14日間無料トライアル
              </Badge>
              <span className="text-sm text-muted-foreground">
                クレジットカード不要
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                本登録すると利用できる機能：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 leading-relaxed">
              現在はデモモードで体験中です。実際のデータの入力・編集・管理を行うには本登録が必要です。
              14日間の無料トライアル期間中は全機能を制限なくご利用いただけます。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleRegister}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold h-12 text-base shadow-lg"
            >
              無料で本登録を始める
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="sm:w-32 h-12"
            >
              閉じる
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            登録後すぐに全機能をご利用いただけます
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
