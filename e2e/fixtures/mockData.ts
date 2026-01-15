import { Route } from '@playwright/test';

export async function mockOpenAIAPI(route: Route) {
  const url = route.request().url();

  if (url.includes('/functions/v1/generate-ai-report')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        report: {
          summary: '本日の売上は順調に推移しています。前日比+15%と好調です。',
          analysis: '原価率30.0%、人件費率25.0%と両指標とも目標範囲内です。',
          recommendations: [
            '原価率を2%改善することで、月次利益が50万円向上します',
            'ピーク時間帯（12-13時、19-20時）の人員配置を最適化してください',
            '次月の仕入れ計画を週次で見直すことをお勧めします',
          ],
          insights: [
            '週末の売上が平日の1.5倍で推移しています',
            'ランチタイムの客単価が¥8,500→¥7,800に低下傾向',
            'ディナータイムの客数が前月比+12%増加中',
          ],
        },
      }),
    });
  } else if (url.includes('/functions/v1/chat-gpt')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        response: 'ご質問ありがとうございます。売上向上のためには、以下の施策をお勧めします：\n\n1. メニュー構成の見直し\n2. プロモーション施策の実施\n3. オペレーション効率化',
        usage: {
          promptTokens: 150,
          completionTokens: 200,
          totalTokens: 350,
        },
      }),
    });
  } else {
    await route.continue();
  }
}

export async function mockAIUsageLimit(route: Route, options: {
  used: number;
  limit: number;
  canUse?: boolean;
}) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      used: options.used,
      limit: options.limit,
      canUse: options.canUse ?? (options.used < options.limit),
      remaining: Math.max(0, options.limit - options.used),
    }),
  });
}

export async function mockGoogleSheetsSync(route: Route, success: boolean = true) {
  if (success) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'データを正常に同期しました',
        rowsUpdated: 30,
      }),
    });
  } else {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: '同期中にエラーが発生しました',
      }),
    });
  }
}

export async function mockEmailSend(route: Route, success: boolean = true) {
  if (success) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'メールを送信しました',
      }),
    });
  } else {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'メール送信に失敗しました',
      }),
    });
  }
}

export async function mockSupabaseError(route: Route, errorCode: string) {
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      error: {
        message: 'Database error',
        code: errorCode,
      },
    }),
  });
}
