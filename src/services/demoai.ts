import { supabase } from '../lib/supabase';

export interface DemoAIResponse {
  message: string;
  isDemo: true;
}

const DEMO_AI_RESPONSES = {
  sales: [
    '新宿店の今月の売上は好調です。前月比で約8%増加しており、特に週末の売上が伸びています。',
    '渋谷店は今月順調に推移しています。客単価が上昇傾向にあり、今後の成長が期待できます。',
    '両店舗ともに売上が安定しています。季節要因を考慮すると、目標達成は十分可能な状況です。'
  ],
  costs: [
    '人件費率が若干高めですが、許容範囲内です。パートタイムの配置を最適化することで改善の余地があります。',
    '原価率は目標値内に収まっています。継続的な在庫管理とロス削減の取り組みが効果を上げています。',
    '経費全体は適切に管理されています。光熱費の削減余地があるため、省エネ施策を検討してみてはいかがでしょうか。'
  ],
  performance: [
    '今月の店舗パフォーマンスは良好です。特に新宿店が目標達成率110%と優秀な成績を収めています。',
    '両店舗ともに順調に営業できています。客数は安定しており、リピーター獲得施策が功を奏しています。',
    '週末の売上が好調で、平日とのバランスも取れています。引き続き現在の運営方針を継続することをお勧めします。'
  ],
  recommendations: [
    '売上向上のため、SNSマーケティングの強化をお勧めします。特に若年層へのアプローチが効果的です。',
    '客単価を上げるため、セット商品やプレミアムメニューの開発を検討してみてください。',
    'スタッフのモチベーション維持が重要です。定期的な研修や評価制度の見直しを行うことで、サービス品質向上につながります。',
    '在庫管理の精度を高めることで、さらなる原価率改善が期待できます。デジタルツールの導入も検討してみてください。'
  ],
  comparison: [
    '新宿店と渋谷店を比較すると、新宿店の方が客数が多く、渋谷店は客単価が高い傾向にあります。',
    '2店舗の運営スタイルには特徴があります。それぞれの強みを活かしながら、弱点を補完し合うことが重要です。',
    '立地特性を考慮すると、両店舗とも適切な運営がなされています。エリア特性に応じた施策を継続してください。'
  ],
  general: [
    'デモモードをご利用いただきありがとうございます。実際のデータを入力することで、より詳細な分析とアドバイスを提供できます。',
    'このシステムは店舗運営の意思決定をサポートします。本登録いただくと、カスタマイズされた分析レポートをご利用いただけます。',
    '質問の内容からデータを分析しています。より具体的な質問をいただくと、詳細な回答が可能です。'
  ]
};

async function getRelevantDemoData() {
  const { data: stores } = await supabase
    .from('fixed_demo_stores')
    .select('*')
    .order('name');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const { data: reports } = await supabase
    .from('fixed_demo_reports')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  return { stores: stores || [], reports: reports || [] };
}

function calculateMetrics(reports: any[]) {
  if (reports.length === 0) {
    return {
      totalSales: 0,
      avgCustomers: 0,
      laborCostRate: 0,
      foodCostRate: 0
    };
  }

  const totalSales = reports.reduce((sum, r) => sum + Number(r.sales || 0), 0);
  const totalCustomers = reports.reduce((sum, r) => sum + Number(r.customer_count || 0), 0);
  const totalLabor = reports.reduce((sum, r) =>
    sum + Number(r.labor_cost_employee || 0) + Number(r.labor_cost_part_time || 0), 0
  );
  const totalFood = reports.reduce((sum, r) =>
    sum + Number(r.food_cost || 0) + Number(r.beverage_cost || 0), 0
  );

  return {
    totalSales: Math.round(totalSales),
    avgCustomers: Math.round(totalCustomers / reports.length),
    laborCostRate: totalSales > 0 ? Number(((totalLabor / totalSales) * 100).toFixed(1)) : 0,
    foodCostRate: totalSales > 0 ? Number(((totalFood / totalSales) * 100).toFixed(1)) : 0
  };
}

