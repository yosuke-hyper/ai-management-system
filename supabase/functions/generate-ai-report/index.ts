import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

interface ReportRequest {
  reportType: 'weekly' | 'monthly';
  storeId?: string;
  periodStart?: string;
  periodEnd?: string;
  demo_session_id?: string;
}

interface DailyReportData {
  id: string;
  date: string;
  store_id: string;
  sales: number;
  purchase: number;
  labor_cost: number;
  utilities: number;
  rent: number;
  consumables: number;
  promotion: number;
  cleaning: number;
  misc: number;
  communication: number;
  others: number;
}

interface StoreData {
  id: string;
  name: string;
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');

    const { reportType, storeId, periodStart, periodEnd, demo_session_id }: ReportRequest = await req.json();

    if (!openaiApiKey && !demo_session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (demo_session_id) {
      const { data: checkResult, error: checkError } = await supabase.rpc('check_demo_ai_usage', {
        p_demo_session_id: demo_session_id,
        p_feature_type: 'report'
      });

      if (checkError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Demo session validation failed.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!checkResult.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: checkResult.message,
            isDemo: true,
            remaining: checkResult.remaining
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      if (authHeader) {
        const usageProxyUrl = `${supabaseUrl}/functions/v1/ai-usage-proxy`;
        const usageResponse = await fetch(usageProxyUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: storeId || undefined
          }),
        });

        const usageData = await usageResponse.json();

        if (usageResponse.status === 429) {
          return new Response(
            JSON.stringify({
              success: false,
              error: usageData.error || 'AI usage limit exceeded',
              limitReached: true
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!usageResponse.ok) {
          return new Response(
            JSON.stringify({
              success: false,
              error: usageData.error || 'Failed to check AI usage limits'
            }),
            { status: usageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const logId = crypto.randomUUID();
    if (!demo_session_id) {
      await supabase.from('report_generation_logs').insert({
        id: logId,
        report_type: reportType,
        store_id: storeId || null,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
    }

    let startDate: string;
    let endDate: string;

    if (periodStart && periodEnd) {
      startDate = periodStart;
      endDate = periodEnd;
    } else {
      const now = new Date();
      if (reportType === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastMonthEnd.toISOString().split('T')[0];
      }
    }

    const tableName = demo_session_id ? 'fixed_demo_reports' : 'daily_reports';
    console.log(`Fetching from table: ${tableName}, demo_session_id: ${demo_session_id}`);

    // Get user's organization_id if not demo
    let organizationId: string | null = null;
    if (!demo_session_id && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        organizationId = profile?.organization_id || null;
        console.log(`User organization_id: ${organizationId}`);
      }
    }

    let query = supabase
      .from(tableName)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    // Filter by organization_id for non-demo sessions
    if (!demo_session_id && organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: reports, error: reportsError } = await query;
    console.log(`Reports fetched: ${reports?.length || 0} records`);

    if (reportsError) {
      throw new Error(`Failed to fetch reports: ${reportsError.message}`);
    }

    if (!reports || reports.length === 0) {
      if (!demo_session_id) {
        await supabase
          .from('report_generation_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: 'No data available for the specified period',
          })
          .eq('id', logId);
      }

      return new Response(
        JSON.stringify({ success: false, error: 'No data available for the specified period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storeIds = [...new Set(reports.map((r: DailyReportData) => r.store_id))];

    const storesTable = demo_session_id ? 'fixed_demo_stores' : 'stores';
    const { data: stores } = await supabase
      .from(storesTable)
      .select('id, name')
      .in('id', storeIds);

    const storeMap = new Map((stores || []).map((s: StoreData) => [s.id, s.name]));

    const reportPeriodStart = new Date(startDate);
    const reportPeriodEnd = new Date(endDate);
    const daysInPeriod = Math.ceil((reportPeriodEnd.getTime() - reportPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const monthsInPeriod = new Set<string>();
    for (let d = new Date(reportPeriodStart); d <= reportPeriodEnd; d.setDate(d.getDate() + 1)) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsInPeriod.add(monthKey);
    }

    let expenseBaselines: any[] = [];
    if (!demo_session_id) {
      const { data } = await supabase
        .from('expense_baselines')
        .select('*')
        .in('store_id', storeIds)
        .in('month', Array.from(monthsInPeriod));
      expenseBaselines = data || [];
    }

    const baselineMap = new Map(expenseBaselines.map((b: any) => [
      `${b.store_id}_${b.month}`,
      b
    ]));

    let aggregatedData = {
      totalSales: 0,
      totalCosts: 0,
      totalPurchase: 0,
      totalLaborCost: 0,
      totalUtilities: 0,
      totalRent: 0,
      totalConsumables: 0,
      totalPromotion: 0,
      totalCleaning: 0,
      totalMisc: 0,
      totalCommunication: 0,
      totalOthers: 0,
    };

    reports.forEach((report: DailyReportData) => {
      aggregatedData.totalSales += report.sales || 0;
      aggregatedData.totalPurchase += report.purchase || 0;
      aggregatedData.totalLaborCost += report.labor_cost || 0;
      aggregatedData.totalUtilities += report.utilities || 0;
      aggregatedData.totalRent += report.rent || 0;
      aggregatedData.totalConsumables += report.consumables || 0;
      aggregatedData.totalPromotion += report.promotion || 0;
      aggregatedData.totalCleaning += report.cleaning || 0;
      aggregatedData.totalMisc += report.misc || 0;
      aggregatedData.totalCommunication += report.communication || 0;
      aggregatedData.totalOthers += report.others || 0;
    });

    aggregatedData.totalCosts =
      aggregatedData.totalPurchase +
      aggregatedData.totalLaborCost +
      aggregatedData.totalUtilities +
      aggregatedData.totalRent +
      aggregatedData.totalConsumables +
      aggregatedData.totalPromotion +
      aggregatedData.totalCleaning +
      aggregatedData.totalMisc +
      aggregatedData.totalCommunication +
      aggregatedData.totalOthers;

    const totalProfit = aggregatedData.totalSales - aggregatedData.totalCosts;
    const profitMargin = aggregatedData.totalSales > 0
      ? (totalProfit / aggregatedData.totalSales) * 100
      : 0;

    const foodCostRatio = aggregatedData.totalSales > 0
      ? (aggregatedData.totalPurchase / aggregatedData.totalSales) * 100
      : 0;

    const laborCostRatio = aggregatedData.totalSales > 0
      ? (aggregatedData.totalLaborCost / aggregatedData.totalSales) * 100
      : 0;

    const analysisPrompt = `
You are a restaurant financial analyst. Analyze the following data and provide insights in Japanese.

Period: ${startDate} to ${endDate} (${daysInPeriod} days)
Stores: ${Array.from(storeMap.values()).join(', ')}

**Financial Summary:**
- Total Sales: ¥${aggregatedData.totalSales.toLocaleString()}
- Total Costs: ¥${aggregatedData.totalCosts.toLocaleString()}
- Net Profit: ¥${totalProfit.toLocaleString()}
- Profit Margin: ${profitMargin.toFixed(1)}%

**Cost Breakdown:**
- Purchase (Food Cost): ¥${aggregatedData.totalPurchase.toLocaleString()} (${foodCostRatio.toFixed(1)}%)
- Labor Cost: ¥${aggregatedData.totalLaborCost.toLocaleString()} (${laborCostRatio.toFixed(1)}%)
- Utilities: ¥${aggregatedData.totalUtilities.toLocaleString()}
- Rent: ¥${aggregatedData.totalRent.toLocaleString()}
- Consumables: ¥${aggregatedData.totalConsumables.toLocaleString()}
- Promotion: ¥${aggregatedData.totalPromotion.toLocaleString()}
- Cleaning: ¥${aggregatedData.totalCleaning.toLocaleString()}
- Communication: ¥${aggregatedData.totalCommunication.toLocaleString()}
- Miscellaneous: ¥${aggregatedData.totalMisc.toLocaleString()}
- Others: ¥${aggregatedData.totalOthers.toLocaleString()}

Provide a comprehensive analysis including:
1. Overall performance assessment
2. Key strengths and areas of concern
3. Cost ratio analysis (especially food cost and labor cost)
4. Actionable recommendations for improvement
5. Trend observations if applicable

Write in a professional, clear Japanese style suitable for restaurant management.
`;

    let aiAnalysis = '';

    if (demo_session_id) {
      aiAnalysis = `# 財務分析レポート\n\n## 期間概要\n${startDate} 〜 ${endDate}（${daysInPeriod}日間）\n\n## 財務サマリー\n- **総売上**: ¥${aggregatedData.totalSales.toLocaleString()}\n- **総コスト**: ¥${aggregatedData.totalCosts.toLocaleString()}\n- **純利益**: ¥${totalProfit.toLocaleString()}\n- **利益率**: ${profitMargin.toFixed(1)}%\n\n## コスト内訳\n- 仕入（原価）: ¥${aggregatedData.totalPurchase.toLocaleString()} (${foodCostRatio.toFixed(1)}%)\n- 人件費: ¥${aggregatedData.totalLaborCost.toLocaleString()} (${laborCostRatio.toFixed(1)}%)\n\nこれはデモレポートのサンプルです。実際のAI分析は本登録後にご利用いただけます。`;
    } else {
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a professional restaurant financial analyst. Provide detailed, actionable insights in Japanese.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!aiResponse.ok) {
          const errorData = await aiResponse.json();
          throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
        }

        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices[0].message.content;
      } catch (error: any) {
        console.error('AI analysis error:', error);
        aiAnalysis = `AI分析の生成中にエラーが発生しました: ${error.message}`;
      }
    }

    const reportData = {
      id: crypto.randomUUID(),
      report_type: reportType,
      period_start: startDate,
      period_end: endDate,
      stores: Array.from(storeMap.values()),
      financial_summary: {
        total_sales: aggregatedData.totalSales,
        total_costs: aggregatedData.totalCosts,
        net_profit: totalProfit,
        profit_margin: profitMargin,
      },
      cost_breakdown: {
        purchase: aggregatedData.totalPurchase,
        labor_cost: aggregatedData.totalLaborCost,
        utilities: aggregatedData.totalUtilities,
        rent: aggregatedData.totalRent,
        consumables: aggregatedData.totalConsumables,
        promotion: aggregatedData.totalPromotion,
        cleaning: aggregatedData.totalCleaning,
        communication: aggregatedData.totalCommunication,
        misc: aggregatedData.totalMisc,
        others: aggregatedData.totalOthers,
      },
      ratios: {
        food_cost_ratio: foodCostRatio,
        labor_cost_ratio: laborCostRatio,
      },
      ai_analysis: aiAnalysis,
      generated_at: new Date().toISOString(),
    };

    const reportTable = demo_session_id ? 'demo_ai_reports' : 'ai_reports';
    const insertPayload = {
      id: reportData.id,
      report_type: reportData.report_type,
      period_start: reportData.period_start,
      period_end: reportData.period_end,
      content: reportData,
      ...(demo_session_id
        ? { demo_session_id }
        : {
            store_id: storeId || null,
            organization_id: organizationId,
          }
      ),
    };

    const { error: insertError } = await supabase
      .from(reportTable)
      .insert(insertPayload);

    if (insertError) {
      console.error('Failed to save report:', insertError);
      throw new Error(`Failed to save report: ${insertError.message}`);
    }

    if (!demo_session_id) {
      await supabase
        .from('report_generation_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          report_id: reportData.id,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({ success: true, report: reportData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});