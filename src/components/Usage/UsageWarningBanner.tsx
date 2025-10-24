import React from 'react'
import { AlertTriangle, AlertCircle, Info, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { getUsageState } from '@/services/usageLimits'

interface Props {
  type: 'stores' | 'users' | 'ai'
  current: number
  max: number
  label: string
}

export const UsageWarningBanner: React.FC<Props> = ({ type, current, max, label }) => {
  const navigate = useNavigate()
  const state = getUsageState(current, max)

  if (state === 'safe' || max === 0) return null

  const getConfig = () => {
    switch (state) {
      case 'exceeded':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          message: `${label}の上限（${max}）に達しました`
        }
      case 'critical':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
          message: `${label}が上限（${max}）に近づいています`
        }
      case 'warning':
        return {
          icon: Info,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          message: `${label}の使用量が増えています`
        }
      default:
        return null
    }
  }

  const config = getConfig()
  if (!config) return null

  const Icon = config.icon
  const percentage = Math.min(Math.round((current / max) * 100), 100)

  return (
    <div className={`p-4 ${config.bgColor} border ${config.borderColor} rounded-lg mb-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`font-medium ${config.textColor}`}>{config.message}</p>
          <p className={`text-sm ${config.textColor} mt-1`}>
            現在の使用量: {current} / {max} ({percentage}%)
          </p>
          {state === 'exceeded' && (
            <p className={`text-sm ${config.textColor} mt-2`}>
              プランをアップグレードして、制限を解除してください。
            </p>
          )}
        </div>
        {(state === 'exceeded' || state === 'critical') && (
          <Button
            onClick={() => navigate('/organization?tab=subscription')}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            アップグレード
          </Button>
        )}
      </div>
    </div>
  )
}
