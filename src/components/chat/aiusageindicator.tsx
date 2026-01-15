import React from 'react'
import { AlertCircle, CheckCircle, Clock, Store, TrendingUp, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AIUsageStatus } from '@/hooks/useaiusagelimit'

interface AIUsageIndicatorProps {
  status: AIUsageStatus | null
  loading: boolean
  compact?: boolean
  showStoreIcon?: boolean
}

export const AIUsageIndicator: React.FC<AIUsageIndicatorProps> = ({
  status,
  loading,
  compact = false,
  showStoreIcon = true
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 animate-spin" />
        {!compact && <span>読み込み中...</span>}
      </div>
    )
  }

  if (!status) {
    return null
  }

  const isUnlimited = status.monthlyLimit === -1
  const usagePercent = isUnlimited ? 0 : Math.min(status.percentage, 100)
  const isWarning = usagePercent >= 80 && usagePercent < 100
  const isError = usagePercent >= 100 || status.isLimited

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {showStoreIcon && <Store className="w-3 h-3 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">{status.storeName}</span>
        {isUnlimited ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
            無制限
          </Badge>
        ) : (
          <>
            <Badge
              variant={isError ? 'destructive' : isWarning ? 'outline' : 'secondary'}
              className={
                isError
                  ? ''
                  : isWarning
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                  : 'bg-green-50 text-green-700 border-green-300'
              }
            >
              {status.currentCount}/{status.monthlyLimit}回
            </Badge>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showStoreIcon && (
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="w-4 h-4 text-blue-600" />
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">AI使用状況</div>
            <div className="font-semibold text-foreground">{status.storeName}</div>
          </div>
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">今月の使用</div>
            <div className="text-lg font-bold text-foreground">
              {status.currentCount}<span className="text-sm text-muted-foreground">/{status.monthlyLimit}回</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isUnlimited ? (
          <>
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">無制限プラン</span>
          </>
        ) : isError ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">利用上限到達</span>
          </>
        ) : isWarning ? (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">残りわずか（{status.remaining}回）</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">利用可能（残り{status.remaining}回）</span>
          </>
        )}
      </div>

      {!isUnlimited && (
        <>
          <Progress
            value={usagePercent}
            className={`h-2 ${
              isError
                ? 'bg-red-100 [&>div]:bg-red-500'
                : isWarning
                ? 'bg-yellow-100 [&>div]:bg-yellow-500'
                : 'bg-green-100 [&>div]:bg-green-500'
            }`}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isError
                ? '来月リセットされます'
                : `残り${status.remaining}回利用可能`}
            </span>
            <span className="text-xs text-muted-foreground">
              今月の使用状況
            </span>
          </div>
        </>
      )}

      {isError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          この店舗の月間利用上限に達しました。管理者にお問い合わせいただくか、来月までお待ちください。
        </div>
      )}

      {isWarning && !isError && status.remaining <= 10 && (
        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
          残り{status.remaining}回です。計画的にご利用ください。
        </div>
      )}
    </div>
  )
}
