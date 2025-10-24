import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { DailyReport } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseChartProps {
  reports: DailyReport[];
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ reports }) => {
  // 直近7日間の報告から経費データを集計
  const recentReports = reports.slice(0, 10); // 最新10件
  
  const expenseData = recentReports.reduce((acc, report) => {
    acc.purchase += report.purchase;
    acc.laborCost += report.laborCost;
    acc.utilities += report.utilities;
    acc.promotion += report.promotion;
    acc.cleaning += report.cleaning;
    acc.misc += report.misc;
    acc.communication += report.communication;
    acc.others += report.others;
    return acc;
  }, {
    purchase: 0,
    laborCost: 0,
    utilities: 0,
    promotion: 0,
    cleaning: 0,
    misc: 0,
    communication: 0,
    others: 0
  });

  const totalExpenses = Object.values(expenseData).reduce((sum, val) => sum + val, 0);

  if (totalExpenses === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">経費データがありません</h3>
        <p className="text-gray-500">経費を含む報告を作成するとチャートが表示されます。</p>
      </div>
    );
  }

  const data = {
    labels: ['仕入', '人件費', '光熱費', '広告費', '清掃費', '雑費', '通信費', 'その他'],
    datasets: [
      {
        data: [
          expenseData.purchase,
          expenseData.laborCost,
          expenseData.utilities,
          expenseData.promotion,
          expenseData.cleaning,
          expenseData.misc,
          expenseData.communication,
          expenseData.others
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)'
        ],
        borderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: '経費内訳（最新データ）',
        font: {
          size: 16,
          weight: 'bold' as const,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ¥${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Pie data={data} options={options} />
    </div>
  );
};