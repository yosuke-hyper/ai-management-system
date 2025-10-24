import React, { useState, useMemo } from 'react';
import { DailyReport } from '../../types';
import { formatDate, formatCurrency, calculateTotalExpenses, calculateOperatingProfit } from '../../utils/calculations';
import { Eye, Edit, Trash2, Search, SortAsc, SortDesc, ChevronLeft, ChevronRight, Filter, Calendar, Store } from 'lucide-react';

interface ReportsTableProps {
  reports: DailyReport[];
  stores: Array<{ id: string; name: string; }>;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({ reports, stores }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // デフォルトは今月
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sortField, setSortField] = useState<'date' | 'storeName' | 'sales' | 'profit'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 15;

  // 利用可能な月のリストを生成
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    reports.forEach(report => {
      const date = new Date(report.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    const sortedMonths = Array.from(months).sort().reverse(); // 新しい月から順に
    return sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return {
        value: month,
        label: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
      };
    });
  }, [reports]);

  // フィルタリング処理
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // 検索条件
      const matchesSearch = 
        (report.storeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.staffName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(report.date).includes(searchTerm);

      // 店舗フィルタ
      const matchesStore = selectedStoreId === 'all' || report.storeId === selectedStoreId;

      // 月フィルタ
      const reportMonth = report.date.substring(0, 7); // YYYY-MM
      const matchesMonth = reportMonth === selectedMonth;

      return matchesSearch && matchesStore && matchesMonth;
    });
  }, [reports, searchTerm, selectedStoreId, selectedMonth]);

  // ソート処理
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'storeName':
          aValue = a.storeName;
          bValue = b.storeName;
          break;
        case 'sales':
          aValue = a.sales;
          bValue = b.sales;
          break;
        case 'profit':
          const aTotalExpenses = calculateTotalExpenses(a);
          const bTotalExpenses = calculateTotalExpenses(b);
          aValue = calculateOperatingProfit(a.sales, aTotalExpenses);
          bValue = calculateOperatingProfit(b.sales, bTotalExpenses);
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredReports, sortField, sortDirection]);

  // ページネーション
  const totalPages = Math.ceil(sortedReports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const currentReports = sortedReports.slice(startIndex, endIndex);

  // 集計データ計算
  const summary = useMemo(() => {
    const totalSales = filteredReports.reduce((sum, report) => sum + report.sales, 0);
    const totalExpenses = filteredReports.reduce((sum, report) => sum + calculateTotalExpenses(report), 0);
    const totalProfit = totalSales - totalExpenses;
    const avgProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return { totalSales, totalExpenses, totalProfit, avgProfitMargin };
  }, [filteredReports]);

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-4 h-4 ml-1" /> : 
      <SortDesc className="w-4 h-4 ml-1" />;
  };

  // フィルタ変更時にページをリセット
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedStoreId, selectedMonth, searchTerm]);

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">報告がありません</h3>
        <p className="text-gray-500">「新規報告」ボタンから最初の報告を作成してください。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ヘッダーとフィルタ */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">日次報告一覧</h3>
            
            {/* 検索バー */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="スタッフ名、メモで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
          </div>

          {/* フィルタ行 */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* 店舗フィルタ */}
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gray-500" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-40"
              >
                <option value="all">（全店舗）</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 月フィルタ */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-32"
              >
                {availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* フィルタリセット */}
            <button
              onClick={() => {
                setSelectedStoreId('all');
                setSearchTerm('');
                const now = new Date();
                setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              フィルタクリア
            </button>
          </div>

          {/* 集計サマリー */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">売上合計</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalSales)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">経費合計</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">営業利益</p>
                <p className={`text-lg font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">平均利益率</p>
                <p className={`text-lg font-bold ${
                  summary.avgProfitMargin >= 15 ? 'text-green-600' : 
                  summary.avgProfitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {summary.avgProfitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 結果表示 */}
          <div className="text-sm text-gray-600">
            {filteredReports.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredReports.length)}件を表示
            <span className="ml-2 text-blue-600 font-medium">
              {selectedStoreId === 'all' ? '（全店舗）' : 
               stores.find(s => s.id === selectedStoreId)?.name || ''}
            </span>
            {(selectedStoreId !== 'all' || searchTerm) && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                フィルタ適用中
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  日付
                  <SortIcon field="date" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('storeName')}
              >
                <div className="flex items-center">
                  店舗
                  <SortIcon field="storeName" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                スタッフ
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sales')}
              >
                <div className="flex items-center">
                  売上
                  <SortIcon field="sales" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                経費合計
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('profit')}
              >
                <div className="flex items-center">
                  営業利益
                  <SortIcon field="profit" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                利益率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentReports.map((report) => {
              const totalExpenses = calculateTotalExpenses(report);
              const operatingProfit = calculateOperatingProfit(report.sales, totalExpenses);
              const profitMargin = (operatingProfit / report.sales) * 100;
              
              return (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(report.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {report.storeName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.staffName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(report.sales)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(operatingProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={profitMargin >= 15 ? 'text-green-600' : profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                        title="詳細表示"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-800 transition-colors p-1 rounded hover:bg-green-50"
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              ページ {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                前へ
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* データなしの場合 */}
      {filteredReports.length === 0 && reports.length > 0 && (
        <div className="p-12 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">該当する報告がありません</h3>
          <p className="text-gray-500">検索条件やフィルタを変更してください。</p>
        </div>
      )}
    </div>
  );
};