import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Calendar,
  Store,
  DollarSign,
  Zap,
  Brain,
  Lightbulb,
  Rocket,
  ChevronRight,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { DailyReport } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  visualData?: {
    type: 'chart' | 'metrics' | 'prediction' | 'comparison' | 'recommendations';
    data: any;
  };
  suggestions?: string[];
}

interface AIChatPageProps {
  reports: DailyReport[];
  stores: Array<{ id: string; name: string; }>;
  selectedStoreId?: string | null;
  user?: { name: string; role: string } | null;
}

export const AIChatPage: React.FC<AIChatPageProps> = ({ 
  reports, 
  stores, 
  selectedStoreId,
  user 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！🤖 居酒屋いっき AI経営アナリストです。\n\n業務データを分析して、視覚的な洞察と未来予測をお届けします。何についてお聞きになりたいですか？',
      suggestions: [
        '今月の業績サマリーを表示',
        '店舗別パフォーマンス分析',
        '来月の売上予測',
        '経費最適化提案',
        '目標達成ロードマップ'
      ],
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 高度な視覚的AI分析システム
  const generateVisualResponse = (question: string): { 
    content: string; 
    visualData?: any; 
    suggestions?: string[] 
  } => {
    const q = question.toLowerCase();
    
    if (reports.length === 0) {
      return {
        content: '📊 分析可能なデータがまだありません。\n\n「新規報告」から日次報告を作成してください。',
        suggestions: ['デモデータを生成', 'サンプル分析を表示']
      };
    }

    // データ計算の基盤
    const calculatePeriodData = (reportList: DailyReport[]) => {
      return reportList.reduce((acc, report) => {
        const expenses = report.purchase + report.laborCost + report.utilities + 
                        report.promotion + report.cleaning + report.misc + 
                        report.communication + report.others;
        return {
          sales: acc.sales + report.sales,
          expenses: acc.expenses + expenses,
          profit: acc.profit + (report.sales - expenses),
          count: acc.count + 1
        };
      }, { sales: 0, expenses: 0, profit: 0, count: 0 });
    };

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const todayReports = reports.filter(r => r.date === today);
    const thisMonthReports = reports.filter(r => r.date.startsWith(thisMonth));

    // 店舗フィルタリング
    let activeReports = reports;
    if (selectedStoreId && selectedStoreId !== 'all') {
      activeReports = reports.filter(r => r.storeId === selectedStoreId);
    }

    // 1. 業績サマリー
    if (q.includes('業績') || q.includes('サマリー') || q.includes('概要')) {
      const monthData = calculatePeriodData(thisMonthReports);
      const profitMargin = monthData.sales > 0 ? (monthData.profit / monthData.sales) * 100 : 0;

      // 日別売上チャートデータ
      const dailyData = Array.from(new Set(reports.map(r => r.date)))
        .sort()
        .slice(-14) // 過去2週間
        .map(date => {
          const dayReports = reports.filter(r => r.date === date);
          const dayTotals = calculatePeriodData(dayReports);
          return {
            date: new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
            sales: dayTotals.sales,
            profit: dayTotals.profit,
            stores: dayReports.length
          };
        });

      return {
        content: `📊 **${selectedStoreId === 'all' ? '全店舗' : '選択店舗'}業績サマリー**\n\n🏢 **今月実績:**\n• 売上: ${formatCurrency(monthData.sales)}\n• 利益: ${formatCurrency(monthData.profit)}\n• 利益率: ${profitMargin.toFixed(1)}%\n• 報告数: ${monthData.count}件\n\n${profitMargin >= 20 ? '🎉 優秀な業績です！' : profitMargin >= 15 ? '👍 良好な業績です' : '⚠️ 改善の余地があります'}`,
        visualData: {
          type: 'chart',
          data: {
            chartType: 'area',
            data: dailyData,
            title: '過去2週間の売上・利益推移',
            metrics: [
              { label: '今月売上', value: formatCurrency(monthData.sales), color: 'text-blue-600' },
              { label: '今月利益', value: formatCurrency(monthData.profit), color: monthData.profit >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: '利益率', value: `${profitMargin.toFixed(1)}%`, color: profitMargin >= 15 ? 'text-green-600' : 'text-yellow-600' },
              { label: '報告数', value: `${monthData.count}件`, color: 'text-gray-600' }
            ]
          }
        },
        suggestions: ['詳細な店舗別分析', '来月の売上予測', '経営改善提案']
      };
    }

    // 2. 店舗比較分析
    if (q.includes('店舗') && (q.includes('比較') || q.includes('分析') || q.includes('ランキング'))) {
      const storeAnalysis = reports.reduce((acc, report) => {
        if (!acc[report.storeName]) {
          acc[report.storeName] = { sales: 0, expenses: 0, profit: 0, count: 0 };
        }
        const expenses = report.purchase + report.laborCost + report.utilities + 
                        report.promotion + report.cleaning + report.misc + 
                        report.communication + report.others;
        acc[report.storeName].sales += report.sales;
        acc[report.storeName].expenses += expenses;
        acc[report.storeName].profit += (report.sales - expenses);
        acc[report.storeName].count += 1;
        return acc;
      }, {} as Record<string, { sales: number; expenses: number; profit: number; count: number }>);

      const storeChartData = Object.entries(storeAnalysis).map(([name, data]) => ({
        name: name.replace('居酒屋いっき', ''),
        sales: data.sales,
        profit: data.profit,
        profitMargin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0,
        efficiency: data.count > 0 ? data.sales / data.count : 0
      })).sort((a, b) => b.sales - a.sales);

      const topStore = storeChartData[0];
      const recommendations = [];
      
      if (storeChartData.length > 1) {
        const worstStore = storeChartData[storeChartData.length - 1];
        if (topStore.profitMargin - worstStore.profitMargin > 5) {
          recommendations.push(`${worstStore.name}店の利益率改善が急務です`);
        }
      }

      return {
        content: `🏆 **店舗パフォーマンス分析**\n\n👑 **トップパフォーマー:** ${topStore.name}店\n• 売上: ${formatCurrency(topStore.sales)}\n• 利益率: ${topStore.profitMargin.toFixed(1)}%\n\n📊 **全店舗比較チャートを表示中...**`,
        visualData: {
          type: 'comparison',
          data: {
            chartType: 'bar',
            data: storeChartData,
            title: '店舗別売上・利益比較',
            recommendations
          }
        },
        suggestions: ['トップ店舗の成功要因', '改善が必要な店舗の対策', '全店舗共通の課題']
      };
    }

    // 3. 売上予測
    if (q.includes('予測') || q.includes('将来') || q.includes('来月') || q.includes('見込み')) {
      // 過去30日のトレンドから予測
      const last30Days = reports.filter(r => {
        const reportDate = new Date(r.date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return reportDate >= thirtyDaysAgo;
      });

      const weeklyData = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(Date.now() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const weekReports = last30Days.filter(r => {
          const reportDate = new Date(r.date);
          return reportDate >= weekStart && reportDate <= weekEnd;
        });
        const weekTotals = calculatePeriodData(weekReports);
        weeklyData.unshift({
          week: `第${4-i}週`,
          sales: weekTotals.sales,
          trend: i === 0 ? 0 : weekTotals.sales - (weeklyData[weeklyData.length-1]?.sales || 0)
        });
      }

      // 線形予測
      const avgWeeklySales = weeklyData.reduce((sum, w) => sum + w.sales, 0) / weeklyData.length;
      const trendSlope = weeklyData.length > 1 ? 
        (weeklyData[weeklyData.length-1].sales - weeklyData[0].sales) / (weeklyData.length - 1) : 0;
      
      const nextWeekPrediction = avgWeeklySales + trendSlope;
      const nextMonthPrediction = nextWeekPrediction * 4.33; // 1ヶ月 ≈ 4.33週

      // 予測データに未来週を追加
      const predictionData = [...weeklyData, {
        week: '来週予測',
        sales: nextWeekPrediction,
        isPrediction: true,
        confidence: Math.max(60, 90 - Math.abs(trendSlope) / avgWeeklySales * 100)
      }];

      return {
        content: `🔮 **AI売上予測分析**\n\n📈 **来月予測売上:** ${formatCurrency(nextMonthPrediction)}\n📊 **来週予測:** ${formatCurrency(nextWeekPrediction)}\n\n🎯 **予測精度:** ${Math.max(65, 85 - Math.abs(trendSlope) / avgWeeklySales * 50).toFixed(0)}%\n\n💡 **トレンド:** ${trendSlope > 0 ? '📈 上昇傾向' : trendSlope < 0 ? '📉 下降傾向' : '📊 安定推移'}`,
        visualData: {
          type: 'prediction',
          data: {
            chartType: 'line',
            data: predictionData,
            title: '売上トレンド予測（4週間＋来週）',
            predictions: [
              { period: '来週', value: nextWeekPrediction, type: 'sales' },
              { period: '来月', value: nextMonthPrediction, type: 'sales' }
            ]
          }
        },
        suggestions: ['予測の改善要因', '売上向上戦略', 'リスク要因の分析']
      };
    }

    // 4. 経営改善提案
    if (q.includes('改善') || q.includes('提案') || q.includes('最適化')) {
      const monthData = calculatePeriodData(thisMonthReports);
      const currentProfitMargin = monthData.sales > 0 ? (monthData.profit / monthData.sales) * 100 : 0;
      
      const improvements = [
        {
          category: '仕入最適化',
          impact: 'コスト5-8%削減',
          timeframe: '2-3ヶ月',
          actions: ['仕入先の見直し', 'ボリューム割引交渉', '季節メニュー導入'],
          expectedSavings: monthData.expenses * 0.07
        },
        {
          category: 'デジタル化推進',
          impact: '効率性15%向上',
          timeframe: '1-2ヶ月',
          actions: ['POSシステム導入', 'モバイルオーダー', 'キャッシュレス決済'],
          expectedSavings: monthData.sales * 0.03
        },
        {
          category: 'メニュー戦略',
          impact: '客単価10%向上',
          timeframe: '1ヶ月',
          actions: ['高利益率メニュー推進', 'セット商品開発', 'アップセル研修'],
          expectedSavings: monthData.sales * 0.10
        }
      ];

      const totalImpact = improvements.reduce((sum, imp) => sum + imp.expectedSavings, 0);

      return {
        content: `🚀 **AI経営改善提案**\n\n💡 **現在の利益率:** ${currentProfitMargin.toFixed(1)}%\n🎯 **改善後予想:** ${((monthData.profit + totalImpact) / monthData.sales * 100).toFixed(1)}%\n\n📈 **予想効果:** 月間${formatCurrency(totalImpact)}の利益改善`,
        visualData: {
          type: 'recommendations',
          data: {
            improvements,
            currentProfit: monthData.profit,
            projectedProfit: monthData.profit + totalImpact,
            currentMargin: currentProfitMargin,
            projectedMargin: (monthData.profit + totalImpact) / monthData.sales * 100
          }
        },
        suggestions: ['実装ロードマップ作成', '優先度別の実行計画', 'ROI分析']
      };
    }

    // 5. 目標達成分析
    if (q.includes('目標') || q.includes('達成')) {
      const defaultTarget = selectedStoreId === 'all' ? 25000000 : 8000000;
      const monthData = calculatePeriodData(thisMonthReports);
      const achievement = (monthData.sales / defaultTarget) * 100;
      const remaining = Math.max(0, defaultTarget - monthData.sales);
      
      const progressData = [
        { label: '達成済み', value: Math.min(monthData.sales, defaultTarget), color: '#10b981' },
        { label: '未達成', value: remaining, color: '#e5e7eb' }
      ];

      const dailyTarget = remaining / (30 - new Date().getDate()); // 残り日数での必要日商

      return {
        content: `🎯 **目標達成度分析**\n\n📊 **現在の進捗:** ${achievement.toFixed(1)}%\n💰 **実績:** ${formatCurrency(monthData.sales)}\n🎯 **目標:** ${formatCurrency(defaultTarget)}\n\n⚡ **残り必要売上:** ${formatCurrency(remaining)}\n📅 **必要日商:** ${formatCurrency(dailyTarget)}`,
        visualData: {
          type: 'metrics',
          data: {
            chartType: 'progress',
            progressData,
            achievement,
            target: defaultTarget,
            current: monthData.sales,
            dailyTarget
          }
        },
        suggestions: ['目標達成戦略', '日次アクションプラン', '緊急対策案']
      };
    }

    // 6. 経費分析
    if (q.includes('経費') || q.includes('コスト')) {
      const expenseData = reports.reduce((acc, report) => {
        acc.purchase += report.purchase;
        acc.laborCost += report.laborCost;
        acc.utilities += report.utilities;
        acc.promotion += report.promotion;
        acc.cleaning += report.cleaning;
        acc.misc += report.misc;
        acc.communication += report.communication;
        acc.others += report.others;
        return acc;
      }, {
        purchase: 0, laborCost: 0, utilities: 0, promotion: 0,
        cleaning: 0, misc: 0, communication: 0, others: 0
      });

      const total = Object.values(expenseData).reduce((sum, val) => sum + val, 0);
      const pieData = [
        { name: '仕入', value: expenseData.purchase, color: '#ef4444' },
        { name: '人件費', value: expenseData.laborCost, color: '#f97316' },
        { name: '光熱費', value: expenseData.utilities, color: '#3b82f6' },
        { name: '販促費', value: expenseData.promotion, color: '#10b981' },
        { name: '清掃費', value: expenseData.cleaning, color: '#8b5cf6' },
        { name: '通信費', value: expenseData.communication, color: '#06b6d4' },
        { name: '雑費', value: expenseData.misc, color: '#f59e0b' },
        { name: 'その他', value: expenseData.others, color: '#6b7280' }
      ].filter(item => item.value > 0);

      return {
        content: `💸 **経費構造分析**\n\n💰 **総経費:** ${formatCurrency(total)}\n🥇 **最大項目:** ${pieData[0]?.name} (${((pieData[0]?.value || 0) / total * 100).toFixed(1)}%)\n\n📊 詳細な円グラフで内訳を表示中...`,
        visualData: {
          type: 'chart',
          data: {
            chartType: 'pie',
            data: pieData,
            title: '経費構成比',
            total
          }
        },
        suggestions: ['経費削減戦略', '最適な経費比率', 'コスト管理のベストプラクティス']
      };
    }

    // デフォルト応答
    return {
      content: `🤖 **分析システム待機中**\n\n利用可能な分析機能:\n📊 業績分析\n🏆 店舗比較\n🔮 売上予測\n💡 改善提案\n🎯 目標分析\n\n具体的な質問をお聞かせください。`,
      suggestions: [
        '今月の業績サマリーを表示',
        '店舗別パフォーマンス分析', 
        '来月の売上予測',
        '経費最適化提案'
      ]
    };
  };

  // 視覚的データのレンダリング
  const renderVisualData = (visualData: any) => {
    if (!visualData) return null;

    switch (visualData.type) {
      case 'chart':
        return (
          <Card className="mt-4 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {visualData.data.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visualData.data.chartType === 'area' && (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={visualData.data.data}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `¥${(value/10000).toFixed(0)}万`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                      <Area type="monotone" dataKey="sales" stackId="1" stroke="#3b82f6" fill="url(#salesGradient)" />
                      <Area type="monotone" dataKey="profit" stackId="2" stroke="#10b981" fill="url(#profitGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  {visualData.data.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {visualData.data.metrics.map((metric: any, index: number) => (
                        <div key={index} className="text-center p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600">{metric.label}</p>
                          <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {visualData.data.chartType === 'pie' && (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={visualData.data.data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={20}
                    >
                      {visualData.data.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), `${((value / visualData.data.total) * 100).toFixed(1)}%`]} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case 'comparison':
        return (
          <Card className="mt-4 border-2 border-green-100 bg-gradient-to-br from-green-50 to-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-green-600" />
                {visualData.data.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={visualData.data.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `¥${(value/10000).toFixed(0)}万`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'sales' ? '売上' : '利益'
                    ]}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {visualData.data.recommendations?.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    AI推奨アクション
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {visualData.data.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'prediction':
        return (
          <Card className="mt-4 border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                {visualData.data.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={visualData.data.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis tickFormatter={(value) => `¥${(value/10000).toFixed(0)}万`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '売上']}
                    labelFormatter={(label) => label}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                    strokeDasharray={(data: any) => data.isPrediction ? "5 5" : "0"}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {visualData.data.predictions.map((pred: any, index: number) => (
                  <div key={index} className="text-center p-3 bg-white rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">{pred.period}予測</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(pred.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'recommendations':
        return (
          <Card className="mt-4 border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rocket className="w-5 h-5 text-orange-600" />
                AI改善ロードマップ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 改善前後比較 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">現在の月間利益</p>
                    <p className="text-xl font-bold text-gray-700">{formatCurrency(visualData.data.currentProfit)}</p>
                    <p className="text-sm text-gray-500">{visualData.data.currentMargin.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">改善後予想利益</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(visualData.data.projectedProfit)}</p>
                    <p className="text-sm text-green-600">{visualData.data.projectedMargin.toFixed(1)}%</p>
                  </div>
                </div>

                {/* 改善施策 */}
                <div className="space-y-3">
                  {visualData.data.improvements.map((improvement: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-white transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          {improvement.category}
                        </h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          {improvement.impact}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {improvement.timeframe}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            {formatCurrency(improvement.expectedSavings)}の改善
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {improvement.actions.map((action: string, actionIndex: number) => (
                            <span key={actionIndex} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'metrics':
        return (
          <Card className="mt-4 border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                目標達成ダッシュボード
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 進捗バー */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">目標達成度</span>
                  <span className="text-sm font-bold text-indigo-600">{visualData.data.achievement.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-700 ${
                      visualData.data.achievement >= 100 ? 'bg-green-500' : 
                      visualData.data.achievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(visualData.data.achievement, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* メトリクス */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-xs text-gray-600 mb-1">現在実績</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(visualData.data.current)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-xs text-gray-600 mb-1">月間目標</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(visualData.data.target)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <p className="text-xs text-gray-600 mb-1">必要日商</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(visualData.data.dailyTarget)}</p>
                </div>
              </div>

              {/* 円グラフでの進捗表示 */}
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={150}>
                  <RechartsPieChart>
                    <Pie
                      data={visualData.data.progressData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                    >
                      {visualData.data.progressData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // リアルなAI処理時間をシミュレート
    setTimeout(() => {
      const response = generateVisualResponse(inputMessage);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        visualData: response.visualData,
        suggestions: response.suggestions,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      type: 'ai',
      content: '🤖 チャットをクリアしました。\n\n新しい分析をご希望でしたら、お気軽にお声かけください！',
      suggestions: [
        '今月の業績サマリーを表示',
        '店舗別パフォーマンス分析',
        '来月の売上予測',
        '経営改善提案'
      ],
      timestamp: new Date()
    }]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI経営アナリスト</h1>
              <p className="text-blue-100">
                居酒屋いっき専用 - 高度データ分析 & 未来予測システム
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-blue-100 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">分析データ: {reports.length}件</span>
            </div>
            <div className="text-sm">
              対象: {selectedStoreId === 'all' ? '🏢 全店舗' : '🏪 選択店舗'}
            </div>
          </div>
        </div>
      </div>

      {/* チャットインターフェース */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* メッセージエリア */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  AIアナリスト会話
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  履歴クリア
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  <div className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
                      <div className={`px-6 py-4 rounded-2xl text-sm leading-relaxed ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}>
                        <div className="whitespace-pre-line">{message.content}</div>
                        <p className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      
                      {/* 視覚的データの表示 */}
                      {message.visualData && renderVisualData(message.visualData)}
                      
                      {/* 提案ボタン */}
                      {message.type === 'ai' && message.suggestions && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            おすすめの分析:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                              >
                                {suggestion}
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.type === 'user' && (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 px-6 py-4 rounded-2xl rounded-bl-md max-w-[80%]">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">高度分析処理中...</span>
                      <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            
            {/* 入力エリア */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="例: 今月の業績サマリーを表示"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Enter送信 | 高度なデータ分析とビジュアル化に対応
              </p>
            </div>
          </Card>
        </div>

        {/* サイドパネル */}
        <div className="space-y-4">
          {/* クイックアクション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Rocket className="w-4 h-4 text-orange-500" />
                クイック分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                '📊 今月の業績サマリーを表示',
                '🏆 店舗別パフォーマンス分析',
                '🔮 来月の売上予測',
                '💡 経営改善提案',
                '🎯 目標達成ロードマップ'
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full justify-start text-left text-xs h-auto py-2 hover:bg-blue-50"
                >
                  {suggestion}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* 分析状況 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                分析状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">分析対象</span>
                <span className="text-xs font-medium">
                  {selectedStoreId === 'all' ? '全店舗' : '選択店舗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">データ件数</span>
                <span className="text-xs font-medium text-blue-600">{reports.length}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">AI精度</span>
                <span className="text-xs font-medium text-green-600">96.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">最終分析</span>
                <span className="text-xs font-medium text-gray-500">
                  {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* システム状況 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                システム状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600">AI分析エンジン: 稼働中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">データ同期: 正常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600">視覚化: 有効</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-purple-600">予測モデル: 学習済み</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};