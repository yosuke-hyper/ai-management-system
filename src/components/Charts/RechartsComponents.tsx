import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { DailyReport } from '@/types';

interface SalesChartProps {
  reports: DailyReport[];
  period?: 'daily' | 'weekly' | 'monthly';
  onPeriodChange?: (period: 'daily' | 'weekly' | 'monthly') => void;
}

export const SalesChart: React.FC<SalesChartProps> = ({ 
  reports, 
  period = 'daily',
  onPeriodChange 
}) => {
  // データを期間別に集計
  const chartData = React.useMemo(() => {
    const groupedData = new Map();
    
    reports.forEach(report => {
      const date = new Date(report.date);
      let key: string;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, { 
          date: key, 
          sales: 0, 
          expenses: 0, 
          profit: 0,
          storeCount: new Set()
        });
      }
      
      const data = groupedData.get(key);
      const totalExpenses = report.purchase + report.laborCost + report.utilities + 
                           report.promotion + report.cleaning + report.misc + 
                           report.communication + report.others;
      
      data.sales += report.sales;
      data.expenses += totalExpenses;
      data.profit = data.sales - data.expenses;
      data.storeCount.add(report.storeId);
    });
    
    return Array.from(groupedData.values())
      .map(item => ({
        ...item,
        storeCount: item.storeCount.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // 最新30データポイント
  }, [reports, period]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `${date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}週`;
      case 'monthly':
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
      default:
        return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">売上推移</CardTitle>
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
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'sales' ? '売上' : name === 'expenses' ? '経費' : '利益'
              ]}
              labelFormatter={(label) => formatDate(label)}
            />
            <Area 
              type="monotone" 
              dataKey="sales" 
              stackId="1"
              stroke="#3b82f6" 
              fill="url(#salesGradient)"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stackId="2"
              stroke="#10b981" 
              fill="url(#profitGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface ExpenseChartProps {
  reports: DailyReport[];
  period?: 'daily' | 'weekly' | 'monthly';
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ reports, period = 'monthly' }) => {
  const expenseData = React.useMemo(() => {
    // 全店舗のデータを合計
    const totals = reports.reduce((acc, report) => ({
      purchase: acc.purchase + report.purchase,
      laborCost: acc.laborCost + report.laborCost,
      utilities: acc.utilities + report.utilities,
      promotion: acc.promotion + report.promotion,
      cleaning: acc.cleaning + report.cleaning,
      misc: acc.misc + report.misc,
      communication: acc.communication + report.communication,
      others: acc.others + report.others
    }), {
      purchase: 0,
      laborCost: 0,
      utilities: 0,
      promotion: 0,
      cleaning: 0,
      misc: 0,
      communication: 0,
      others: 0
    });

    return [
      { name: '仕入', value: totals.purchase, color: '#ef4444' },
      { name: '人件費', value: totals.laborCost, color: '#f97316' },
      { name: '光熱費', value: totals.utilities, color: '#3b82f6' },
      { name: '販促費', value: totals.promotion, color: '#10b981' },
      { name: '清掃費', value: totals.cleaning, color: '#8b5cf6' },
      { name: '通信費', value: totals.communication, color: '#06b6d4' },
      { name: '雑費', value: totals.misc, color: '#f59e0b' },
      { name: 'その他', value: totals.others, color: '#6b7280' }
    ].filter(item => item.value > 0);
  }, [reports, period]);

  const total = expenseData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">経費内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expenseData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
            >
              {expenseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [
                formatCurrency(value),
                `${((value / total) * 100).toFixed(1)}%`
              ]}
            />
            <Legend 
              formatter={(value, entry) => `${value} (${formatCurrency(entry.payload?.value || 0)})`}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};