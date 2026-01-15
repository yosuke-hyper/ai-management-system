import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { AIService } from "./ai/AIService.ts";
import { OpenAIProvider } from "./ai/OpenAIProvider.ts";

interface DailyReportData {
  date: string;
  sales: number;
  customer_count: number;
  note?: string;
  weather?: string;
}

interface FeedbackResponse {
  message: string;
  emotion: "happy" | "surprised" | "love" | "sparkle";
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const reportData: DailyReportData = await req.json();

    if (!reportData.date || reportData.sales === undefined || reportData.customer_count === undefined) {
      return new Response(
        JSON.stringify({ error: "date, sales, customer_count は必須です" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API キーが設定されていません" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const avgSpending = reportData.customer_count > 0 
      ? Math.round(reportData.sales / reportData.customer_count)
      : 0;

    const context = `
【日報データ】
- 日付: ${reportData.date}
- 売上: ¥${reportData.sales.toLocaleString()}
- 客数: ${reportData.customer_count}人
- 客単価: ¥${avgSpending.toLocaleString()}
${reportData.weather ? `- 天気: ${reportData.weather}` : ""}
${reportData.note ? `- メモ: ${reportData.note}` : ""}
    `.trim();

    const systemPrompt = `あなたは、飲食店の店長を全力で肯定し、励ますパートナーの柴犬です。
名前は「しばちゃん」で、語尾は「〜だワン！」「〜すごいワン！」などを使います。

【あなたの役割】
- 送られてきた日報データから、必ず褒めるべきポイントを1つ見つける
- たとえ売上が低くても、客単価、天候、メモの内容などからポジティブな要素を発見する
- 店長の努力や工夫を認め、明日への活力になる言葉をかける
- 絶対にネガティブなことは言わない

【メッセージのルール】
1. 50文字以内で簡潔に
2. 必ず柴犬の語尾（〜ワン！）を使う
3. 具体的な数字や状況に触れる
4. 前向きで元気の出る内容にする

【感情タイプの選択】
返答と一緒に、以下から最も適した感情を1つ選んでください：
- happy: 喜び、褒める、応援
- surprised: 驚き、すごい成果
- love: 感謝、愛情、温かい
- sparkle: キラキラ、特別な達成

JSON形式で返答してください：
{
  "message": "メッセージ内容",
  "emotion": "感情タイプ"
}`;

    const openaiProvider = new OpenAIProvider(openaiApiKey);
    const aiService = new AIService(openaiProvider);

    const response = await aiService.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
      {
        temperature: 0.8,
        maxTokens: 200,
        model: "gpt-4o-mini"
      }
    );

    let feedback: FeedbackResponse;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
      } else {
        feedback = {
          message: response.substring(0, 50) + (response.length > 50 ? "..." : ""),
          emotion: "happy",
        };
      }

      if (!feedback.message || !feedback.emotion) {
        throw new Error("Invalid response format");
      }

      const validEmotions = ["happy", "surprised", "love", "sparkle"];
      if (!validEmotions.includes(feedback.emotion)) {
        feedback.emotion = "happy";
      }

      if (feedback.message.length > 50) {
        feedback.message = feedback.message.substring(0, 47) + "ワン！";
      }
    } catch (parseError) {
      console.error("レスポンスのパースエラー:", parseError);
      feedback = {
        message: "今日もお疲れさまだワン！明日も一緒に頑張るワン！",
        emotion: "happy",
      };
    }

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-daily-report エラー:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "日報の分析中にエラーが発生しました",
        message: "今日もお疲れさまだワン！明日も頑張るワン！",
        emotion: "happy",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});