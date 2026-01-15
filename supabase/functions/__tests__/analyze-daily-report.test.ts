import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('analyze-daily-report Edge Function', () => {
  const functionUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/analyze-daily-report`;
  const headers = {
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  beforeAll(() => {
    // OpenAI APIキーが設定されているか確認
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY が設定されていません。実際のテストはスキップされます。');
    }
  });

  it('正常なリクエストでポジティブなフィードバックを返す', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 150000,
      customer_count: 50,
      note: '雨で客足が少なかったが、常連さんが多かった',
      weather: '雨'
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('emotion');
    expect(data.message).toBeTruthy();
    expect(data.message.length).toBeLessThanOrEqual(50);
    expect(data.message).toMatch(/ワン！/);
    expect(['happy', 'surprised', 'love', 'sparkle']).toContain(data.emotion);
  }, 30000);

  it('売上が低い場合でもポジティブなフィードバックを返す', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 50000,
      customer_count: 20,
      note: '台風で大変だった',
      weather: '暴風雨'
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeTruthy();
    expect(data.message).toMatch(/ワン！/);
    // ネガティブな言葉が含まれていないことを確認
    expect(data.message).not.toMatch(/悪い|低い|ダメ|失敗/);
  }, 30000);

  it('客単価が高い場合に適切なフィードバックを返す', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 200000,
      customer_count: 40,
      note: 'コース料理が好評だった',
      weather: '晴れ'
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeTruthy();
    expect(data.emotion).toBeTruthy();
  }, 30000);

  it('必須フィールドが欠けている場合は400エラーを返す', async () => {
    const invalidData = {
      date: '2025-12-18',
      // sales と customer_count が欠けている
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('CORS プリフライトリクエストに対応する', async () => {
    const response = await fetch(functionUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('メモなし、天気なしでも正常に動作する', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 120000,
      customer_count: 45
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeTruthy();
    expect(data.emotion).toBeTruthy();
  }, 30000);

  it('客数が0の場合でも正常に処理する', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 0,
      customer_count: 0,
      note: '臨時休業',
      weather: '晴れ'
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeTruthy();
    expect(data.message).toMatch(/ワン！/);
  }, 30000);

  it('感情タイプが適切に設定される', async () => {
    const reportData = {
      date: '2025-12-18',
      sales: 300000,
      customer_count: 60,
      note: '新記録達成！お客様も大満足',
      weather: '晴れ'
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(reportData)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(['happy', 'surprised', 'love', 'sparkle']).toContain(data.emotion);
    // 高い成果の場合は surprised か sparkle が選ばれる可能性が高い
  }, 30000);
});
