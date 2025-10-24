import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Pen as Yen, Target, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

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

export const KPICards: React.FC<KPICardsProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      description: '前日比'
    },
    {
      title: '今日の経費',
      value: formatCurrency(data.todayExpenses),
      trend: null,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: '支出合計'
    },
    {
      title: '粗利益',
      value: formatCurrency(data.todayGrossProfit),
      trend: null,
      icon: TrendingUp,
      color: data.todayGrossProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.todayGrossProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      description: '売上 - 仕入'
    },
    {
      title: '営業利益',
      value: formatCurrency(data.todayOperatingProfit),
      trend: null,
      icon: Target,
      color: data.todayOperatingProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.todayOperatingProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      description: `利益率 ${formatPercent(data.profitMargin)}`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {kpiItems.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 flex items-center justify-between">
                <span className="truncate">{item.title}</span>
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
};