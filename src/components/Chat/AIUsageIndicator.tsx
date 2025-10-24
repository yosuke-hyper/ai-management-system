import React from 'react'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AIUsageStatus } from '@/hooks/useAIUsageLimit'

interface AIUsageIndicatorProps {
  status: AIUsageStatus | null
  loading: boolean
  compact?: boolean
}

export const AIUsageIndicator: React.FC<AIUsageIndicatorProps> = ({
  status,
  loading,
  compact = false
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

  const isUnlimited = status.dailyLimit === -1
  const usagePercent = isUnlimited ? 0 : Math.min((status.currentCount / status.dailyLimit) * 100, 100)
  const isWarning = usagePercent >= 80 && usagePercent < 100
  const isError = usagePercent >= 100 || status.isLimited

  const getTimeUntilReset = () => {
    const now = new Date()
    const resetTime = new Date(status.resetAt)
    const diff = resetTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}時間${minutes}分後`
    }
    return `${minutes}分後`
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
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
              {status.currentCount}/{status.dailyLimit}回
            </Badge>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUnlimited ? (
            <>
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">AI利用: 無制限</span>
            </>
          ) : isError ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">利用上限到達</span>
            </>
          ) : isWarning ? (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">残りわずか</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">利用可能</span>
            </>
          )}
        </div>
        {!isUnlimited && (
          <span className="text-sm font-medium text-foreground">
            {status.remaining}回 / {status.dailyLimit}回
          </span>
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
                ? '明日リセットされます'
                : `残り${status.remaining}回利用可能`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeUntilReset()}にリセット
            </span>
          </div>
        </>
      )}

      {isError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          本日の利用上限に達しました。基本的なデータ分析機能は引き続きご利用いただけます。
        </div>
      )}

      {isWarning && !isError && status.remaining <= 2 && (
        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
          残り{status.remaining}回です。計画的にご利用ください。
        </div>
      )}
    </div>
  )
}
