import { DailyReport, SummaryData } from '../types';

// 経費の合計を計算
export const calculateTotalExpenses = (report: DailyReport): number => {
  return report.purchase + report.laborCost + report.utilities +
         report.rent + report.consumables + report.promotion +
         report.cleaning + report.misc + report.communication + report.others;
};

// 粗利益を計算
export const calculateGrossProfit = (sales: number, purchase: number): number => {
  return Math.round(sales - purchase);
};

// 営業利益を計算
export const calculateOperatingProfit = (sales: number, totalExpenses: number): number => {
  return Math.round(sales - totalExpenses);
};

// 利益率を計算
export const calculateProfitMargin = (operatingProfit: number, sales: number): number => {
  return sales > 0 ? (operatingProfit / sales) * 100 : 0;
};

// 日次データから集計データを生成
export const generateSummaryFromReports = (reports: DailyReport[]): SummaryData[] => {
  const summaryMap = new Map<string, {
    totalSales: number;
    totalExpenses: number;
    purchase: number;
  }>();

  reports.forEach(report => {
    const key = report.date;
    const existing = summaryMap.get(key) || { totalSales: 0, totalExpenses: 0, purchase: 0 };
    
    const expenses = calculateTotalExpenses(report);
    summaryMap.set(key, {
      totalSales: existing.totalSales + report.sales,
      totalExpenses: existing.totalExpenses + expenses,
      purchase: existing.purchase + report.purchase
    });
  });

  return Array.from(summaryMap.entries()).map(([period, data]) => ({
    period,
    totalSales: data.totalSales,
    totalExpenses: data.totalExpenses,
    grossProfit: calculateGrossProfit(data.totalSales, data.purchase),
    operatingProfit: calculateOperatingProfit(data.totalSales, data.totalExpenses),
    profitMargin: calculateProfitMargin(
      calculateOperatingProfit(data.totalSales, data.totalExpenses), 
      data.totalSales
    )
  }));
};

// 日付フォーマット
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 通貨フォーマット
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
};

// パーセンテージフォーマット
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};