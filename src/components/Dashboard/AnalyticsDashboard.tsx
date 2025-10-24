import React, { useState, useMemo } from 'react';
import { DailyReport } from '../../types';
import { PeriodSelector } from './PeriodSelector';
import { SalesChart } from '../Charts/SalesChart';
import { ExpenseChart } from '../Charts/ExpenseChart';
import { formatCurrency, formatPercent } from '../../utils/calculations';
import { Calendar, TrendingUp, TrendingDown, BarChart3, PieChart, Target, AlertCircle } from 'lucide-react';
import { useTargets } from '../../hooks/useTargets';

interface AnalyticsDashboardProps {
  reports: DailyReport[];
  stores: Array<{ id: string; name: string; }>;
  userId?: string | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ reports, stores, userId = null }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const { getAllStoresTarget, getTarget } = useTargets(userId);

  // 期間に基づいてレポートをフィルタリング
  const filteredReports = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    return reports.filter(report => {
      const reportDate = new Date(report.date);
      const inDateRange = reportDate >= startDate && reportDate <= now;
      const inStoreFilter = selectedStoreId === 'all' || report.storeId === selectedStoreId;
      return inDateRange && inStoreFilter;
    });
  }, [reports, selectedRange, selectedStoreId]);

  // 期間別集計データ
  const aggregatedData = useMemo(() => {
    const groupedData = new Map<string, {
      sales: number;
      expenses: number;
      profit: number;
      count: number;
    }>();

    filteredReports.forEach(report => {
      const date = new Date(report.date);
      let key: string;

      switch (selectedPeriod) {
        case 'daily':
          key = report.date;
          break;
        case 'weekly':
          // 週の始まり（月曜日）を取得
          const mondayDate = new Date(date);
          mondayDate.setDate(date.getDate() - ((date.getDay() + 6) % 7));
          key = mondayDate.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, { sales: 0, expenses: 0, profit: 0, count: 0 });
      }

      const data = groupedData.get(key)!;
      const expenses = report.purchase + report.laborCost + report.utilities + 
                     report.promotion + report.cleaning + report.misc + 
                     report.communication + report.others;
      
      data.sales += report.sales;
      data.expenses += expenses;
      data.profit += (report.sales - expenses);
      data.count += 1;
    });

    return Array.from(groupedData.entries())
      .map(([period, data]) => ({
        period,
        ...data,
        profitMargin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredReports, selectedPeriod]);

  // 総計
  const totals = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => ({
      sales: acc.sales + curr.sales,
      expenses: acc.expenses + curr.expenses,
      profit: acc.profit + curr.profit,
      count: acc.count + curr.count
    }), { sales: 0, expenses: 0, profit: 0, count: 0 });
  }, [aggregatedData]);

  // 現在の年月
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 目標データの取得
  const targetData = useMemo(() => {
    if (selectedStoreId === 'all') {
      return getAllStoresTarget(currentYear, currentMonth);
    } else {
      const target = getTarget(selectedStoreId, currentYear, currentMonth);
      return target ? {
        totalSales: target.targetSales,
        averageProfitMargin: target.targetProfitMargin
      } : null;
    }
  }, [selectedStoreId, currentYear, currentMonth, getAllStoresTarget, getTarget]);

  // 目標達成状況
  const targetAnalysis = useMemo(() => {
    if (!targetData || totals.sales === 0) return null;

    const salesAchievement = (totals.sales / targetData.totalSales) * 100;
    const profitMarginAchievement = totals.sales > 0 
      ? ((totals.profit / totals.sales * 100) / targetData.averageProfitMargin) * 100
      : 0;

    return {
      salesTarget: targetData.totalSales,
      salesAchievement,
      profitMarginTarget: targetData.averageProfitMargin,
      profitMarginAchievement,
      salesGap: totals.sales - targetData.totalSales,
      isProfitMarginOnTarget: profitMarginAchievement >= 100
    };
  }, [targetData, totals]);

  // 前期比較（同期間の前の期間と比較）
  const previousPeriodComparison = useMemo(() => {
    if (aggregatedData.length < 2) return null;

    const currentPeriod = aggregatedData.slice(-Math.ceil(aggregatedData.length / 2));
    const previousPeriod = aggregatedData.slice(0, Math.floor(aggregatedData.length / 2));

    const currentTotal = currentPeriod.reduce((acc, curr) => acc + curr.sales, 0);
    const previousTotal = previousPeriod.reduce((acc, curr) => acc + curr.sales, 0);

    if (previousTotal === 0) return null;

    const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
    return { currentTotal, previousTotal, growthRate };
  }, [aggregatedData]);

  const formatPeriodLabel = (period: string) => {
    switch (selectedPeriod) {
      case 'daily':
        return new Date(period).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'weekly':
        const weekStart = new Date(period);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}週`;
      case 'monthly':
        const [year, month] = period.split('-');
        return `${year}年${month}月`;
      default:
        return period;
    }
  };

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 期間・範囲選択 */}
          <div className="lg:col-span-2">
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
            />
          </div>

          {/* 店舗選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象店舗
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">（全店舗）</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 目標vs実績サマリー */}
      {targetAnalysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              目標 vs 実績（{currentYear}年{currentMonth}月）
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 売上目標達成状況 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">売上目標達成状況</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">実績:</span>
                  <span className="font-medium">{formatCurrency(totals.sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">目標:</span>
                  <span className="font-medium">{formatCurrency(targetAnalysis.salesTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">達成率:</span>
                  <span className={`font-bold ${
                    targetAnalysis.salesAchievement >= 100 ? 'text-green-600' : 
                    targetAnalysis.salesAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {targetAnalysis.salesAchievement.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      targetAnalysis.salesAchievement >= 100 ? 'bg-green-500' : 
                      targetAnalysis.salesAchievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(targetAnalysis.salesAchievement, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">差額:</span>
                  <span className={`font-medium ${
                    targetAnalysis.salesGap >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {targetAnalysis.salesGap >= 0 ? '+' : ''}{formatCurrency(targetAnalysis.salesGap)}
                  </span>
                </div>
              </div>
            </div>

            {/* 利益率目標達成状況 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">利益率目標達成状況</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">実績:</span>
                  <span className="font-medium">
                    {formatPercent((totals.profit / totals.sales))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">目標:</span>
                  <span className="font-medium">
                    {formatPercent(targetAnalysis.profitMarginTarget / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">達成率:</span>
                  <span className={`font-bold ${
                    targetAnalysis.profitMarginAchievement >= 100 ? 'text-green-600' : 
                    targetAnalysis.profitMarginAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {targetAnalysis.profitMarginAchievement.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      targetAnalysis.profitMarginAchievement >= 100 ? 'bg-green-500' : 
                      targetAnalysis.profitMarginAchievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(targetAnalysis.profitMarginAchievement, 100)}%` }}
                  ></div>
                </div>
                {!targetAnalysis.isProfitMarginOnTarget && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs text-yellow-800">
                      利益率改善が必要です
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総売上</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.sales)}</p>
              {targetAnalysis && (
                <p className="text-xs text-gray-500">
                  目標: {formatCurrency(targetAnalysis.salesTarget)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <PieChart className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総経費</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.expenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${totals.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {totals.profit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">営業利益</p>
              <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.profit)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">報告件数</p>
              <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
              {previousPeriodComparison && (
                <p className={`text-sm ${previousPeriodComparison.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  前期比 {previousPeriodComparison.growthRate >= 0 ? '+' : ''}{previousPeriodComparison.growthRate.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 推移テーブル */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedPeriod === 'daily' ? '日別' : selectedPeriod === 'weekly' ? '週別' : '月別'}推移
            ({selectedRange === 'week' ? '過去1週間' : 
              selectedRange === 'month' ? '過去1ヶ月' : 
              selectedRange === 'quarter' ? '過去3ヶ月' : '過去1年'})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  売上
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  経費
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  営業利益
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  利益率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  報告数
                </th>
                {targetAnalysis && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    目標達成率
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aggregatedData.slice(-10).reverse().map((data) => (
                <tr key={data.period} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPeriodLabel(data.period)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(data.sales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(data.expenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={data.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(data.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={
                      data.profitMargin >= 15 ? 'text-green-600' : 
                      data.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {formatPercent(data.profitMargin / 100)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.count}件
                  </td>
                  {targetAnalysis && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.period === aggregatedData[aggregatedData.length - 1]?.period ? (
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${
                            targetAnalysis.salesAchievement >= 100 ? 'text-green-600' : 
                            targetAnalysis.salesAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            売上: {targetAnalysis.salesAchievement.toFixed(1)}%
                          </div>
                          <div className={`text-xs font-medium ${
                            targetAnalysis.profitMarginAchievement >= 100 ? 'text-green-600' : 
                            targetAnalysis.profitMarginAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            利益率: {targetAnalysis.profitMarginAchievement.toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart 
          reports={filteredReports} 
          targetSales={targetAnalysis?.salesTarget}
        />
        <ExpenseChart reports={filteredReports} />
      </div>
    </div>
  );
};