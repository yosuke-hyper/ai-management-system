import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Award, Store, Users, Calendar } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/calculations';
import { useTargets } from '../../hooks/useTargets';

interface StoreData {
  id: string;
  name: string;
  sales: number;
  profit: number;
  profitMargin: number;
  reportCount: number;
  averageDailySales: number;
  lastReportDate: string;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number; // percentage change
}

interface StoreComparisonProps {
  stores: StoreData[];
  period: 'daily' | 'weekly' | 'monthly';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly') => void;
  userId?: string | null;
}

export const StoreComparison: React.FC<StoreComparisonProps> = ({
  stores, 
  period, 
  onPeriodChange,
  userId = null
}) => {
  const { getTarget } = useTargets(userId);
  const [sortBy, setSortBy] = useState<'sales' | 'profit' | 'profitMargin' | 'reportCount'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 現在の年月を取得
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // ソート処理
  const sortedStores = [...stores].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSort = (field: typeof sortBy) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 最高値を取得（パーセンテージ表示用）
  const maxSales = Math.max(...stores.map(s => s.sales));
  const maxProfit = Math.max(...stores.map(s => s.profit));

  const periodLabels = {
    daily: '日次',
    weekly: '週次', 
    monthly: '月次'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              店舗別パフォーマンス（{periodLabels[period]}）
            </h3>
          </div>
          
          {/* 期間選択 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 全店舗合計表示 */}
      {stores.length > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">全店舗合計売上</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(stores.reduce((sum, store) => sum + store.sales, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">全店舗合計利益</p>
              <p className={`text-lg font-bold ${
                stores.reduce((sum, store) => sum + store.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stores.reduce((sum, store) => sum + store.profit, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">平均利益率</p>
              <p className="text-lg font-bold text-purple-600">
                {stores.length > 0 ? 
                  formatPercent((stores.reduce((sum, store) => sum + store.profitMargin, 0) / stores.length) / 100) : 
                  '0%'
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">総報告数</p>
              <p className="text-lg font-bold text-gray-600">
                {stores.reduce((sum, store) => sum + store.reportCount, 0)}件
              </p>
            </div>
          </div>
        </div>
      )}

      {stores.length === 0 ? (
        <div className="p-12 text-center">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">データがありません</h4>
          <p className="text-gray-500">店舗の報告データがまだありません。</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  順位
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  店舗名
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sales')}
                >
                  <div className="flex items-center gap-1">
                    売上
                    {sortBy === 'sales' && (
                      sortOrder === 'desc' ? 
                      <TrendingDown className="w-3 h-3" /> : 
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center gap-1">
                    利益
                    {sortBy === 'profit' && (
                      sortOrder === 'desc' ? 
                      <TrendingDown className="w-3 h-3" /> : 
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profitMargin')}
                >
                  <div className="flex items-center gap-1">
                    利益率
                    {sortBy === 'profitMargin' && (
                      sortOrder === 'desc' ? 
                      <TrendingDown className="w-3 h-3" /> : 
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  トレンド
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('reportCount')}
                >
                  <div className="flex items-center gap-1">
                    報告数
                    {sortBy === 'reportCount' && (
                      sortOrder === 'desc' ? 
                      <TrendingDown className="w-3 h-3" /> : 
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStores.map((store, index) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-500' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-400'
                      }`}>
                        #{index + 1}
                      </span>
                      {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Store className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500">
                          最終報告: {new Date(store.lastReportDate).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(store.sales)}
                      </p>
                      {/* 売上バー */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(store.sales / maxSales) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        日平均: {formatCurrency(store.averageDailySales)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <p className={`text-sm font-medium ${
                        store.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(store.profit)}
                      </p>
                      {/* 利益バー */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            store.profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.abs(store.profit) / Math.abs(maxProfit) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={`${
                      store.profitMargin >= 15 ? 'text-green-600' :
                      store.profitMargin >= 10 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {formatPercent(store.profitMargin / 100)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {store.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : store.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                      )}
                      <span className={`text-sm ${
                        store.trend === 'up' ? 'text-green-600' :
                        store.trend === 'down' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {Math.abs(store.trendValue).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{store.reportCount}件</span>
                    </div>
                    
                    {/* 目標達成率表示 */}
                    {(() => {
                      const target = getTarget(store.id, currentYear, currentMonth);
                      if (!target) return null;
                      
                      const salesAchievement = (store.sales / target.targetSales) * 100;
                      const profitMarginAchievement = target.targetProfitMargin > 0 
                        ? (store.profitMargin / target.targetProfitMargin) * 100 
                        : 0;
                      
                      return (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">目標達成率</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>売上: </span>
                              <span className={`font-medium ${
                                salesAchievement >= 100 ? 'text-green-600' : 
                                salesAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {salesAchievement.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>利益率: </span>
                              <span className={`font-medium ${
                                profitMarginAchievement >= 100 ? 'text-green-600' : 
                                profitMarginAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {profitMarginAchievement.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};