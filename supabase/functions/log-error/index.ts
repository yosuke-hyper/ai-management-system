import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function getCorsHeaders(origin?: string | null) {
  // sendBeacon や credentials: 'include' に対応するため、
  // オリジンを動的に設定
  const allowedOrigin = origin || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": origin ? "true" : "false",
  };
}

interface IncomingErrorPayload {
  error_type: string;
  error_message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stack_trace?: string | null;
  context?: Record<string, unknown>;
  url?: string;
  user_agent?: string;
  organization_id?: string | null;
  user_id?: string | null;
  ip_address?: string | null;
  created_at?: string;
}

type RequestBody = IncomingErrorPayload | IncomingErrorPayload[];

Deno.serve(async (req: Request) => {
  // リクエスト元のオリジンを取得
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // リクエストボディの取得
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Invalid JSON", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // IPアドレスの取得（Cloudflare / 直接アクセス対応）
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      null;

    // 単体でも配列でも受け取れるように統一
    const payloads: IncomingErrorPayload[] = Array.isArray(body)
      ? body
      : [body];

    // バリデーション & 正規化
    const rows = payloads
      .map((p) => {
        // 必須フィールドのチェック
        if (!p.error_type || !p.error_message || !p.severity) {
          console.warn("Invalid error payload:", p);
          return null;
        }

        // 深刻度のチェック
        const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        if (!validSeverities.includes(p.severity)) {
          console.warn("Invalid severity:", p.severity);
          return null;
        }

        return {
          organization_id: p.organization_id ?? null,
          user_id: p.user_id ?? null,
          error_type: p.error_type,
          error_message: p.error_message,
          severity: p.severity,
          stack_trace: p.stack_trace ?? null,
          context: p.context ?? {},
          user_agent: p.user_agent ?? null,
          url: p.url ?? null,
          ip_address: p.ip_address ?? ip,
          created_at: p.created_at
            ? new Date(p.created_at).toISOString()
            : new Date().toISOString(),
          resolved: false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid error payload" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Supabase クライアントの初期化（サービスロールキー使用）
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // データベースに一括INSERT
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/error_logs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(rows),
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error("[log-error] insert failed", insertResponse.status, errorText);

      return new Response(
        JSON.stringify({
          error: "Failed to insert error logs",
          details: errorText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[log-error] Successfully inserted ${rows.length} error log(s)`);

    // CRITICALエラーの場合は追加処理（将来の拡張ポイント）
    const criticalErrors = rows.filter(r => r.severity === "CRITICAL");
    if (criticalErrors.length > 0) {
      console.warn(`⚠️ ${criticalErrors.length} CRITICAL error(s) detected!`);
      // TODO: Slack通知、Sentry転送などの処理を追加
      // await notifySlack(criticalErrors);
      // await sendToSentry(criticalErrors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: rows.length,
        critical_count: criticalErrors.length,
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("[log-error] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
