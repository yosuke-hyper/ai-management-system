import nodemailer from 'npm:nodemailer@6.9.7';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
      from: options.from || `${smtpFromName} <${smtpFromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
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