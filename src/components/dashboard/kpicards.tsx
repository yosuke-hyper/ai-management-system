import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Pen as Yen, Target, AlertCircle, Info } from 'lucide-react';
import { formatCurrency, formatPercent, formatProfitMargin } from '@/lib/format';

interface KPIData {
  todaySales: number;
  todayExpenses: number;
  todayGrossProfit: number;
  todayOperatingProfit: number;
  salesGrowth: number;
  profitMargin: number;
}

interface KPICardsProps {
  data: KPIData;
  loading?: boolean;
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const KPITooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-pre-line min-w-[200px] max-w-[calc(100vw-2rem)] sm:max-w-[280px]">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
};

export const KPICards: React.FC<KPICardsProps> = React.memo(({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiItems = [
    {
      title: '今日の売上',
      value: formatCurrency(data.todaySales),
      trend: data.salesGrowth,
      icon: Yen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: '前日比',
      definition: '税込売上金額\nPOSレジまたは日報入力の金額を表示\n※現金・カード・電子マネー等すべて含む'
    },
    {
      title: '今日の経費',
      value: formatCurrency(data.todayExpenses),
      trend: null,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: '支出合計',
      definition: '仕入原価 + 人件費 + 固定費の合計\n※仕入 = 納品書ベースの実績値\n※棚卸差異は未反映'
    },
    {
      title: '粗利益',
      value: formatCurrency(data.todayGrossProfit),
      trend: null,
      icon: TrendingUp,
      color: data.todayGrossProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.todayGrossProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      description: '売上 - 仕入',
      definition: '売上 - 仕入原価\n※原価率 = 仕入 ÷ 売上 × 100\n※棚卸差異は未反映のため概算値'
    },
    {
      title: '営業利益',
      value: formatCurrency(data.todayOperatingProfit),
      trend: null,
      icon: Target,
      color: data.todayOperatingProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.todayOperatingProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      description: `利益率 ${formatProfitMargin(data.todayOperatingProfit, data.todaySales)}`,
      definition: '粗利益 - 人件費 - 固定費\n※利益率 = 営業利益 ÷ 売上 × 100\n※本部経費・減価償却は含まず\n※売上0円の場合は計算不可'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {kpiItems.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="truncate">{item.title}</span>
                  <KPITooltip content={item.definition}>
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                  </KPITooltip>
                </span>
                <div className={`p-1.5 sm:p-2 rounded-lg ${item.bgColor} flex-shrink-0 ml-2`}>
                  <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${item.color}`} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className={`text-lg sm:text-2xl font-bold ${item.color} mb-1 truncate`}>
                {item.value}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate">{item.description}</p>
                {item.trend !== null && (
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {item.trend >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs font-medium ${
                      item.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(item.trend).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});