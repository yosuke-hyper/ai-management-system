import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { DailyReport } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  reports: DailyReport[];
}

export const AIChat: React.FC<AIChatProps> = ({ reports }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！業務データについてご質問をどうぞ。例：「今月の売上合計は？」「経費の内訳を教えて」',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // AIの応答をシミュレート
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(inputMessage, reports),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const getAIResponse = (question: string, reports: DailyReport[]): string => {
    const q = question.toLowerCase();
    
    if (reports.length === 0) {
      return '申し訳ございませんが、まだ報告データがありません。日次報告を作成してから再度お試しください。';
    }

    // 集計データを計算
    const totalSales = reports.reduce((sum, report) => sum + report.sales, 0);
    const totalExpenses = reports.reduce((sum, report) => 
      sum + report.purchase + report.laborCost + report.utilities + 
      report.promotion + report.cleaning + report.misc + 
      report.communication + report.others, 0);
    const operatingProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (operatingProfit / totalSales) * 100 : 0;
    
    if (q.includes('売上') && q.includes('合計')) {
      return `現在の売上合計は${formatCurrency(totalSales)}です。報告件数は${reports.length}件です。`;
    } else if (q.includes('経費') && (q.includes('内訳') || q.includes('比率'))) {
      const avgPurchase = reports.reduce((sum, r) => sum + r.purchase, 0);
      const avgLabor = reports.reduce((sum, r) => sum + r.laborCost, 0);
      const purchaseRatio = totalExpenses > 0 ? (avgPurchase / totalExpenses * 100).toFixed(1) : 0;
      const laborRatio = totalExpenses > 0 ? (avgLabor / totalExpenses * 100).toFixed(1) : 0;
      return `経費合計：${formatCurrency(totalExpenses)}\n主な内訳：\n• 仕入: ${purchaseRatio}%\n• 人件費: ${laborRatio}%`;
    } else if (q.includes('利益') || q.includes('営業利益')) {
      return `営業利益は${formatCurrency(operatingProfit)}で、利益率は${profitMargin.toFixed(1)}%です。`;
    } else if (q.includes('店舗') && (q.includes('比較') || q.includes('パフォーマンス'))) {
      const storeData = reports.reduce((acc, report) => {
        if (!acc[report.storeName]) {
          acc[report.storeName] = { sales: 0, count: 0 };
        }
        acc[report.storeName].sales += report.sales;
        acc[report.storeName].count += 1;
        return acc;
      }, {} as Record<string, { sales: number; count: number }>);
      
      const storeList = Object.entries(storeData).map(([name, data]) => 
        `• ${name}：売上${formatCurrency(data.sales)}（${data.count}件）`
      ).join('\n');
      
      return `店舗別パフォーマンス：\n${storeList}`;
    } else {
      return '申し訳ございませんが、その質問については十分なデータがありません。「売上合計」「経費内訳」「利益率」「店舗比較」などについてお答えできます。';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-96">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AIアシスタント
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="質問を入力してください..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};