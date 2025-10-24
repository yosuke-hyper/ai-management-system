import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

interface ReportRequest {
  reportType: 'weekly' | 'monthly';
  storeId?: string;
  periodStart?: string;
  periodEnd?: string;
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reportType, storeId, periodStart, periodEnd }: ReportRequest = await req.json();

    const logId = crypto.randomUUID();
    await supabase.from('report_generation_logs').insert({
      id: logId,
      report_type: reportType,
      store_id: storeId || null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });

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

    let query = supabase
      .from('daily_reports')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      throw new Error(`Failed to fetch reports: ${reportsError.message}`);
    }

    if (!reports || reports.length === 0) {
      await supabase
        .from('report_generation_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'No data available for the specified period',
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({ success: false, error: 'No data available for the specified period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storeIds = [...new Set(reports.map((r: DailyReportData) => r.store_id))];
    const { data: stores } = await supabase
      .from('stores')
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

    const { data: expenseBaselines } = await supabase
      .from('expense_baselines')
      .select('*')
      .in('store_id', storeIds)
      .in('month', Array.from(monthsInPeriod));

    const expenseBaselineMap = new Map();
    (expenseBaselines || []).forEach((baseline: any) => {
      const key = `${baseline.store_id}-${baseline.month}`;
      expenseBaselineMap.set(key, baseline);
    });

    const calculateProrationForStore = (storeId: string) => {
      const storeReports = reports.filter((r: DailyReportData) => r.store_id === storeId);
      const actualDaysWithReports = storeReports.length;

      if (actualDaysWithReports === 0) return 0;

      let totalProrated = 0;
      for (const monthKey of Array.from(monthsInPeriod)) {
        const baselineKey = `${storeId}-${monthKey}`;
        const baseline = expenseBaselineMap.get(baselineKey);
        if (!baseline) continue;

        const openDays = baseline.open_days || 30;

        const monthlyTotal =
          Number(baseline.labor_cost_employee || 0) +
          Number(baseline.labor_cost_part_time || 0) +
          Number(baseline.utilities || 0) +
          Number(baseline.rent || 0) +
          Number(baseline.consumables || 0) +
          Number(baseline.promotion || 0) +
          Number(baseline.cleaning || 0) +
          Number(baseline.misc || 0) +
          Number(baseline.communication || 0) +
          Number(baseline.others || 0);

        totalProrated += (monthlyTotal / openDays) * actualDaysWithReports;
      }
      return totalProrated;
    };

    const totalSales = reports.reduce((sum: number, r: DailyReportData) => sum + (r.sales || 0), 0);
    const totalPurchase = reports.reduce((sum: number, r: DailyReportData) => sum + (r.purchase || 0), 0);
    const totalLaborCost = reports.reduce((sum: number, r: DailyReportData) => sum + (r.labor_cost || 0), 0);
    const totalUtilities = reports.reduce((sum: number, r: DailyReportData) => sum + (r.utilities || 0), 0);
    const totalRent = reports.reduce((sum: number, r: DailyReportData) => sum + (r.rent || 0), 0);
    const totalConsumables = reports.reduce((sum: number, r: DailyReportData) => sum + (r.consumables || 0), 0);
    const totalPromotion = reports.reduce((sum: number, r: DailyReportData) => sum + (r.promotion || 0), 0);
    const totalCleaning = reports.reduce((sum: number, r: DailyReportData) => sum + (r.cleaning || 0), 0);
    const totalMisc = reports.reduce((sum: number, r: DailyReportData) => sum + (r.misc || 0), 0);
    const totalCommunication = reports.reduce((sum: number, r: DailyReportData) => sum + (r.communication || 0), 0);
    const totalOthers = reports.reduce((sum: number, r: DailyReportData) => sum + (r.others || 0), 0);

    let totalMonthlyExpenses = 0;
    for (const storeId of storeIds) {
      totalMonthlyExpenses += calculateProrationForStore(storeId);
    }

    const totalExpenses =
      totalPurchase +
      totalLaborCost +
      totalUtilities +
      totalRent +
      totalConsumables +
      totalPromotion +
      totalCleaning +
      totalMisc +
      totalCommunication +
      totalOthers +
      totalMonthlyExpenses;

    const grossProfit = totalSales - totalPurchase;
    const operatingProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (operatingProfit / totalSales) * 100 : 0;
    const costRate = totalSales > 0 ? (totalPurchase / totalSales) * 100 : 0;
    const laborRate = totalSales > 0 ? ((totalLaborCost + totalMonthlyExpenses) / totalSales) * 100 : 0;

    const storeBreakdown = storeIds.map((storeId) => {
      const storeReports = reports.filter((r: DailyReportData) => r.store_id === storeId);
      const storeSales = storeReports.reduce((sum: number, r: DailyReportData) => sum + (r.sales || 0), 0);
      const storePurchase = storeReports.reduce((sum: number, r: DailyReportData) => sum + (r.purchase || 0), 0);
      const storeLaborCost = storeReports.reduce((sum: number, r: DailyReportData) => sum + (r.labor_cost || 0), 0);

      const storeDailyExpenses = storeReports.reduce(
        (sum: number, r: DailyReportData) =>
          sum +
          (r.purchase || 0) +
          (r.labor_cost || 0) +
          (r.utilities || 0) +
          (r.rent || 0) +
          (r.consumables || 0) +
          (r.promotion || 0) +
          (r.cleaning || 0) +
          (r.misc || 0) +
          (r.communication || 0) +
          (r.others || 0),
        0
      );

      const storeMonthlyExpenses = calculateProrationForStore(storeId);
      const storeExpenses = storeDailyExpenses + storeMonthlyExpenses;

      return {
        storeId,
        storeName: storeMap.get(storeId) || 'Unknown',
        sales: storeSales,
        purchase: storePurchase,
        laborCost: storeLaborCost,
        expenses: storeExpenses,
        profit: storeSales - storeExpenses,
        profitMargin: storeSales > 0 ? ((storeSales - storeExpenses) / storeSales) * 100 : 0,
        costRate: storeSales > 0 ? (storePurchase / storeSales) * 100 : 0,
        laborRate: storeSales > 0 ? ((storeLaborCost + storeMonthlyExpenses) / storeSales) * 100 : 0,
      };
    });

    const prompt = `あなたは飲食チェーンの経営コンサルタントです。以下のデータを分析し、${reportType === 'weekly' ? '週次' : '月次'}レポートを作成してください。

期間: ${startDate} から ${endDate}
対象店舗: ${storeId ? storeMap.get(storeId) : '全店舗'}

【総合指標】
- 総売上: ${totalSales.toLocaleString('ja-JP')}円
- 総経費: ${totalExpenses.toLocaleString('ja-JP')}円
- 粗利益: ${grossProfit.toLocaleString('ja-JP')}円
- 営業利益: ${operatingProfit.toLocaleString('ja-JP')}円
- 利益率: ${profitMargin.toFixed(1)}%
- 原価率: ${costRate.toFixed(1)}%
- 人件費率: ${laborRate.toFixed(1)}%

【店舗別内訳】
${storeBreakdown.map(s => `
${s.storeName}:
  売上: ${s.sales.toLocaleString('ja-JP')}円
  経費: ${s.expenses.toLocaleString('ja-JP')}円
  利益: ${s.profit.toLocaleString('ja-JP')}円
  利益率: ${s.profitMargin.toFixed(1)}%
  原価率: ${s.costRate.toFixed(1)}%
  人件費率: ${s.laborRate.toFixed(1)}%`).join('')}

以下の形式でJSONレスポンスを返してください:
{
  "title": "レポートのタイトル",
  "summary": "経営者向けのエグゼクティブサマリー（200-300文字）",
  "keyInsights": ["重要な発見1", "重要な発見2", "重要な発見3"],
  "recommendations": ["具体的な改善提案1", "具体的な改善提案2", "具体的な改善提案3"],
  "analysis": {
    "salesTrend": "売上トレンドの分析",
    "profitability": "収益性の分析",
    "costStructure": "コスト構造の分析",
    "storeComparison": "店舗間比較の分析"
  }
}

業界標準: 原価率30-35%, 人件費率25-30%, 営業利益率15-25%を参考に、具体的で実行可能な提案をしてください。`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたは飲食チェーン経営の専門家です。データ分析と改善提案を行います。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiResult = await openaiResponse.json();
    const aiContent = JSON.parse(aiResult.choices[0].message.content);

    const reportData = {
      store_id: storeId || null,
      report_type: reportType,
      period_start: startDate,
      period_end: endDate,
      title: aiContent.title || `${reportType === 'weekly' ? '週次' : '月次'}業績レポート`,
      summary: aiContent.summary || '',
      analysis_content: aiContent.analysis || {},
      key_insights: aiContent.keyInsights || [],
      recommendations: aiContent.recommendations || [],
      metrics: {
        totalSales,
        totalExpenses,
        grossProfit,
        operatingProfit,
        profitMargin,
        costRate,
        laborRate,
        storeBreakdown,
      },
      generated_by: 'gpt-4o-mini',
      generated_at: new Date().toISOString(),
    };

    const { data: report, error: insertError } = await supabase
      .from('ai_generated_reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert report: ${insertError.message}`);
    }

    await supabase
      .from('report_generation_logs')
      .update({
        status: 'success',
        report_id: report.id,
        completed_at: new Date().toISOString(),
        data_summary: { reportCount: reports.length, storeCount: storeIds.length },
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
