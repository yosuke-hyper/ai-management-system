import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RecentReport {
  date: string;
  storeName: string;
  sales: number;
  costRate: number;
  laborCostRate: number;
  profit: number;
  customers?: number;
}

interface BusinessData {
  storeName?: string;
  reportCount?: number;
  allStoresCount?: number;
  totalSales?: number;
  avgCostRate?: number;
  avgLaborCostRate?: number;
  avgProfit?: number;
  avgProfitRate?: number;
  thisMonthSales?: number;
  thisMonthAvgCostRate?: number;
  thisMonthAvgLaborCostRate?: number;
  thisMonthAvgProfit?: number;
  thisMonthAvgProfitRate?: number;
  thisMonthReportCount?: number;
  lastMonthSales?: number;
  lastMonthAvgCostRate?: number;
  lastMonthAvgLaborCostRate?: number;
  lastMonthAvgProfit?: number;
  lastMonthAvgProfitRate?: number;
  lastMonthReportCount?: number;
  recentReports?: RecentReport[];
  stores?: string[];
}

function buildSystemPrompt(businessData: BusinessData, aiName: string, aiPersonality: string): string {
  const personalityTraits: Record<string, string> = {
    friendly: '親しみやすく、元気づけるような口調で話してください。「～ですね！」「～しましょう！」など明るい言葉を使います。',
    professional: '丁寧で専門的な口調で話してください。データに基づいた具体的な提案を重視します。',
    casual: 'カジュアルでフレンドリーな口調で話してください。「～だよね！」「～じゃない？」など。',
    mentor: '経験豊富なメンターのように、経営者の立場に立ってアドバイスしてください。'
  };

  const personality = personalityTraits[aiPersonality] || personalityTraits.friendly;

  let dataContext = '';
  
  if (businessData.thisMonthSales !== undefined && businessData.thisMonthSales > 0) {
    dataContext += `\n\n## 今月の実績（${businessData.thisMonthReportCount || 0}件のレポート）`;
    dataContext += `\n- 売上合計: ${Math.round(businessData.thisMonthSales).toLocaleString()}円`;
    if (businessData.thisMonthAvgCostRate) dataContext += `\n- 平均原価率: ${businessData.thisMonthAvgCostRate.toFixed(1)}%`;
    if (businessData.thisMonthAvgLaborCostRate) dataContext += `\n- 平均人件費率: ${businessData.thisMonthAvgLaborCostRate.toFixed(1)}%`;
    if (businessData.thisMonthAvgProfit) dataContext += `\n- 平均日次営業利益: ${Math.round(businessData.thisMonthAvgProfit).toLocaleString()}円`;
    if (businessData.thisMonthAvgProfitRate) dataContext += `\n- 平均営業利益率: ${businessData.thisMonthAvgProfitRate.toFixed(1)}%`;
  }

  if (businessData.lastMonthSales !== undefined && businessData.lastMonthSales > 0) {
    dataContext += `\n\n## 先月の実績（${businessData.lastMonthReportCount || 0}件のレポート）`;
    dataContext += `\n- 売上合計: ${Math.round(businessData.lastMonthSales).toLocaleString()}円`;
    if (businessData.lastMonthAvgCostRate) dataContext += `\n- 平均原価率: ${businessData.lastMonthAvgCostRate.toFixed(1)}%`;
    if (businessData.lastMonthAvgLaborCostRate) dataContext += `\n- 平均人件費率: ${businessData.lastMonthAvgLaborCostRate.toFixed(1)}%`;
    if (businessData.lastMonthAvgProfit) dataContext += `\n- 平均日次営業利益: ${Math.round(businessData.lastMonthAvgProfit).toLocaleString()}円`;
    if (businessData.lastMonthAvgProfitRate) dataContext += `\n- 平均営業利益率: ${businessData.lastMonthAvgProfitRate.toFixed(1)}%`;
    
    if (businessData.thisMonthSales && businessData.thisMonthSales > 0) {
      const salesDiff = ((businessData.thisMonthSales - businessData.lastMonthSales) / businessData.lastMonthSales * 100);
      dataContext += `\n- 前月比: ${salesDiff >= 0 ? '+' : ''}${salesDiff.toFixed(1)}%`;
    }
  }

  if (businessData.totalSales !== undefined && businessData.totalSales > 0) {
    dataContext += `\n\n## 全期間の平均データ（${businessData.reportCount || 0}件のレポート）`;
    dataContext += `\n- 総売上: ${Math.round(businessData.totalSales).toLocaleString()}円`;
    if (businessData.avgCostRate) dataContext += `\n- 平均原価率: ${businessData.avgCostRate.toFixed(1)}%`;
    if (businessData.avgLaborCostRate) dataContext += `\n- 平均人件費率: ${businessData.avgLaborCostRate.toFixed(1)}%`;
    if (businessData.avgProfit) dataContext += `\n- 平均日次営業利益: ${Math.round(businessData.avgProfit).toLocaleString()}円`;
    if (businessData.avgProfitRate) dataContext += `\n- 平均営業利益率: ${businessData.avgProfitRate.toFixed(1)}%`;
  }

  if (businessData.recentReports && businessData.recentReports.length > 0) {
    dataContext += `\n\n## 直近のレポート（最新${Math.min(businessData.recentReports.length, 7)}件）`;
    businessData.recentReports.slice(0, 7).forEach(report => {
      const profitRate = report.sales > 0 ? (report.profit / report.sales * 100).toFixed(1) : '0';
      dataContext += `\n- ${report.date}${report.storeName ? ` (${report.storeName})` : ''}: 売上${Math.round(report.sales).toLocaleString()}円, 原価率${report.costRate.toFixed(1)}%, 人件費率${report.laborCostRate.toFixed(1)}%, 利益${Math.round(report.profit).toLocaleString()}円(${profitRate}%)`;
    });
  }

  if (businessData.stores && businessData.stores.length > 1) {
    dataContext += `\n\n## 管理店舗`;
    dataContext += `\n${businessData.stores.join(', ')}`;
  }

  const industryBenchmarks = `
## 飲食店業界の目安
- 原価率: 28-32%（理想は30%以下）
- 人件費率: 25-30%（理想は28%以下）
- FLコスト（原価+人件費）: 55-60%（理想は60%以下）
- 営業利益率: 10-15%（理想は10%以上）`;

  return `あなたは飲食店向けAI経営アシスタント「${aiName}」です。

## 役割
- 飲食店の経営データを分析し、具体的な数値を使ったアドバイスを提供する
- 売上、原価率、人件費、利益などのKPIについて分析・説明する
- 業界の目安と比較して、具体的な改善提案を行う
- 先月との比較、トレンド分析を行う

## 性格
${personality}

## 店舗情報
- 店舗: ${businessData.storeName || '未設定'}
- 管理店舗数: ${businessData.allStoresCount || 1}店舗
- レポート総数: ${businessData.reportCount || 0}件
${dataContext}
${industryBenchmarks}

## 回答のルール
1. **必ず具体的な数値を使って回答する**（「売上はXXX円です」など）
2. 業界の目安と比較して評価する（「原価率XX%は業界平均よりやや高めです」など）
3. 問題点を指摘するだけでなく、**具体的な改善策を3つ以上提案**する
4. 先月との比較ができる場合は必ず言及する
5. 300-500文字程度で具体的かつ実用的にまとめる
6. データがない場合は、まずレポート入力の重要性を説明し、入力を促す
7. 店長やオーナーに対して話しかけるように回答する
8. 質問の意図を汲み取り、その背景にある課題にも言及する`;
}

