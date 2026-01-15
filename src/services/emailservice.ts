import { supabase } from '@/lib/supabase';

/**
 * メール送信サービス
 * Supabase Edge Functionsを通じてResendでメールを送信
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SendReportEmailParams {
  reportId: string;
  recipientEmail: string;
}

interface SendInvitationEmailParams {
  email: string;
  inviterName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  isDemoMode?: boolean;
  message?: string;
  error?: string;
}

/**
 * AIレポート完成通知メールを送信
 */
export async function sendReportEmail(params: SendReportEmailParams): Promise<EmailResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('認証されていません');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-report-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'メール送信に失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('レポートメール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました'
    };
  }
}

/**
 * メンバー招待メールを送信
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<EmailResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('認証されていません');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-invitation-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'メール送信に失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('招待メール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました'
    };
  }
}

/**
 * トライアル期限通知メールを送信
 * （将来的な拡張用）
 */
export async function sendTrialExpiringEmail(
  email: string,
  daysRemaining: number,
  organizationName: string
): Promise<EmailResponse> {
  // TODO: 専用のEdge Functionを作成
  // 現在はnotificationServiceで内部通知として実装
  console.log('トライアル期限通知（メール未実装）:', { email, daysRemaining, organizationName });
  return {
    success: true,
    isDemoMode: true,
    message: 'トライアル期限通知は内部通知システムで配信されます'
  };
}

/**
 * AI使用量アラートメールを送信
 * （将来的な拡張用）
 */
export async function sendAIUsageAlertEmail(
  email: string,
  percentage: number,
  organizationName: string
): Promise<EmailResponse> {
  // TODO: 専用のEdge Functionを作成
  console.log('AI使用量アラート（メール未実装）:', { email, percentage, organizationName });
  return {
    success: true,
    isDemoMode: true,
    message: 'AI使用量アラートは内部通知システムで配信されます'
  };
}

/**
 * パスワードリセットメールを送信
 * Supabase Authの機能を使用
 */
export async function sendPasswordResetEmail(email: string): Promise<EmailResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password-confirm`,
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'パスワードリセット用のメールを送信しました'
    };
  } catch (error) {
    console.error('パスワードリセットメール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信に失敗しました'
    };
  }
}

export const emailService = {
  sendReportEmail,
  sendInvitationEmail,
  sendTrialExpiringEmail,
  sendAIUsageAlertEmail,
  sendPasswordResetEmail,
};
