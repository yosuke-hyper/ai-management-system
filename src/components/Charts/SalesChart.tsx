import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { DailyReport } from '../../types';
import { formatDate, formatCurrency } from '../../utils/calculations';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface SalesChartProps {
  reports: DailyReport[];
  targetSales?: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({ reports, targetSales }) => {
  // 日付別にグループ化して集計
  const groupedData = reports.reduce((acc, report) => {
    if (!acc[report.date]) {
      acc[report.date] = { sales: 0, expenses: 0 };
    }
    acc[report.date].sales += report.sales;
    acc[report.date].expenses += (report.purchase + report.laborCost + report.utilities + 
      report.promotion + report.cleaning + report.misc + report.communication + report.others);
    return acc;
  }, {} as Record<string, { sales: number; expenses: number }>);

  const sortedDates = Object.keys(groupedData).sort();
  const salesData = sortedDates.map(date => groupedData[date].sales);
  const profitData = sortedDates.map(date => groupedData[date].sales - groupedData[date].expenses);

  if (sortedDates.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">データがありません</h3>
        <p className="text-gray-500">報告を作成するとチャートが表示されます。</p>
      </div>
    );
  }

  // 目標ライン用データ
  const targetLineData = targetSales && sortedDates.length > 0 
    ? sortedDates.map(() => targetSales / sortedDates.length) // 日割り目標
    : null;

  const datasets = [
    {
      label: '売上',
      data: salesData,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
    },
    {
      label: '営業利益',
      data: profitData,
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 1,
    }
  ];

  // 目標ラインを追加
  if (targetLineData) {
    datasets.push({
      label: '売上目標（日割り）',
      data: targetLineData,
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 2,
      borderDash: [5, 5],
      type: 'line' as const,
      pointRadius: 0,
      fill: false,
    } as any);
  }

  const data = {
    labels: sortedDates.map(date => formatDate(date)),
    datasets
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: targetSales ? '売上と営業利益の推移（目標ライン付き）' : '売上と営業利益の推移',
        font: {
          size: 16,
          weight: 'bold' as const,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {targetSales && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500 border-dashed border border-red-500"></div>
            <span className="text-sm text-red-700">
              月間売上目標: {formatCurrency(targetSales)}（赤破線で表示）
            </span>
          </div>
        </div>
      )}
      <Bar data={data} options={options} />
    </div>
  );
};