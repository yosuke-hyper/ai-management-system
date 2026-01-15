/**
 * グローバルエラー管理コンテキスト
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { AppError, toAppError, shouldShowToUser } from '@/lib/errors'
import { logError } from '@/services/errorlogger'
import { useAuth } from './authcontext'
import { useOrganization } from './organizationcontext'

interface ErrorContextType {
  errors: AppError[]
  addError: (error: unknown) => void
  clearError: (index: number) => void
  clearAllErrors: () => void
  handleError: (error: unknown, context?: Record<string, any>) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([])
  const { user } = useAuth()
  const { organization } = useOrganization()

  const addError = useCallback((error: unknown) => {
    const appError = toAppError(error)

    // ユーザーに表示すべきエラーのみ追加
    if (shouldShowToUser(appError)) {
      setErrors((prev) => [...prev, appError])

      // 10秒後に自動的に削除（ユーザーフレンドリー）
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e !== appError))
      }, 10000)
    }

    // エラーをログに記録（組織IDも含める）
    logError(appError, {
      userId: user?.id,
      organizationId: organization?.id,
    })
  }, [user, organization])

  const clearError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors([])
  }, [])

  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    const appError = toAppError(error)

    // コンテキスト情報を追加
    if (context) {
      appError.context = { ...appError.context, ...context }
    }

    addError(appError)
  }, [addError])

  return (
    <ErrorContext.Provider
      value={{
        errors,
        addError,
        clearError,
        clearAllErrors,
        handleError
      }}
    >
      {children}
    </ErrorContext.Provider>
  )
}

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}
