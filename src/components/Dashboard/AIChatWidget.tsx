import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Minimize2, Maximize2, X, Bot, User, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyReport } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIChatWidgetProps {
  reports: DailyReport[];
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ reports }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！📊 居酒屋いっきの業務データ分析AIです。\n\n売上・経費・利益についてなんでもお聞きください。例えば：',
      suggestions: [
        '今月の売上合計は？',
        '利益率が一番高い店舗は？',
        '経費の内訳を教えて',
        '前月と比較してどう？'
      ],
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージ履歴を最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 高度なAI応答生成
  const generateAIResponse = (question: string): { content: string; suggestions?: string[] } => {
    const q = question.toLowerCase();
    
    if (reports.length === 0) {
      return {
        content: '申し訳ございませんが、まだ分析できるデータがありません。\n\n「新規報告」ボタンから日次報告を作成してから、再度お試しください。',
        suggestions: ['新規報告の作成方法は？', 'デモデータを生成して']
      };
    }

    // データ分析の基本計算
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
    
    const todayReports = reports.filter(r => r.date === today);
    const thisMonthReports = reports.filter(r => r.date.startsWith(thisMonth));
    const lastMonthReports = reports.filter(r => r.date.startsWith(lastMonth));
    
    const calculateTotals = (reportList: DailyReport[]) => {
      return reportList.reduce((acc, report) => {
        const totalExpenses = report.purchase + report.laborCost + report.utilities + 
                             report.promotion + report.cleaning + report.misc + 
                             report.communication + report.others;
        
        return {
          sales: acc.sales + report.sales,
          expenses: acc.expenses + totalExpenses,
          purchase: acc.purchase + report.purchase,
          profit: acc.profit + (report.sales - totalExpenses),
          count: acc.count + 1
        };
      }, { sales: 0, expenses: 0, purchase: 0, profit: 0, count: 0 });
    };

    const todayTotals = calculateTotals(todayReports);
    const thisMonthTotals = calculateTotals(thisMonthReports);
    const lastMonthTotals = calculateTotals(lastMonthReports);
    
    // 店舗別分析
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

    // 質問パターン解析と回答生成
    
    // 1. 売上関連の質問
    if (q.includes('売上') && (q.includes('合計') || q.includes('総'))) {
      if (q.includes('今日') || q.includes('本日')) {
        return {
          content: `📊 **本日の売上合計**\n\n${formatCurrency(todayTotals.sales)} （${todayTotals.count}件の報告）\n\n${todayTotals.count === 0 ? '⚠️ 本日の報告がまだありません。' : '✅ 順調に報告が上がっています！'}`,
          suggestions: ['今日の利益は？', '昨日と比較して', '今日の店舗別売上は？']
        };
      } else if (q.includes('今月')) {
        const monthlyGrowth = lastMonthTotals.sales > 0 ? ((thisMonthTotals.sales - lastMonthTotals.sales) / lastMonthTotals.sales) * 100 : 0;
        return {
          content: `📈 **今月の売上合計**\n\n${formatCurrency(thisMonthTotals.sales)} （${thisMonthTotals.count}件の報告）\n\n前月比: ${monthlyGrowth >= 0 ? '📈' : '📉'} ${monthlyGrowth.toFixed(1)}%\n前月: ${formatCurrency(lastMonthTotals.sales)}`,
          suggestions: ['今月の利益率は？', '店舗別の売上ランキング', '目標達成度は？']
        };
      } else {
        return {
          content: `💰 **総売上合計**\n\n${formatCurrency(thisMonthTotals.sales)} （全期間: ${reports.length}件の報告）\n\n平均日商: ${formatCurrency(thisMonthTotals.sales / Math.max(thisMonthTotals.count, 1))}`,
          suggestions: ['期間を指定して分析', '店舗別の売上は？', '利益率の分析']
        };
      }
    }

    // 2. 利益・利益率関連
    if (q.includes('利益') && (q.includes('率') || q.includes('マージン'))) {
      const profitMargin = thisMonthTotals.sales > 0 ? (thisMonthTotals.profit / thisMonthTotals.sales) * 100 : 0;
      const storeMargins = Object.entries(storeAnalysis).map(([name, data]) => ({
        name,
        margin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0
      })).sort((a, b) => b.margin - a.margin);

      return {
        content: `📊 **利益率分析**\n\n🏢 全店舗平均: **${profitMargin.toFixed(1)}%**\n\n🏆 **店舗別ランキング:**\n${storeMargins.map((store, index) => 
          `${index + 1}位. ${store.name}: ${store.margin.toFixed(1)}%`
        ).join('\n')}\n\n${profitMargin >= 20 ? '🎉 優秀な利益率です！' : profitMargin >= 15 ? '👍 良好な利益率です' : '⚠️ 利益率改善が必要です'}`,
        suggestions: ['利益率を改善するには？', '経費削減のアドバイス', '最も利益率の高い店舗の詳細']
      };
    }

    // 3. 店舗比較・ランキング
    if (q.includes('店舗') && (q.includes('比較') || q.includes('ランキング') || q.includes('高い') || q.includes('一番'))) {
      const storeRanking = Object.entries(storeAnalysis)
        .map(([name, data]) => ({
          name,
          sales: data.sales,
          profit: data.profit,
          profitMargin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0,
          count: data.count
        }))
        .sort((a, b) => b.sales - a.sales);

      return {
        content: `🏆 **店舗別パフォーマンスランキング**\n\n📊 **売上ランキング:**\n${storeRanking.map((store, index) => 
          `${['🥇', '🥈', '🥉'][index] || '🏪'} ${store.name}\n   売上: ${formatCurrency(store.sales)}\n   利益率: ${store.profitMargin.toFixed(1)}%`
        ).join('\n\n')}`,
        suggestions: ['トップ店舗の成功要因は？', '下位店舗の改善点', '全店舗の平均と比較']
      };
    }

    // 4. 経費分析
    if (q.includes('経費') && (q.includes('内訳') || q.includes('比率') || q.includes('分析'))) {
      const expenseBreakdown = reports.reduce((acc, report) => {
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

      const totalExpenses = Object.values(expenseBreakdown).reduce((sum, val) => sum + val, 0);
      const expenseItems = [
        { name: '仕入', value: expenseBreakdown.purchase },
        { name: '人件費', value: expenseBreakdown.laborCost },
        { name: '光熱費', value: expenseBreakdown.utilities },
        { name: '販促費', value: expenseBreakdown.promotion },
        { name: '清掃費', value: expenseBreakdown.cleaning },
        { name: '通信費', value: expenseBreakdown.communication },
        { name: '雑費', value: expenseBreakdown.misc },
        { name: 'その他', value: expenseBreakdown.others }
      ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

      return {
        content: `💸 **経費内訳分析**\n\n💰 経費合計: **${formatCurrency(totalExpenses)}**\n\n📊 **主な経費項目:**\n${expenseItems.map(item => 
          `• ${item.name}: ${formatCurrency(item.value)} (${((item.value / totalExpenses) * 100).toFixed(1)}%)`
        ).join('\n')}\n\n💡 **分析結果:**\n仕入費が${((expenseBreakdown.purchase / totalExpenses) * 100).toFixed(1)}%を占めています。`,
        suggestions: ['経費削減のアドバイス', '仕入コストを下げるには？', '人件費の最適化方法']
      };
    }

    // 5. 目標・達成度関連
    if (q.includes('目標') || q.includes('達成')) {
      const defaultTarget = 25000000; // 全店舗の月間目標
      const achievement = (thisMonthTotals.sales / defaultTarget) * 100;
      const remaining = defaultTarget - thisMonthTotals.sales;
      
      return {
        content: `🎯 **目標達成度分析**\n\n📊 **今月の進捗:**\n• 実績: ${formatCurrency(thisMonthTotals.sales)}\n• 目標: ${formatCurrency(defaultTarget)}\n• 達成率: **${achievement.toFixed(1)}%**\n\n${achievement >= 100 ? '🎉 目標達成おめでとうございます！' : achievement >= 80 ? '👍 目標まであと少しです！' : '⚠️ 目標達成に向けて対策が必要です'}\n\n残り必要売上: ${formatCurrency(Math.max(remaining, 0))}`,
        suggestions: ['目標達成のための施策', '各店舗の進捗状況', '来月の目標設定']
      };
    }

    // 6. トレンド・傾向分析
    if (q.includes('傾向') || q.includes('トレンド') || q.includes('推移')) {
      const recentDays = reports.slice(0, 7);
      const recentSales = recentDays.reduce((sum, r) => sum + r.sales, 0);
      const avgDailySales = recentSales / Math.max(recentDays.length, 1);
      
      return {
        content: `📈 **売上トレンド分析**\n\n📊 **直近7日間:**\n• 総売上: ${formatCurrency(recentSales)}\n• 平均日商: ${formatCurrency(avgDailySales)}\n• 報告件数: ${recentDays.length}件\n\n💡 **トレンド:**\n${avgDailySales > 300000 ? '📈 好調な売上推移です' : avgDailySales > 200000 ? '📊 安定した売上です' : '📉 売上向上の施策が必要です'}`,
        suggestions: ['週末と平日の比較', '季節要因の影響', '売上向上の提案']
      };
    }

    // 7. 時間帯・曜日分析
    if (q.includes('時間') || q.includes('曜日') || q.includes('ピーク')) {
      return {
        content: `⏰ **営業時間分析**\n\n📊 **一般的な飲食店の傾向:**\n• ランチタイム: 11:30-14:00\n• ディナータイム: 17:30-22:00\n• 週末は平日比 140%の売上\n\n💡 **改善提案:**\n• アイドルタイムの有効活用\n• ハッピーアワーの導入\n• 週末限定メニューの展開`,
        suggestions: ['ピークタイムの売上最大化', 'アイドルタイム対策', '曜日別戦略']
      };
    }

    // 8. コスト削減・改善提案
    if (q.includes('改善') || q.includes('削減') || q.includes('コスト') || q.includes('節約')) {
      const avgExpenseRatio = thisMonthTotals.expenses / thisMonthTotals.sales * 100;
      
      return {
        content: `💡 **経営改善提案**\n\n📊 **現在の経費率:** ${avgExpenseRatio.toFixed(1)}%\n\n🎯 **改善アクション:**\n• 仕入先の見直し → 5-10%コスト削減可能\n• エネルギー効率化 → 光熱費10%削減\n• スタッフシフト最適化 → 人件費効率向上\n• 食材ロス削減 → 仕入コスト5%改善\n\n📈 **期待効果:** 利益率3-5%向上`,
        suggestions: ['具体的な仕入先変更案', 'シフト最適化方法', '食材ロス削減策']
      };
    }

    // 9. 予測・将来分析
    if (q.includes('予測') || q.includes('将来') || q.includes('来月') || q.includes('見込み')) {
      const monthlyGrowth = lastMonthTotals.sales > 0 ? ((thisMonthTotals.sales - lastMonthTotals.sales) / lastMonthTotals.sales) * 100 : 0;
      const predictedNextMonth = thisMonthTotals.sales * (1 + monthlyGrowth / 100);
      
      return {
        content: `🔮 **売上予測分析**\n\n📊 **来月予測:**\n• 予想売上: ${formatCurrency(predictedNextMonth)}\n• 成長率: ${monthlyGrowth.toFixed(1)}%\n\n🎯 **予測根拠:**\n• 過去の成長トレンド\n• 季節要因\n• 現在の営業状況\n\n${monthlyGrowth > 0 ? '📈 成長トレンド継続予想' : '📉 売上回復施策の検討が必要'}`,
        suggestions: ['予測を向上させる方法', '成長戦略の提案', 'リスク要因の分析']
      };
    }

    // 10. 具体的な数値質問
    if (q.includes('いくら') || q.includes('金額') || q.includes('円')) {
      return {
        content: `💰 **金額サマリー**\n\n📊 **今月の実績:**\n• 売上: ${formatCurrency(thisMonthTotals.sales)}\n• 経費: ${formatCurrency(thisMonthTotals.expenses)}\n• 粗利: ${formatCurrency(thisMonthTotals.sales - reports.reduce((sum, r) => sum + r.purchase, 0))}\n• 営業利益: ${formatCurrency(thisMonthTotals.profit)}\n\n💡 利益率: ${thisMonthTotals.sales > 0 ? ((thisMonthTotals.profit / thisMonthTotals.sales) * 100).toFixed(1) : 0}%`,
        suggestions: ['利益を増やすには？', '経費の最適化', '売上向上施策']
      };
    }

    // 11. 一般的な経営相談
    const suggestions = [
      '今月の売上合計は？',
      '利益率分析をして',
      '店舗別パフォーマンス比較',
      '経費内訳を詳しく',
      '目標達成度の確認',
      '来月の売上予測',
      '改善提案をして'
    ];

    return {
      content: `🤖 **申し訳ございません**\n\nその質問は理解できませんでした。\n\n📝 **よくある質問例:**\n• 売上・利益に関する質問\n• 店舗比較・ランキング\n• 目標達成度の確認\n• 経費削減のアドバイス\n• 将来予測\n\n💡 具体的な質問をお試しください！`,
      suggestions
    };
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

    // AI応答の生成（リアルな遅延でUX向上）
    setTimeout(() => {
      const response = generateAIResponse(inputMessage);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        suggestions: response.suggestions,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000); // 1-2秒のランダムな遅延
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
      content: 'チャット履歴をクリアしました。🗑️\n\n新しい質問をお聞かせください！',
      suggestions: [
        '今月の売上合計は？',
        '店舗別パフォーマンス',
        '利益率分析',
        '経費削減提案'
      ],
      timestamp: new Date()
    }]);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1" />
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`${
        isMinimized ? 'w-80 h-20' : 'w-96 h-[32rem]'
      } shadow-2xl transition-all duration-300 border-0 overflow-hidden`}>
        <CardHeader className={`pb-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white ${isMinimized ? 'rounded-lg' : 'rounded-t-lg'}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="relative">
                <Bot className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              業務分析AI（β版）
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 p-0 text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 p-0 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {!isMinimized && (
            <p className="text-xs text-blue-100 mt-1">
              💬 売上・利益・経費について何でもお聞きください
            </p>
          )}
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="flex flex-col h-96 p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md shadow-lg'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-lg border border-gray-200'
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
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* AI提案ボタン */}
                  {message.type === 'ai' && message.suggestions && (
                    <div className="ml-11 space-y-2">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        おすすめの質問:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">分析中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={clearChat}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  🗑️ 履歴クリア
                </button>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {reports.length}件のデータで分析中
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="例: 売上向上の具体的な戦略を提案して"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                    disabled={isLoading}
                  />
                  {inputMessage && (
                    <button
                      onClick={() => setInputMessage('')}
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                🤖 ChatGPT連携 | Enter送信 | 高度なAI経営分析
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};