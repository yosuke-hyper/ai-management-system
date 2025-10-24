import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // JWT認証チェック
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '認証が必要です。ログインしてください。'
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
          error: '認証に失敗しました。再度ログインしてください。'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // AI使用回数チェック
    const { data: usageCheck, error: usageError } = await supabase.rpc('check_and_increment_usage', {
      p_user_id: user.id
    });

    console.log('Usage check result:', usageCheck);

    if (usageError) {
      console.error('Usage check error:', usageError);
    }

    if (usageCheck && !usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `本日の利用上限（${usageCheck.daily_limit}回）に達しました。`,
          message: `${usageCheck.message}\n\n明日午前0時（日本時間）にリセットされます。\nそれまでは基本的なデータ分析機能をご利用いただけます。`,
          usageInfo: {
            currentCount: usageCheck.current_count,
            dailyLimit: usageCheck.daily_limit,
            remaining: usageCheck.remaining
          }
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, businessData } = await req.json() as {
      messages: ChatMessage[];
      businessData?: {
        totalSales: number;
        totalExpenses: number;
        profitMargin: number;
        reportCount: number;
        stores: string[];
        recentEvents?: string[];
      };
    };

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API キーが設定されていません。管理者に連絡してください。' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const systemPrompt = `あなたは居酒屋いっきチェーンの専門AIアナリストです。以下のデータを基に、経営に役立つ具体的で実用的な回答を日本語で提供してください。

現在の業績データ:
${businessData ? `
- 総売上: ${(businessData.totalSales || 0).toLocaleString('ja-JP')}円
- 総経費: ${(businessData.totalExpenses || 0).toLocaleString('ja-JP')}円
- 利益率: ${(businessData.profitMargin || 0).toFixed(1)}%
- 報告件数: ${businessData.reportCount || 0}件
- 店舗数: ${businessData.stores?.length || 0}店舗
- 店舗名: ${businessData.stores?.join('、') || '未設定'}
${businessData.recentEvents?.length ? '- 特別実績: ' + businessData.recentEvents.join('、') : ''}
` : '業績データを取得中...'}

回答の指針:
1. 具体的な数値を使った分析
2. 実行可能な改善提案
3. 飲食業界の一般的な指標との比較
4. 季節要因や市場環境の考慮
5. 各店舗の特徴を活かした戦略提案

特に以下の点を重視してください:
- 原価率: 30-35%が目安
- 人件費率: 25-30%が目安  
- 営業利益率: 15-25%が目安
- 豊洲店の立地特性（豊洲市場、観光エリア）
- 有明店のオフィス街立地
- 本店の地域密着型営業

回答は簡潔で分かりやすく、必要に応じて絵文字を使用してください。`;

    const openAIMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10)
    ];

    const openAIRequest: OpenAIRequest = {
      model: 'gpt-4o-mini',
      messages: openAIMessages,
      max_tokens: 1000,
      temperature: 0.7
    };

    console.log('OpenAI API Request:', {
      messageCount: openAIMessages.length,
      hasBusinessData: !!businessData,
      lastUserMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIRequest)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      let errorMessage = 'ChatGPT APIでエラーが発生しました。';
      
      if (response.status === 401) {
        errorMessage = 'OpenAI APIキーが無効です。設定を確認してください。';
      } else if (response.status === 429) {
        errorMessage = 'API利用制限に達しました。しばらく待ってから再試行してください。';
      } else if (response.status === 500) {
        errorMessage = 'OpenAI APIサーバーでエラーが発生しました。';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          fallbackResponse: '申し訳ございません。一時的にAI機能が利用できません。基本的な分析は引き続きご利用いただけます。'
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ChatGPTからの応答を取得できませんでした。',
          fallbackResponse: 'AI機能が一時的に利用できません。手動分析機能をご利用ください。'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        usage: result.usage,
        usageInfo: usageCheck ? {
          currentCount: usageCheck.current_count,
          dailyLimit: usageCheck.daily_limit,
          remaining: usageCheck.remaining
        } : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'サーバーエラーが発生しました。',
        fallbackResponse: 'システムエラーのため、基本的な分析機能のみご利用いただけます。'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});