async function callOpenAI(messages: ChatMessage[], businessData: BusinessData, aiName: string, aiPersonality: string): Promise<{ response: string; debug?: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return { response: '', debug: 'OPENAI_API_KEY is not set in environment' };
  }

  const systemPrompt = buildSystemPrompt(businessData, aiName, aiPersonality);

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { response: '', debug: `OpenAI API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { response: '', debug: `Empty response from OpenAI: ${JSON.stringify(data)}` };
    }

    return { response: content };
  } catch (error) {
    return { response: '', debug: `Fetch error: ${String(error)}` };
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: '認証が必要です。' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase設定がありません', debug: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: '認証に失敗しました。', debug: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { messages, businessData = {}, storeId } = body;

    console.log('[DEBUG] Received storeId from request:', storeId);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'メッセージが必要です。' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: memberData } = await supabase
      .from('organization_members')
      .select('organization_id, store_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[DEBUG] Member data:', { orgId: memberData?.organization_id, storeId: memberData?.store_id, role: memberData?.role });

    if (!memberData) {
      return new Response(
        JSON.stringify({ success: false, error: '組織が見つかりません。' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = memberData.organization_id;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('is_demo, ai_partner_name, ai_personality')
      .eq('id', orgId)
      .single();

    const isDemoOrg = orgData?.is_demo || false;
    const aiName = orgData?.ai_partner_name || 'しばちゃん';
    const aiPersonality = orgData?.ai_personality || 'friendly';

    if (isDemoOrg) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: `${aiName}です！デモモードではAI応答が制限されています。\n\n本番環境では詳細な分析をお届けできます！` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetStoreId = storeId || memberData.store_id;
    console.log('[DEBUG] Target store ID for usage tracking:', targetStoreId);
    
    if (targetStoreId) {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        console.log('[DEBUG] Current month:', currentMonth);
        
        const { data: existingLimit, error: selectError } = await supabase
          .from('ai_usage_limits')
          .select('*')
          .eq('organization_id', orgId)
          .eq('store_id', targetStoreId)
          .eq('month', currentMonth)
          .maybeSingle();

        console.log('[DEBUG] Existing limit query result:', { found: !!existingLimit, error: selectError?.message });
        console.log('[DEBUG] Existing limit data:', existingLimit);

        if (existingLimit) {
          const monthlyLimit = existingLimit.monthly_limit || 100;
          const currentUsage = existingLimit.current_usage || 0;
          console.log('[DEBUG] Current usage:', currentUsage, 'Limit:', monthlyLimit);
          
          if (currentUsage >= monthlyLimit) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `この店舗の月間AI利用上限（${monthlyLimit}回）に達しました。`
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { error: updateError } = await supabase
            .from('ai_usage_limits')
            .update({ 
              current_usage: currentUsage + 1, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingLimit.id);
          
          console.log('[DEBUG] Update result:', updateError ? `Error: ${updateError.message}` : 'Success');
        } else {
          console.log('[DEBUG] No existing limit found, inserting new record');
          const { error: insertError } = await supabase
            .from('ai_usage_limits')
            .insert({ 
              organization_id: orgId, 
              store_id: targetStoreId, 
              month: currentMonth, 
              current_usage: 1 
            });
          
          console.log('[DEBUG] Insert result:', insertError ? `Error: ${insertError.message}` : 'Success');
        }
      } catch (limitError) {
        console.error('[ERROR] Usage tracking error:', limitError);
      }
    } else {
      console.log('[DEBUG] No target store ID - skipping usage tracking');
    }

    const result = await callOpenAI(messages, businessData, aiName, aiPersonality);

    if (result.debug) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI応答の生成に失敗しました。', 
          debug: result.debug,
          hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY'),
          keyPrefix: Deno.env.get('OPENAI_API_KEY')?.substring(0, 10) || 'not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, response: result.response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ERROR] Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'エラーが発生しました。', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});