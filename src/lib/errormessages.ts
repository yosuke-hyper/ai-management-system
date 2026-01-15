/**
 * Supabaseエラーメッセージを日本語化
 */

export function translateSupabaseError(error: any): string {
  if (!error) return '不明なエラーが発生しました'

  const message = error.message || error.toString()

  // Authエラー
  if (message.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません'
  }
  if (message.includes('Email not confirmed')) {
    return 'メールアドレスが確認されていません。確認メールをご確認ください'
  }
  if (message.includes('User already registered')) {
    return 'このメールアドレスは既に登録されています'
  }
  if (message.includes('Password should be at least')) {
    return 'パスワードは8文字以上で設定してください'
  }
  if (message.includes('Unable to validate email address')) {
    return '有効なメールアドレスを入力してください'
  }

  // RLSエラー
  if (message.includes('row-level security') || message.includes('RLS') || message.includes('policy')) {
    return 'この操作を実行する権限がありません。管理者に店舗割当をご確認ください'
  }

  // ネットワークエラー
  if (message.includes('Failed to fetch') || message.includes('Network')) {
    return 'ネットワークエラーが発生しました。接続を確認してください'
  }

  // 外部キー制約
  if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
    return '関連するデータが存在しないため、この操作を実行できません'
  }

  // ユニーク制約
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return 'この値は既に登録されています'
  }

  // NOT NULL制約
  if (message.includes('null value') || message.includes('violates not-null')) {
    return '必須項目が入力されていません'
  }

  // その他のデータベースエラー
  if (message.includes('syntax error') || message.includes('invalid input')) {
    return '入力内容に誤りがあります'
  }

  // デフォルト
  return message
}

/**
 * OpenAI APIエラーメッセージを日本語化
 */
export function translateOpenAIError(status: number, message?: string): string {
  switch (status) {
    case 401:
      return 'OpenAI APIキーが無効です。管理者に連絡してください'
    case 429:
      return 'API利用制限に達しました。しばらく待ってから再試行してください'
    case 500:
    case 502:
    case 503:
      return 'OpenAI APIサーバーでエラーが発生しました。時間をおいて再試行してください'
    default:
      return message || 'ChatGPT APIでエラーが発生しました'
  }
}

/**
 * 汎用エラーメッセージ取得
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    // Supabaseエラー
    if ('message' in error) {
      return translateSupabaseError(error)
    }

    // PostgrestError
    if ('code' in error && 'details' in error) {
      return translateSupabaseError(error)
    }
  }

  return '予期しないエラーが発生しました'
}
