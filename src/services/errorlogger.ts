/**
 * エラーロギングサービス（Edge Functions版）
 *
 * エラーを記録し、適切に処理するためのサービス
 * Edge Functions経由でセキュアにエラーログを送信
 */

import { AppError, ErrorSeverity, shouldLogError } from '@/lib/errors'

export interface ErrorLog {
  id?: string
  error_type: string
  error_message: string
  severity: ErrorSeverity
  user_id?: string
  organization_id?: string
  stack_trace?: string
  context?: Record<string, any>
  user_agent?: string
  url?: string
  timestamp: string
}

// Edge Function のエンドポイント
const LOG_ERROR_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-error`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * エラーをログに記録（Edge Functions経由）
 */
export async function logError(
  error: AppError,
  additionalContext?: {
    userId?: string
    organizationId?: string
  }
): Promise<void> {
  // ログに記録すべきかチェック
  if (!shouldLogError(error)) {
    return
  }

  // コンソールに出力
  if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
    console.error('[ERROR]', error.toJSON())
  } else {
    console.warn('[WARNING]', error.toJSON())
  }

  // Edge Functionsに送信するペイロード
  const payload = {
    error_type: error.type,
    error_message: error.message,
    severity: error.severity,
    stack_trace: error.stack,
    context: {
      ...error.context,
      userMessage: error.userMessage,
      isOperational: error.isOperational
    },
    user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    organization_id: additionalContext?.organizationId,
    user_id: additionalContext?.userId,
    created_at: new Date().toISOString()
  }

  // 1. まず sendBeacon を試す（ブラウザクローズ時にも送信できる）
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json'
      })

      const beaconUrl = new URL(LOG_ERROR_FUNCTION_URL)
      beaconUrl.searchParams.set('apikey', SUPABASE_ANON_KEY)

      const ok = navigator.sendBeacon(beaconUrl.toString(), blob)
      if (ok) {
        console.log('[logError] Sent via sendBeacon')
        return
      }
    } catch (e) {
      console.warn('[logError] sendBeacon failed, fallback to fetch', e)
    }
  }

  // 2. sendBeacon が失敗したら fetch で送信
  try {
    const response = await fetch(LOG_ERROR_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload),
      credentials: 'omit', // CORS エラーを防ぐため、認証情報を送信しない
      keepalive: true // ページクローズ中も送信を試みる
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('[logError] fetch failed', response.status, errorText)

      // フォールバック: localStorage にキューイング（オフライン対応）
      queueErrorForRetry(payload)
    } else {
      const result = await response.json()
      console.log('[logError] Successfully sent via fetch', result)
    }
  } catch (e) {
    console.error('[logError] network error', e)

    // ネットワークエラー時もキューイング
    queueErrorForRetry(payload)
  }
}

/**
 * エラーをキューに保存（オフライン対応）
 */
function queueErrorForRetry(payload: any): void {
  try {
    const queue = JSON.parse(localStorage.getItem('error_queue') || '[]')
    queue.push({
      payload,
      timestamp: Date.now()
    })

    // 最大100件まで保持
    const trimmedQueue = queue.slice(-100)
    localStorage.setItem('error_queue', JSON.stringify(trimmedQueue))

    console.log('[logError] Queued for retry', trimmedQueue.length)
  } catch (e) {
    console.error('[logError] Failed to queue error', e)
  }
}

/**
 * キューに溜まったエラーを再送信
 */
export async function retryQueuedErrors(): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem('error_queue') || '[]')

    if (queue.length === 0) {
      return
    }

    console.log(`[logError] Retrying ${queue.length} queued errors`)

    const payloads = queue.map((item: any) => item.payload)

    // バッチで送信
    const response = await fetch(LOG_ERROR_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payloads),
      credentials: 'omit' // CORS エラーを防ぐ
    })

    if (response.ok) {
      // 成功したらキューをクリア
      localStorage.removeItem('error_queue')
      console.log('[logError] Successfully sent queued errors')
    } else {
      console.warn('[logError] Failed to send queued errors', response.status)
    }
  } catch (e) {
    console.error('[logError] Failed to retry queued errors', e)
  }
}

// ページ読み込み時にキューを再送信
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      retryQueuedErrors()
    }, 2000) // 2秒後に実行（メイン処理の後）
  })
}

/**
 * エラーを監査ログに記録
 */
export async function logErrorToAudit(
  error: AppError,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<void> {
  try {
    // 監査ログに記録
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (member?.organization_id) {
      await supabase.from('audit_logs').insert({
        organization_id: member.organization_id,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        status: 'failure',
        error_message: error.userMessage,
        details: {
          errorType: error.type,
          severity: error.severity,
          context: error.context
        }
      })
    }
  } catch (loggingError) {
    console.error('[AUDIT LOGGING ERROR]', loggingError)
  }
}

/**
 * パフォーマンスメトリクスを記録
 */
export function logPerformanceMetric(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  if (duration > 1000) {
    console.warn(`[SLOW OPERATION] ${operation} took ${duration}ms`, metadata)
  }
}

/**
 * エラーを外部サービスに送信（Sentry等）
 */
export async function reportErrorToExternalService(error: AppError): Promise<void> {
  // 本番環境でのみ実行
  if (import.meta.env.PROD && error.severity >= ErrorSeverity.HIGH) {
    try {
      // Sentry等の外部サービスに送信
      // if (window.Sentry) {
      //   window.Sentry.captureException(error)
      // }
    } catch (reportError) {
      console.error('[EXTERNAL REPORTING ERROR]', reportError)
    }
  }
}