function selectResponse(question: string, data: any): string {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('売上') || lowerQuestion.includes('sales')) {
    const responses = DEMO_AI_RESPONSES.sales;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (lowerQuestion.includes('コスト') || lowerQuestion.includes('経費') ||
      lowerQuestion.includes('人件費') || lowerQuestion.includes('原価')) {
    const responses = DEMO_AI_RESPONSES.costs;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (lowerQuestion.includes('パフォーマンス') || lowerQuestion.includes('業績') ||
      lowerQuestion.includes('達成')) {
    const responses = DEMO_AI_RESPONSES.performance;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (lowerQuestion.includes('おすすめ') || lowerQuestion.includes('提案') ||
      lowerQuestion.includes('アドバイス') || lowerQuestion.includes('改善')) {
    const responses = DEMO_AI_RESPONSES.recommendations;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (lowerQuestion.includes('比較') || lowerQuestion.includes('店舗')) {
    const responses = DEMO_AI_RESPONSES.comparison;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  const responses = DEMO_AI_RESPONSES.general;
  return responses[Math.floor(Math.random() * responses.length)];
}

function enrichResponseWithData(baseResponse: string, metrics: any, stores: any[]): string {
  let response = baseResponse;

  if (metrics.totalSales > 0) {
    response += `\n\n【今月の実績】\n`;
    response += `- 売上合計: ${metrics.totalSales.toLocaleString()}円\n`;
    response += `- 平均客数: ${metrics.avgCustomers}人/日\n`;
    response += `- 人件費率: ${metrics.laborCostRate}%\n`;
    response += `- 原価率: ${metrics.foodCostRate}%`;
  }

  if (stores.length > 0) {
    response += `\n\n【対象店舗】`;
    stores.forEach(store => {
      response += `\n- ${store.name}`;
    });
  }

  return response;
}

export const demoAIService = {
  async generateResponse(question: string): Promise<DemoAIResponse> {
    try {
      const { stores, reports } = await getRelevantDemoData();
      const metrics = calculateMetrics(reports);
      const baseResponse = selectResponse(question, { stores, reports, metrics });
      const enrichedResponse = enrichResponseWithData(baseResponse, metrics, stores);

      return {
        message: enrichedResponse,
        isDemo: true
      };
    } catch (error) {
      console.error('Demo AI error:', error);
      return {
        message: 'デモモードでAI応答を生成中にエラーが発生しました。本登録いただくと、より詳細な分析が可能です。',
        isDemo: true
      };
    }
  },

  async generateReport(storeId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<DemoAIResponse> {
    try {
      const { data: store } = await supabase
        .from('fixed_demo_stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (!store) {
        return {
          message: 'デモ店舗が見つかりませんでした。',
          isDemo: true
        };
      }

      const endDate = new Date();
      const startDate = new Date();

      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data: reports } = await supabase
        .from('fixed_demo_reports')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      const metrics = calculateMetrics(reports || []);

      const periodText = period === 'daily' ? '昨日' : period === 'weekly' ? '今週' : '今月';

      let report = `# ${store.name}の${periodText}のレポート\n\n`;
      report += `## 主要指標\n`;
      report += `- 売上: ${metrics.totalSales.toLocaleString()}円\n`;
      report += `- 平均客数: ${metrics.avgCustomers}人/日\n`;
      report += `- 人件費率: ${metrics.laborCostRate}%\n`;
      report += `- 原価率: ${metrics.foodCostRate}%\n\n`;

      report += `## 分析\n`;

      if (metrics.laborCostRate > 30) {
        report += `- 人件費率が高めです。シフト調整を検討してください。\n`;
      } else if (metrics.laborCostRate < 20) {
        report += `- 人件費率は良好です。現在の体制を維持してください。\n`;
      } else {
        report += `- 人件費率は適正範囲内です。\n`;
      }

      if (metrics.foodCostRate > 35) {
        report += `- 原価率が高めです。仕入れの見直しやロス削減を検討してください。\n`;
      } else if (metrics.foodCostRate < 25) {
        report += `- 原価率は優秀です。品質を維持しながら継続してください。\n`;
      } else {
        report += `- 原価率は適正範囲内です。\n`;
      }

      report += `\n## 推奨アクション\n`;
      report += `- 好調な曜日・時間帯の分析を深堀りし、マーケティング施策に活用\n`;
      report += `- スタッフの稼働状況を確認し、適切な人員配置を実施\n`;
      report += `- 人気商品の在庫管理を強化し、欠品を防止\n\n`;
      report += `---\n`;
      report += `このレポートはデモデータに基づいています。本登録いただくと、実際のデータでより詳細な分析が可能です。`;

      return {
        message: report,
        isDemo: true
      };
    } catch (error) {
      console.error('Demo report generation error:', error);
      return {
        message: 'デモモードでレポート生成中にエラーが発生しました。',
        isDemo: true
      };
    }
  }
};
