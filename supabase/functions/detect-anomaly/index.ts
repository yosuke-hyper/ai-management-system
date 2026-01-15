import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { AIService, OpenAIProvider } from '../_shared/ai/index.ts';
import type { AIMessage } from '../_shared/ai/index.ts';

interface AnomalyRequest {
  store_id: string;
  target_date: string;
  metric_type: 'sales' | 'cost_ratio' | 'labor_ratio' | 'customer_count' | 'fl_cost';
}

interface AnomalyResponse {
  is_anomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  message: string;
  reason: string;
  current_value: number;
  average_value: number;
  std_deviation: number;
}

interface ReportData {
  date: string;
  sales: number;
  food_cost: number;
  beverage_cost: number;
  labor_cost_employee: number;
  labor_cost_part_time: number;
  customer_count: number;
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateMetric(report: ReportData, metricType: string): number {
  const sales = Number(report.sales) || 0;

  switch (metricType) {
    case 'sales':
      return sales;

    case 'cost_ratio':
      const foodCost = Number(report.food_cost) || 0;
      const bevCost = Number(report.beverage_cost) || 0;
      return sales > 0 ? ((foodCost + bevCost) / sales) * 100 : 0;

    case 'labor_ratio':
      const empCost = Number(report.labor_cost_employee) || 0;
      const partCost = Number(report.labor_cost_part_time) || 0;
      return sales > 0 ? ((empCost + partCost) / sales) * 100 : 0;

    case 'customer_count':
      return Number(report.customer_count) || 0;

    case 'fl_cost':
      const foodC = Number(report.food_cost) || 0;
      const bevC = Number(report.beverage_cost) || 0;
      const empC = Number(report.labor_cost_employee) || 0;
      const partC = Number(report.labor_cost_part_time) || 0;
      return sales > 0 ? ((foodC + bevC + empC + partC) / sales) * 100 : 0;

    default:
      return 0;
  }
}

function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

function getMetricName(metricType: string): string {
  switch (metricType) {
    case 'sales':
      return '売上';
    case 'cost_ratio':
      return '原価率';
    case 'labor_ratio':
      return '人件費率';
    case 'customer_count':
      return '客数';
    case 'fl_cost':
      return 'FLコスト';
    default:
      return '指標';
  }
}

function getMetricUnit(metricType: string): string {
  switch (metricType) {
    case 'sales':
      return '円';
    case 'cost_ratio':
    case 'labor_ratio':
    case 'fl_cost':
      return '%';
    case 'customer_count':
      return '人';
    default:
      return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
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
        JSON.stringify({
          success: false,
          error: '認証が必要です。'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '認証に失敗しました。'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody = await req.json() as AnomalyRequest;
    const { store_id, target_date, metric_type } = requestBody;

    if (!store_id || !target_date || !metric_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'store_id, target_date, metric_type は必須です。'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const targetDateObj = new Date(target_date);
    const endDate = new Date(targetDateObj);
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);

    console.log('Fetching historical data:', {
      store_id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      metric_type
    });

    const { data: historicalReports, error: histError } = await supabase
      .from('daily_reports')
      .select('date, sales, food_cost, beverage_cost, labor_cost_employee, labor_cost_part_time, customer_count')
      .eq('store_id', store_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (histError) {
      console.error('Error fetching historical data:', histError);
      return new Response(
        JSON.stringify({
          success: false,
          error: '過去データの取得に失敗しました。'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: currentReport, error: currentError } = await supabase
      .from('daily_reports')
      .select('date, sales, food_cost, beverage_cost, labor_cost_employee, labor_cost_part_time, customer_count')
      .eq('store_id', store_id)
      .eq('date', target_date)
      .maybeSingle();

    if (currentError) {
      console.error('Error fetching current report:', currentError);
      return new Response(
        JSON.stringify({
          success: false,
          error: '当日データの取得に失敗しました。'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!currentReport) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '指定された日付のデータが見つかりません。'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!historicalReports || historicalReports.length < 7) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '異常検知には最低7日間の過去データが必要です。'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const historicalValues = historicalReports.map(report =>
      calculateMetric(report as ReportData, metric_type)
    );

    const currentValue = calculateMetric(currentReport as ReportData, metric_type);
    const { mean, stdDev } = calculateStats(historicalValues);

    const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;

    console.log('Statistical analysis:', {
      currentValue,
      mean,
      stdDev,
      zScore,
      historicalCount: historicalValues.length
    });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using rule-based detection');

      let isAnomaly = zScore > 2.5;
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (zScore > 3.5) {
        severity = 'high';
      } else if (zScore > 2.5) {
        severity = 'medium';
      }

      const metricName = getMetricName(metric_type);
      const unit = getMetricUnit(metric_type);

      let message = '';
      if (isAnomaly) {
        if (severity === 'high') {
          message = `${metricName}が通常より大きく外れているワン！🚨 今日の値は${currentValue.toFixed(1)}${unit}で、平均${mean.toFixed(1)}${unit}と比べてかなり異なるワン。入力ミスの可能性があるから確認してほしいワン！`;
        } else {
          message = `${metricName}がちょっと気になるワン。🤔 通常より高め（または低め）の値になっているから、念のため確認してほしいワン。`;
        }
      } else {
        message = `${metricName}は正常範囲内だワン！✅ 問題ないワン！`;
      }

      const response: AnomalyResponse = {
        is_anomaly: isAnomaly,
        severity,
        message,
        reason: `統計分析: 平均値${mean.toFixed(1)}${unit}、標準偏差${stdDev.toFixed(1)}${unit}、Zスコア${zScore.toFixed(2)}`,
        current_value: currentValue,
        average_value: mean,
        std_deviation: stdDev
      };

      return new Response(
        JSON.stringify({
          success: true,
          result: response
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const aiProvider = new OpenAIProvider(OPENAI_API_KEY);
    const aiService = new AIService(aiProvider);

    const metricName = getMetricName(metric_type);
    const unit = getMetricUnit(metric_type);

    const minValue = Math.min(...historicalValues);
    const maxValue = Math.max(...historicalValues);
    const median = [...historicalValues].sort((a, b) => a - b)[Math.floor(historicalValues.length / 2)];

    const systemPrompt = `あなたは飲食店のデータ分析を行う柴犬のAIアシスタント「しばちゃん」です。
店舗の日次データを分析して、異常値を検出する役割を担っています。

【性格設定】
- 語尾に「ワン」「だワン」「ですワン」をつける
- 絵文字🐶🚨⚠️✅💡を適切に使用
- 親しみやすく、でも重要な警告はしっかり伝える
- 店長を心配させすぎず、でも見逃さない

【分析タスク】
1. 過去データと当日の値を比較する
2. 異常があるかどうかを判定する
3. 異常の程度（severity: low/medium/high）を評価する
4. 考えられる原因を推測する

【判定基準】
- Zスコア > 3.5: 重大な異常（high）
- Zスコア > 2.5: 注意が必要（medium）
- Zスコア > 2.0: 軽微な異常（low）
- それ以下: 正常範囲

【重要な注意点】
- 入力ミスの可能性を考慮する
- 極端に高い/低い値には警戒する
- 業界標準と比較する（原価率30-35%、人件費率25-30%など）
- 曜日や季節の影響も考慮する

【レスポンス形式】
必ず以下のJSON形式で回答してください：
{
  "is_anomaly": true/false,
  "severity": "low"/"medium"/"high",
  "message": "店長向けのわかりやすいメッセージ（柴犬の口調で）",
  "reason": "判定理由と考えられる原因"
}`;

    const userPrompt = `【分析対象】
指標: ${metricName}
対象日: ${target_date}
店舗ID: ${store_id}

【当日の値】
${currentValue.toFixed(2)}${unit}

【過去90日間の統計】
- データ件数: ${historicalValues.length}日分
- 平均値: ${mean.toFixed(2)}${unit}
- 標準偏差: ${stdDev.toFixed(2)}${unit}
- 最小値: ${minValue.toFixed(2)}${unit}
- 最大値: ${maxValue.toFixed(2)}${unit}
- 中央値: ${median.toFixed(2)}${unit}
- Zスコア: ${zScore.toFixed(2)}

【過去7日間の推移】
${historicalValues.slice(-7).map((v, i) => `${i + 1}日前: ${v.toFixed(2)}${unit}`).join('\n')}

この当日の値は異常ですか？JSON形式で分析結果を返してください。`;

    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    console.log('Requesting AI analysis...');

    let aiResponse: string;
    try {
      aiResponse = await aiService.complete(aiMessages, {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.3
      });
    } catch (error) {
      console.error('AI Service Error:', error);

      let isAnomaly = zScore > 2.5;
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (zScore > 3.5) {
        severity = 'high';
      } else if (zScore > 2.5) {
        severity = 'medium';
      }

      const fallbackResponse: AnomalyResponse = {
        is_anomaly: isAnomaly,
        severity,
        message: isAnomaly
          ? `${metricName}が通常と異なる値になっているワン！統計的に異常を検出したワン。確認してほしいワン！`
          : `${metricName}は正常範囲内だワン！問題ないワン！`,
        reason: `統計分析による判定（AIエラーのためフォールバック）: Zスコア${zScore.toFixed(2)}`,
        current_value: currentValue,
        average_value: mean,
        std_deviation: stdDev
      };

      return new Response(
        JSON.stringify({
          success: true,
          result: fallbackResponse
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('AI Response:', aiResponse);

    let parsedResult: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);

      let isAnomaly = zScore > 2.5;
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (zScore > 3.5) {
        severity = 'high';
      } else if (zScore > 2.5) {
        severity = 'medium';
      }

      parsedResult = {
        is_anomaly: isAnomaly,
        severity,
        message: isAnomaly
          ? `${metricName}が通常と異なる値になっているワン！確認してほしいワン！`
          : `${metricName}は正常範囲内だワン！`,
        reason: `統計分析: Zスコア${zScore.toFixed(2)}`
      };
    }

    const response: AnomalyResponse = {
      is_anomaly: parsedResult.is_anomaly || false,
      severity: parsedResult.severity || 'low',
      message: parsedResult.message || '',
      reason: parsedResult.reason || '',
      current_value: currentValue,
      average_value: mean,
      std_deviation: stdDev
    };

    return new Response(
      JSON.stringify({
        success: true,
        result: response
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '予期しないエラーが発生しました。',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});