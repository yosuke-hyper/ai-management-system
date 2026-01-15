import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import nodemailer from 'npm:nodemailer@6.9.7';

interface EmailRequest {
  reportId: string;
  recipientEmail: string;
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: '認証が必要です' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: '認証に失敗しました' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ success: false, error: '権限がありません。マネージャー以上のみレポートを送信できます' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reportId, recipientEmail }: EmailRequest = await req.json();

    const { data: report, error: reportError } = await supabase
      .from('ai_generated_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ success: false, error: 'レポートが見つかりません' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: store } = report.store_id
      ? await supabase.from('stores').select('name').eq('id', report.store_id).single()
      : null;

    const storeName = store?.name || '全店舗';
    const metrics = report.metrics || {};

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-weight: 500; }
    .metric-value { font-weight: 600; color: #111827; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .insight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 8px 0; border-radius: 4px; }
    .recommendation { background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin: 8px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${report.title}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">
        期間: ${report.period_start} 〜 ${report.period_end}<br>
        対象: ${storeName}
      </p>
    </div>

    <div class="content">
      <div class="section">
        <h2 style="margin-top: 0; color: #111827; font-size: 18px;">📝 エグゼクティブサマリー</h2>
        <p style="color: #4b5563;">${report.summary || 'サマリーなし'}</p>
      </div>

      <div class="section">
        <h2 style="margin-top: 0; color: #111827; font-size: 18px;">📈 主要指標</h2>
        <div class="metric">
          <span class="metric-label">総売上</span>
          <span class="metric-value">¥${(metrics.totalSales || 0).toLocaleString('ja-JP')}</span>
        </div>
        <div class="metric">
          <span class="metric-label">総経費</span>
          <span class="metric-value">¥${(metrics.totalExpenses || 0).toLocaleString('ja-JP')}</span>
        </div>
        <div class="metric">
          <span class="metric-label">粗利益</span>
          <span class="metric-value">¥${(metrics.grossProfit || 0).toLocaleString('ja-JP')}</span>
        </div>
        <div class="metric">
          <span class="metric-label">営業利益</span>
          <span class="metric-value ${(metrics.operatingProfit || 0) >= 0 ? 'positive' : 'negative'}">
            ¥${(metrics.operatingProfit || 0).toLocaleString('ja-JP')}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">利益率</span>
          <span class="metric-value ${(metrics.profitMargin || 0) >= 0 ? 'positive' : 'negative'}">
            ${(metrics.profitMargin || 0).toFixed(1)}%
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">原価率</span>
          <span class="metric-value">${(metrics.costRate || 0).toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">人件費率</span>
          <span class="metric-value">${(metrics.laborRate || 0).toFixed(1)}%</span>
        </div>
      </div>

      ${report.key_insights && report.key_insights.length > 0 ? `
      <div class="section">
        <h2 style="margin-top: 0; color: #111827; font-size: 18px;">💡 重要な発見</h2>
        ${report.key_insights.map((insight: string) => `<div class="insight">${insight}</div>`).join('')}
      </div>
      ` : ''}

      ${report.recommendations && report.recommendations.length > 0 ? `
      <div class="section">
        <h2 style="margin-top: 0; color: #111827; font-size: 18px;">✅ 改善提案</h2>
        ${report.recommendations.map((rec: string) => `<div class="recommendation">${rec}</div>`).join('')}
      </div>
      ` : ''}

      <div class="footer">
        <p>このレポートは AI によって自動生成されました。<br>
        詳細は管理システムでご確認ください。</p>
        <p style="margin-top: 15px;"><strong>FoodValue AI Management System</strong></p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail(recipientEmail, `${report.title} - ${storeName}`, emailHtml);

    if (!result.success) {
      throw new Error(result.error || 'メール送信に失敗しました');
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'メール送信中にエラーが発生しました'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});