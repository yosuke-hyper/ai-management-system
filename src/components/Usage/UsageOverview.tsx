import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Users, MessageSquare, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { getUsagePercentage, getUsageState } from '@/services/usageLimits'

export const UsageOverview: React.FC = () => {
  const navigate = useNavigate()
  const { status, loading } = useUsageLimits()

  if (loading || !status) {
    return null
  }

  const items = [
    {
      icon: Store,
      label: '店舗数',
      current: status.current.storeCount,
      max: status.limits.maxStores,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Users,
      label: 'ユーザー数',
      current: status.current.userCount,
      max: status.limits.maxUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: MessageSquare,
      label: 'AI使用回数/月',
      current: status.current.aiRequestCount,
      max: status.limits.maxAIRequestsPerMonth,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  const hasWarning = items.some(item => {
    const state = getUsageState(item.current, item.max)
    return state === 'warning' || state === 'critical' || state === 'exceeded'
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>使用状況</CardTitle>
          {hasWarning && (
            <Button
              onClick={() => navigate('/organization?tab=subscription')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              プランをアップグレード
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => {
            const Icon = item.icon
            const percentage = getUsagePercentage(item.current, item.max)
            const state = getUsageState(item.current, item.max)
            const isUnlimited = item.max === 0

            const getBarColor = () => {
              if (isUnlimited) return 'bg-slate-300'
              switch (state) {
                case 'exceeded':
                  return 'bg-red-500'
                case 'critical':
                  return 'bg-orange-500'
                case 'warning':
                  return 'bg-yellow-500'
                default:
                  return 'bg-green-500'
              }
            }

            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${item.bgColor} rounded-lg`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {item.current} / {isUnlimited ? '無制限' : item.max}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getBarColor()}`}
                    style={{ width: `${isUnlimited ? 10 : percentage}%` }}
                  ></div>
                </div>
                {state === 'exceeded' && (
                  <p className="text-xs text-red-600 mt-1">上限に達しています</p>
                )}
                {state === 'critical' && (
                  <p className="text-xs text-orange-600 mt-1">まもなく上限に達します</p>
                )}
                {state === 'warning' && (
                  <p className="text-xs text-yellow-600 mt-1">使用量が増えています</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
