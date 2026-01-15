/**
 * エラー境界コンポーネント
 *
 * Reactコンポーネントツリー内のエラーをキャッチし、
 * フォールバックUIを表示します
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AppError, ErrorType, ErrorSeverity, toAppError } from '@/lib/errors'
import { logError } from '@/services/errorlogger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: AppError | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = toAppError(error)
    return {
      hasError: true,
      error: appError
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = toAppError(error)

    // エラーをログに記録
    logError(appError, {
      context: {
        componentStack: errorInfo.componentStack
      }
    } as any)

    // カスタムエラーハンドラーを実行
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックUIが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl text-slate-900">
                  エラーが発生しました
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  {this.state.error.userMessage}
                </p>
              </div>

              {import.meta.env.DEV && (
                <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <summary className="text-sm font-medium text-slate-700 cursor-pointer">
                    開発者情報
                  </summary>
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="font-medium">エラータイプ:</span>{' '}
                      {this.state.error.type}
                    </div>
                    <div>
                      <span className="font-medium">深刻度:</span>{' '}
                      {this.state.error.severity}
                    </div>
                    <div>
                      <span className="font-medium">メッセージ:</span>{' '}
                      {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre className="mt-2 p-2 bg-white border border-slate-200 rounded overflow-x-auto text-xs">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  再試行
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  ページ再読み込み
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900"
                >
                  <Home className="w-4 h-4 mr-2" />
                  ホームへ
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                問題が解決しない場合は、サポートまでお問い合わせください
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
