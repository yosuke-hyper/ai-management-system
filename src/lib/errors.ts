/**
 * 統一されたエラーハンドリングシステム
 *
 * このモジュールは、アプリケーション全体で一貫したエラー処理を提供します。
 */

/**
 * エラーの種類
 */
export enum ErrorType {
  // 認証関連
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // データベース関連
  DATABASE = 'DATABASE',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  // バリデーション関連
  VALIDATION = 'VALIDATION',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // ビジネスロジック関連
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',

  // ネットワーク関連
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 外部サービス関連
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  AI_SERVICE = 'AI_SERVICE',
  PAYMENT_SERVICE = 'PAYMENT_SERVICE',

  // その他
  UNKNOWN = 'UNKNOWN',
  INTERNAL = 'INTERNAL',
}

/**
 * エラーの深刻度
 */
export enum ErrorSeverity {
  LOW = 'LOW',          // ユーザー操作で回復可能
  MEDIUM = 'MEDIUM',    // 一部機能に影響
  HIGH = 'HIGH',        // 重要機能に影響
  CRITICAL = 'CRITICAL' // システム全体に影響
}

/**
 * アプリケーションエラーの基底クラス
 */
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly isOperational: boolean
  public readonly timestamp: Date
  public readonly context?: Record<string, any>
  public readonly userMessage: string

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      isOperational?: boolean
      context?: Record<string, any>
      userMessage?: string
    }
  ) {
    super(message)

    this.name = this.constructor.name
    this.type = type
    this.severity = severity
    this.isOperational = options?.isOperational ?? true
    this.timestamp = new Date()
    this.context = options?.context
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type)

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.AUTHENTICATION]: 'ログインが必要です',
      [ErrorType.AUTHORIZATION]: 'この操作を行う権限がありません',
      [ErrorType.SESSION_EXPIRED]: 'セッションが期限切れです。再度ログインしてください',
      [ErrorType.DATABASE]: 'データベースエラーが発生しました',
      [ErrorType.NOT_FOUND]: '指定されたデータが見つかりません',
      [ErrorType.DUPLICATE]: 'すでに存在するデータです',
      [ErrorType.CONSTRAINT_VIOLATION]: 'データの整合性エラーが発生しました',
      [ErrorType.VALIDATION]: '入力内容を確認してください',
      [ErrorType.INVALID_INPUT]: '入力内容が正しくありません',
      [ErrorType.MISSING_REQUIRED_FIELD]: '必須項目が入力されていません',
      [ErrorType.BUSINESS_LOGIC]: '処理を完了できませんでした',
      [ErrorType.INSUFFICIENT_PERMISSIONS]: 'この機能を利用する権限がありません',
      [ErrorType.QUOTA_EXCEEDED]: '利用上限に達しました',
      [ErrorType.SUBSCRIPTION_REQUIRED]: 'この機能を利用するにはプランのアップグレードが必要です',
      [ErrorType.NETWORK]: 'ネットワークエラーが発生しました',
      [ErrorType.TIMEOUT]: '処理がタイムアウトしました',
      [ErrorType.SERVICE_UNAVAILABLE]: 'サービスが一時的に利用できません',
      [ErrorType.EXTERNAL_SERVICE]: '外部サービスとの連携でエラーが発生しました',
      [ErrorType.AI_SERVICE]: 'AI機能でエラーが発生しました',
      [ErrorType.PAYMENT_SERVICE]: '決済処理でエラーが発生しました',
      [ErrorType.UNKNOWN]: '予期しないエラーが発生しました',
      [ErrorType.INTERNAL]: 'システムエラーが発生しました',
    }

    return messages[type] || 'エラーが発生しました'
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    }
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '認証に失敗しました', context?: Record<string, any>) {
    super(message, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, {
      isOperational: true,
      context,
      userMessage: 'ログインが必要です。再度ログインしてください'
    })
  }
}

