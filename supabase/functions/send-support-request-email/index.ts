import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from 'npm:nodemailer@6.9.7';

interface SupportRequestEmailRequest {
  email: string;
  subject: string;
  category: string;
  message: string;
  userName?: string;
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 3600000 });
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL');
    const smtpFromName = Deno.env.get('SMTP_FROM_NAME') || 'FoodValue AI';

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
      throw new Error('SMTP configuration is incomplete. Please set all required environment variables.');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });

    const mailOptions = {
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('SMTP送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'メール送信中にエラーが発生しました',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, subject, category, message, userName }: SupportRequestEmailRequest = await req.json();

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: '無効なメールアドレスです' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'リクエスト数が上限に達しました。1時間後に再度お試しください。' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedSubject = sanitizeInput(subject, 200);
    const sanitizedMessage = sanitizeInput(message, 5000);
    const sanitizedUserName = userName ? sanitizeInput(userName, 100) : undefined;

    if (!sanitizedSubject || !sanitizedMessage) {
      return new Response(
        JSON.stringify({ success: false, error: '件名とメッセージは必須です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryLabels: Record<string, string> = {
      general: '一般的な質問',
      technical: '技術的な問題',
      billing: '料金・プラン',
      feature: '機能リクエスト',
      bug: 'バグ報告'
    };

    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .info-box {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-weight: 500;
      width: 120px;
      flex-shrink: 0;
    }
    .info-value {
      color: #111827;
      flex: 1;
    }
    .message-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 14px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .header, .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🆘 新しいお問い合わせ</h1>
      <p>FoodValue AI Management System</p>
    </div>

    <div class="content">
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">送信者</span>
          <span class="info-value">${sanitizedUserName || '未登録ユーザー'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">メールアドレス</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">カテゴリ</span>
          <span class="info-value">${categoryLabels[category] || category}</span>
        </div>
        <div class="info-row">
          <span class="info-label">件名</span>
          <span class="info-value">${sanitizedSubject}</span>
        </div>
      </div>

      <h3 style="color: #111827; margin-top: 30px; margin-bottom: 10px;">お問い合わせ内容：</h3>
      <div class="message-box">
        ${sanitizedMessage}
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        このお問い合わせには1-2営業日以内にご返信ください。
      </p>
    </div>

    <div class="footer">
      <p><strong>FoodValue AI Management System</strong></p>
      <p>自動送信メール - サポートリクエスト通知</p>
    </div>
  </div>
</body>
</html>
    `;

    const userConfirmationEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #111827;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 14px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .header, .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ お問い合わせを受け付けました</h1>
      <p>FoodValue AI Management System</p>
    </div>

    <div class="content">
      <div class="greeting">
        お問い合わせありがとうございます
      </div>

      <div class="message">
        お問い合わせの内容を受け付けました。担当者が内容を確認の上、1-2営業日以内にご連絡いたします。
      </div>

      <div class="info-box">
        <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>お問い合わせ件名：</strong></p>
        <p style="margin: 8px 0 0 0; color: #111827;">${sanitizedSubject}</p>
      </div>

      <div class="message" style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        しばらくお待ちいただいてもご返信がない場合は、お手数ですが再度お問い合わせください。
      </div>
    </div>

    <div class="footer">
      <p><strong>FoodValue AI Management System</strong></p>
      <p>飲食店経営を AI でサポート</p>
      <p style="margin-top: 15px;">営業時間：平日 9:00-17:00 / 土祝 9:00-15:00（日曜定休）</p>
      <p style="font-size: 12px; margin-top: 10px;">お問い合わせ：info@smartfoodlocker.tech</p>
    </div>
  </div>
</body>
</html>
    `;

    const adminResult = await sendEmail('info@smartfoodlocker.tech', `【お問い合わせ】${categoryLabels[category]} - ${sanitizedSubject}`, adminEmailHtml);

    if (!adminResult.success) {
      throw new Error(adminResult.error || '管理者メール送信に失敗しました');
    }

    const userResult = await sendEmail(email, '【自動返信】お問い合わせを受け付けました', userConfirmationEmailHtml);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: adminResult.messageId,
        confirmationSent: userResult.success,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending support request email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'メール送信中にエラーが発生しました'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});