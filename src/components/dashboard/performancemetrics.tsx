import React from 'react';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, Calendar } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/calculations';
import { useTargets } from '../../hooks/usetargets';

interface PerformanceData {
  currentMonth: {
    sales: number;
    profit: number;
    profitMargin: number;
    reportCount: number;
  };
  previousMonth: {
    sales: number;
    profit: number;
    profitMargin: number;
    reportCount: number;
  };
  target: {
    monthlySales: number;
    monthlyProfit: number;
    profitMarginTarget: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    actionRequired?: boolean;
  }>;
}

interface PerformanceMetricsProps {
  data: PerformanceData;
  userId?: string | null;
  selectedStoreId?: string | null;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  data, 
  userId = null, 
  selectedStoreId = null 
}) => {
  const { getTarget, getAllStoresTarget } = useTargets(userId);
  const { currentMonth, previousMonth, target, alerts } = data;
  
  console.log('🎯 PerformanceMetrics: Debug info', {
    userId,
    selectedStoreId,
    currentMonth,
    target,
    hasTargetHook: !!getTarget
  });

  // 現在の年月を取得
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  // 設定された目標を取得
  const customTarget = selectedStoreId && selectedStoreId !== 'all' 
    ? getTarget(selectedStoreId, currentYear, currentMonthNum)
    : getAllStoresTarget(currentYear, currentMonthNum);
    
  console.log('🎯 PerformanceMetrics: Target data', {
    customTarget,
    selectedStoreId,
    currentYear,
    currentMonthNum
  });

  // 目標値を使用（設定されていない場合はデフォルト値）
  const actualTarget = {
    monthlySales: customTarget ? 
      (selectedStoreId === 'all' ? customTarget.totalSales : (customTarget as any).targetSales) : 
      target.monthlySales,
    monthlyProfit: customTarget ? 
      (selectedStoreId === 'all' ? 
        customTarget.totalSales * (customTarget.averageProfitMargin / 100) : 
        (customTarget as any).targetSales * ((customTarget as any).targetProfitMargin / 100)
      ) : target.monthlyProfit,
    profitMarginTarget: customTarget ?
      (selectedStoreId === 'all' ? customTarget.averageProfitMargin : (customTarget as any).targetProfitMargin) :
      target.profitMarginTarget
  };

  console.log('🎯 PerformanceMetrics: Final target', actualTarget);

  // 前月比計算
  const salesGrowth = previousMonth.sales > 0 
    ? ((currentMonth.sales - previousMonth.sales) / previousMonth.sales) * 100 
    : 0;
  
  const profitGrowth = previousMonth.profit > 0
    ? ((currentMonth.profit - previousMonth.profit) / previousMonth.profit) * 100
    : 0;

  // 目標達成率
  const salesAchievement = (currentMonth.sales / actualTarget.monthlySales) * 100;
  const profitAchievement = (currentMonth.profit / actualTarget.monthlyProfit) * 100;

  const MetricCard = ({ 
    title, 
    current, 
    previous, 
    growth, 
    target: targetValue, 
    achievement, 
    icon: IconComponent,
    format = 'currency'
  }: {
    title: string;
    current: number;
    previous: number;
    growth: number;
    target?: number;
    achievement?: number;
    icon: any;
    format?: 'currency' | 'percent' | 'number';
  }) => {
    const formatValue = (value: number) => {
      switch (format) {
        case 'currency': return formatCurrency(value);
        case 'percent': return formatPercent(value);
        case 'number': return value.toString();
        default: return formatCurrency(value);
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <IconComponent className="w-5 h-5 text-blue-600" />
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(current)}
            </p>
          </div>
          
          {/* 前月比 */}
          <div className="flex items-center gap-2">
            {growth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(growth).toFixed(1)}% 
            </span>
            <span className="text-sm text-gray-500">前月比</span>
          </div>
          
          {/* 目標達成率 */}
          {targetValue && achievement !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">目標達成率</span>
                <span className={`font-medium ${achievement >= 100 ? 'text-green-600' : achievement >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {achievement.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    achievement >= 100 ? 'bg-green-500' : 
                    achievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(achievement, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                目標: {formatValue(targetValue)}
              </p>
              {customTarget && (
                <div className="text-xs text-blue-600 mt-1">
                  ✓ カスタム目標設定済み
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 分析対象表示 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">
            {selectedStoreId === 'all' || !selectedStoreId ? 
              '🏢 全店舗合計パフォーマンス' : 
              `🏪 ${selectedStoreId}店パフォーマンス`}
          </h3>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          {selectedStoreId === 'all' || !selectedStoreId ? 
            'いっきチェーン全体の月間パフォーマンス分析' : 
            '選択店舗の個別月間パフォーマンス分析'}
        </p>
      </div>

      {/* アラート */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${
                alert.type === 'error' ? 'text-red-600' :
                alert.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`} />
              <p className={`text-sm ${
                alert.type === 'error' ? 'text-red-800' :
                alert.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {alert.message}
              </p>
              {alert.actionRequired && (
                <span className="ml-auto px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  要対応
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* パフォーマンス指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title={selectedStoreId === 'all' || !selectedStoreId ? "全店舗今月売上" : "今月売上"}
          current={currentMonth.sales}
          previous={previousMonth.sales}
          growth={salesGrowth}
          target={actualTarget.monthlySales}
          achievement={salesAchievement}
          icon={TrendingUp}
          format="currency"
        />
        
        <MetricCard
          title={selectedStoreId === 'all' || !selectedStoreId ? "全店舗今月利益" : "今月利益"}
          current={currentMonth.profit}
          previous={previousMonth.profit}
          growth={profitGrowth}
          target={actualTarget.monthlyProfit}
          achievement={profitAchievement}
          icon={Award}
          format="currency"
        />
        
        <MetricCard
          title={selectedStoreId === 'all' || !selectedStoreId ? "全店舗利益率" : "利益率"}
          current={currentMonth.profitMargin}
          previous={previousMonth.profitMargin}
          growth={currentMonth.profitMargin - previousMonth.profitMargin}
          target={actualTarget.profitMarginTarget}
          achievement={(currentMonth.profitMargin / actualTarget.profitMarginTarget) * 100}
          icon={Target}
          format="percent"
        />
      </div>

      {/* 詳細分析 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedStoreId === 'all' || !selectedStoreId ? "全店舗月間分析" : "月間パフォーマンス分析"}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {selectedStoreId === 'all' || !selectedStoreId ? "全店舗売上分析" : "売上分析"}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">今月売上:</span>
                <span className="font-medium">{formatCurrency(currentMonth.sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">前月売上:</span>
                <span className="font-medium">{formatCurrency(previousMonth.sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">目標売上:</span>
                <span className="font-medium">{formatCurrency(actualTarget.monthlySales)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">目標との差額:</span>
                <span className={`font-medium ${
                  currentMonth.sales >= actualTarget.monthlySales ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(currentMonth.sales - actualTarget.monthlySales)}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {selectedStoreId === 'all' || !selectedStoreId ? "全店舗報告状況" : "報告状況"}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">今月報告数:</span>
                <span className="font-medium">{currentMonth.reportCount}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">前月報告数:</span>
                <span className="font-medium">{previousMonth.reportCount}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">1日平均:</span>
                <span className="font-medium">
                  {(currentMonth.reportCount / new Date().getDate()).toFixed(1)}件
                </span>
              </div>
              {selectedStoreId === 'all' || !selectedStoreId ? (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">店舗数:</span>
                  <span className="font-medium text-blue-600">3店舗</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};