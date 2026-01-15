import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey",
};

interface UsageCheckResult {
  allowed: boolean;
  current_calls: number;
  limit_calls: number;
  remaining_calls: number;
  store_id: string;
  store_name: string;
  is_demo: boolean;
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "認証が必要です。",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "認証に失敗しました。",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📊 AI usage check for user: ${user.id}`);

    const requestBody = await req.json().catch(() => ({}));
    const requestedStoreId = requestBody.store_id || null;

    const { data: memberData } = await supabase
      .from("organization_members")
      .select("organization_id, store_id, role")
      .eq("user_id", user.id)
      .single();

    if (!memberData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "組織が見つかりません。",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orgId = memberData.organization_id;
    const userRole = memberData.role;
    const assignedStoreId = memberData.store_id;

    let storeId = requestedStoreId || assignedStoreId;

    if (requestedStoreId && requestedStoreId !== assignedStoreId) {
      console.log(`🔒 User requested store ${requestedStoreId}, assigned store is ${assignedStoreId}, role: ${userRole}`);

      if (userRole === 'admin' || userRole === 'owner') {
        const { data: requestedStore } = await supabase
          .from("stores")
          .select("id, organization_id")
          .eq("id", requestedStoreId)
          .eq("organization_id", orgId)
          .single();

        if (!requestedStore) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "指定された店舗が見つかりません、またはアクセス権限がありません。",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        storeId = requestedStoreId;
        console.log(`✅ Admin/Owner user can access store ${storeId}`);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "この店舗へのアクセス権限がありません。",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!storeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "店舗が見つかりません。",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: storeData } = await supabase
      .from("stores")
      .select("name")
      .eq("id", storeId)
      .single();

    const storeName = storeData?.name || "Unknown Store";

    const { data: orgData } = await supabase
      .from("organizations")
      .select("is_demo, demo_expires_at, max_ai_requests_per_month")
      .eq("id", orgId)
      .single();

    if (!orgData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "組織情報の取得に失敗しました。",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isDemo = orgData.is_demo;

    if (isDemo && orgData.demo_expires_at) {
      const expiresAt = new Date(orgData.demo_expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "デモ期間が終了しました。",
            message: "本契約にアップグレードして継続利用できます。",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: storeUsage, error: usageError } = await supabase.rpc(
      "get_store_usage_status",
      {
        p_store_id: storeId,
        p_organization_id: orgId,
      }
    );

    if (usageError) {
      console.error("Error getting store usage:", usageError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "使用状況の取得に失敗しました。",
          details: usageError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const currentCalls = storeUsage.current_usage || 0;
    const callsLimit = storeUsage.limit || 100;
    const remaining = storeUsage.remaining || 0;

    console.log(
      `📈 Store "${storeName}" usage: ${currentCalls}/${callsLimit} calls (${remaining} remaining)`
    );

    if (!storeUsage.can_use) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `この店舗の月間AI利用上限（${callsLimit}回）に達しました。`,
          message: "管理者にお問い合わせいただくか、来月までお待ちください。",
          usageInfo: {
            current_calls: currentCalls,
            limit_calls: callsLimit,
            remaining_calls: 0,
            store_id: storeId,
            store_name: storeName,
            is_demo: isDemo,
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ===== CRITICAL: UPSERT パターンで使用回数を増加 =====
    const { error: upsertError } = await supabase.rpc('increment_store_ai_usage', {
      p_organization_id: orgId,
      p_store_id: storeId
    });

    if (upsertError) {
      console.error('Failed to increment usage:', upsertError);
      // エラーでも処理は続行（使用自体は許可）
    }

    // Track individual user usage
    const today = new Date().toISOString().slice(0, 10);
    const { error: trackingError } = await supabase.rpc('track_user_ai_usage', {
      p_user_id: user.id,
      p_organization_id: orgId,
      p_store_id: storeId,
      p_usage_date: today
    });

    if (trackingError) {
      console.error('Failed to track user usage:', trackingError);
    }

    const usageInfo: UsageCheckResult = {
      allowed: true,
      current_calls: currentCalls + 1,
      limit_calls: callsLimit,
      remaining_calls: remaining - 1,
      store_id: storeId,
      store_name: storeName,
      is_demo: isDemo,
    };

    return new Response(
      JSON.stringify({
        success: true,
        usage: usageInfo,
        organization_id: orgId,
        store_id: storeId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("💥 AI usage check error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "使用量チェックでエラーが発生しました。",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});