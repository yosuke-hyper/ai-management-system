import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown 
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { DailyReport } from '@/types';

interface DataTableProps {
  reports: DailyReport[];
  period?: 'daily' | 'weekly' | 'monthly';
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void;
}

type SortField = 'date' | 'storeName' | 'sales' | 'expenses' | 'profit';
type SortDirection = 'asc' | 'desc';

export const DataTable: React.FC<DataTableProps> = ({ 
  reports, 
  period = 'daily',
  onPeriodChange 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 10;

  // データの加工と集計
  const processedData = React.useMemo(() => {
    const groupedData = new Map();
    
    reports.forEach(report => {
      const date = new Date(report.date);
      let key: string;
      let displayDate: string;
      
      switch (period) {
        case 'daily':
          key = `${report.date}-${report.storeId}`;
          displayDate = date.toLocaleDateString('ja-JP');
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.toISOString().split('T')[0]}-${report.storeId}`;
          displayDate = `${weekStart.toLocaleDateString('ja-JP')}週`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${report.storeId}`;
          displayDate = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
          break;
        default:
          key = `${report.date}-${report.storeId}`;
          displayDate = date.toLocaleDateString('ja-JP');
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          id: key,
          date: displayDate,
          storeName: report.storeName,
          sales: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
          reportCount: 0
        });
      }
      
      const data = groupedData.get(key);
      const totalExpenses = report.purchase + report.laborCost + report.utilities + 
                           report.promotion + report.cleaning + report.misc + 
                           report.communication + report.others;
      
      data.sales += report.sales;
      data.expenses += totalExpenses;
      data.profit = data.sales - data.expenses;
      data.profitMargin = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
      data.reportCount += 1;
    });
    
    // 全店舗合計の場合は期間別にデータを再集計
    if (reports.length > 0) {
      const allStoresData = new Map();
      
      Array.from(groupedData.values()).forEach(item => {
        const periodKey = item.date;
        
        if (!allStoresData.has(periodKey)) {
          allStoresData.set(periodKey, {
            id: periodKey,
            date: periodKey,
            storeName: '全店舗合計',
            sales: 0,
            expenses: 0,
            profit: 0,
            profitMargin: 0,
            reportCount: 0
          });
        }
        
        const aggregated = allStoresData.get(periodKey);
        aggregated.sales += item.sales;
        aggregated.expenses += item.expenses;
        aggregated.profit += item.profit;
        aggregated.reportCount += item.reportCount;
        aggregated.profitMargin = aggregated.sales > 0 ? (aggregated.profit / aggregated.sales) * 100 : 0;
      });
      
      return Array.from(allStoresData.values());
    }
    
    return Array.from(groupedData.values());
  }, [reports, period]);

  // ソート処理
  const sortedData = React.useMemo(() => {
    return [...processedData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'date') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [processedData, sortField, sortDirection]);

  // ページネーション
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">詳細レポート</CardTitle>
          {onPeriodChange && (
            <Tabs value={period} onValueChange={(value) => onPeriodChange(value as any)}>
              <TabsList>
                <TabsTrigger value="daily">日次</TabsTrigger>
                <TabsTrigger value="weekly">週次</TabsTrigger>
                <TabsTrigger value="monthly">月次</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paginatedData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">データがありません</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-2 font-medium"
                      >
                        期間
                        <SortIcon field="date" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('storeName')}
                        className="flex items-center gap-2 font-medium"
                      >
                        店舗名
                        <SortIcon field="storeName" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('sales')}
                        className="flex items-center gap-2 font-medium"
                      >
                        売上
                        <SortIcon field="sales" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('expenses')}
                        className="flex items-center gap-2 font-medium"
                      >
                        経費
                        <SortIcon field="expenses" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('profit')}
                        className="flex items-center gap-2 font-medium"
                      >
                        営業利益
                        <SortIcon field="profit" />
                      </Button>
                    </th>
                    <th className="text-left p-3">利益率</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-sm">{row.date}</td>
                      <td className="p-3 text-sm font-medium">{row.storeName}</td>
                      <td className="p-3 text-sm text-blue-600 font-medium">
                        {formatCurrency(row.sales)}
                      </td>
                      <td className="p-3 text-sm text-red-600">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td className={`p-3 text-sm font-medium ${
                        row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className={`p-3 text-sm font-medium ${
                        row.profitMargin >= 15 ? 'text-green-600' : 
                        row.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatPercent(row.profitMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedData.length)} / {sortedData.length}件
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};