/**
 * 認可エラー
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '権限がありません', context?: Record<string, any>) {
    super(message, ErrorType.AUTHORIZATION, ErrorSeverity.MEDIUM, {
      isOperational: true,
      context,
      userMessage: 'この操作を行う権限がありません'
    })
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>

  constructor(
    message: string = '入力内容が正しくありません',
    fields?: Record<string, string>,
    context?: Record<string, any>
  ) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, {
      isOperational: true,
      context: { ...context, fields },
      userMessage: '入力内容を確認してください'
    })
    this.fields = fields
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.DATABASE, ErrorSeverity.HIGH, {
      isOperational: false,
      context,
      userMessage: 'データベースエラーが発生しました。しばらく経ってから再度お試しください'
    })
  }
}

/**
 * データが見つからないエラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, context?: Record<string, any>) {
    const message = id ? `${resource} (ID: ${id}) が見つかりません` : `${resource}が見つかりません`
    super(message, ErrorType.NOT_FOUND, ErrorSeverity.LOW, {
      isOperational: true,
      context: { ...context, resource, id },
      userMessage: '指定されたデータが見つかりません'
    })
  }
}

/**
 * ビジネスロジックエラー
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, userMessage?: string, context?: Record<string, any>) {
    super(message, ErrorType.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, {
      isOperational: true,
      context,
      userMessage: userMessage || '処理を完了できませんでした'
    })
  }
}

/**
 * 利用上限超過エラー
 */
export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number, current: number, context?: Record<string, any>) {
    super(
      `${resource}の上限(${limit})に達しました (現在: ${current})`,
      ErrorType.QUOTA_EXCEEDED,
      ErrorSeverity.MEDIUM,
      {
        isOperational: true,
        context: { ...context, resource, limit, current },
        userMessage: `${resource}の利用上限に達しました。プランのアップグレードをご検討ください`
      }
    )
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  constructor(message: string = 'ネットワークエラー', context?: Record<string, any>) {
    super(message, ErrorType.NETWORK, ErrorSeverity.MEDIUM, {
      isOperational: true,
      context,
      userMessage: 'ネットワークエラーが発生しました。接続を確認してください'
    })
  }
}

/**
 * 外部サービスエラー
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      `${service}: ${message}`,
      ErrorType.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      {
        isOperational: true,
        context: { ...context, service },
        userMessage: `外部サービス(${service})との連携でエラーが発生しました`
      }
    )
  }
}

/**
 * エラーがAppErrorのインスタンスかどうかを判定
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * エラーを適切なAppErrorに変換
 */
export function toAppError(error: unknown): AppError {
  // すでにAppErrorの場合はそのまま返す
  if (isAppError(error)) {
    return error
  }

  // 標準Errorの場合
  if (error instanceof Error) {
    // Supabaseエラーの処理
    if ('code' in error) {
      return handleSupabaseError(error as any)
    }

    return new AppError(
      error.message,
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      {
        isOperational: false,
        context: { originalError: error.name }
      }
    )
  }

  // その他の場合
  return new AppError(
    String(error),
    ErrorType.UNKNOWN,
    ErrorSeverity.MEDIUM,
    {
      isOperational: false
    }
  )
}

/**
 * Supabaseエラーを処理
 */
function handleSupabaseError(error: any): AppError {
  const code = error.code
  const message = error.message || 'データベースエラー'

  // 認証エラー
  if (code === 'PGRST301' || code === '401') {
    return new AuthenticationError(message)
  }

  // 認可エラー
  if (code === 'PGRST301' || code === '403' || message.includes('permission')) {
    return new AuthorizationError(message)
  }

  // 重複エラー
  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    return new AppError(
      message,
      ErrorType.DUPLICATE,
      ErrorSeverity.LOW,
      {
        isOperational: true,
        userMessage: 'すでに登録されているデータです'
      }
    )
  }

  // 外部キー制約違反
  if (code === '23503') {
    return new AppError(
      message,
      ErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      {
        isOperational: true,
        userMessage: '関連するデータが存在しないため、処理できません'
      }
    )
  }

  // データが見つからない
  if (code === 'PGRST116' || message.includes('not found')) {
    return new NotFoundError('データ', undefined, { originalMessage: message })
  }

  // その他のデータベースエラー
  return new DatabaseError(message, { code })
}

/**
 * エラーをログに記録すべきかどうか
 */
export function shouldLogError(error: AppError): boolean {
  // 運用上のエラーで低い深刻度のものはログに記録しない
  if (error.isOperational && error.severity === ErrorSeverity.LOW) {
    return false
  }

  return true
}

/**
 * エラーをユーザーに表示すべきかどうか
 */
export function shouldShowToUser(error: AppError): boolean {
  // 運用上のエラーは常にユーザーに表示
  return error.isOperational
}

/**
 * リトライ可能なエラーかどうか
 */
export function isRetryable(error: AppError): boolean {
  const retryableTypes = [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.EXTERNAL_SERVICE
  ]

  return retryableTypes.includes(error.type)
}
