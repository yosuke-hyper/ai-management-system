/**
 * エラー通知コンポーネント
 *
 * 画面上部にトースト形式でエラーを表示
 */

import React from 'react'
import { AppError, ErrorSeverity } from '@/lib/errors'
import { useError } from '@/contexts/errorcontext'
import { X, AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react'

export const ErrorNotification: React.FC = () => {
  const { errors, clearError } = useError()

  if (errors.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error, index) => (
        <ErrorItem
          key={`${error.timestamp.getTime()}-${index}`}
          error={error}
          onDismiss={() => clearError(index)}
        />
      ))}
    </div>
  )
}

interface ErrorItemProps {
  error: AppError
  onDismiss: () => void
}

const ErrorItem: React.FC<ErrorItemProps> = ({ error, onDismiss }) => {
  const getColorClasses = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-900',
          iconComponent: XCircle
        }
      case ErrorSeverity.MEDIUM:
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          text: 'text-orange-900',
          iconComponent: AlertTriangle
        }
      case ErrorSeverity.LOW:
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-900',
          iconComponent: AlertCircle
        }
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-900',
          iconComponent: Info
        }
    }
  }

  const colors = getColorClasses(error.severity)
  const Icon = colors.iconComponent

  return (
    <div
      className={`${colors.bg} border rounded-lg shadow-lg p-4 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text}`}>
            {error.userMessage}
          </p>

          {import.meta.env.DEV && error.message !== error.userMessage && (
            <p className="text-xs text-slate-600 mt-1 font-mono">
              {error.message}
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className={`flex-shrink-0 ${colors.icon} hover:opacity-70 transition-opacity`}
          aria-label="エラーを閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// アニメーション用のCSS（index.cssに追加する必要があります）
export const errorNotificationStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`
