import React from 'react';
import { DailyReport } from '../../types';
import { formatDate, formatCurrency, calculateTotalExpenses, calculateOperatingProfit } from '../../utils/calculations';
import { X, Calendar, Store, User, TrendingUp, TrendingDown } from 'lucide-react';

interface ReportDetailProps {
  report: DailyReport;
  onClose: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({ report, onClose }) => {
  const totalExpenses = calculateTotalExpenses(report);
  const operatingProfit = calculateOperatingProfit(report.sales, totalExpenses);
  const grossProfit = report.sales - report.purchase;
  const profitMargin = report.sales > 0 ? (operatingProfit / report.sales * 100) : 0;

  const expenseItems = [
    { label: '仕入', value: report.purchase, color: 'bg-red-100 text-red-800' },
    { label: '人件費', value: report.laborCost, color: 'bg-orange-100 text-orange-800' },
    { label: '光熱費', value: report.utilities, color: 'bg-blue-100 text-blue-800' },
    { label: '広告費', value: report.promotion, color: 'bg-green-100 text-green-800' },
    { label: '清掃費', value: report.cleaning, color: 'bg-purple-100 text-purple-800' },
    { label: '雑費', value: report.misc, color: 'bg-pink-100 text-pink-800' },
    { label: '通信費', value: report.communication, color: 'bg-indigo-100 text-indigo-800' },
    { label: 'その他', value: report.others, color: 'bg-gray-100 text-gray-800' }
  ].filter(item => item.value > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">日次報告詳細</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">日付</p>
                <p className="font-medium">{formatDate(report.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Store className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">店舗</p>
                <p className="font-medium">{report.storeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">報告者</p>
                <p className="font-medium">{report.staffName}</p>
              </div>
            </div>
          </div>

          {/* 財務サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">売上</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(report.sales)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">経費合計</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${operatingProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-600 mb-1">営業利益</p>
              <div className="flex items-center justify-center gap-1">
                {operatingProfit >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-lg font-bold ${operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(operatingProfit)}
                </p>
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">利益率</p>
              <p className={`text-lg font-bold ${
                profitMargin >= 15 ? 'text-green-600' : 
                profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* 経費詳細 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">経費詳細</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {expenseItems.map((item, index) => (
                <div key={index} className={`p-3 rounded-lg ${item.color}`}>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-sm font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 報告内容 */}
          {report.reportText && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">報告内容</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{report.reportText}</p>
              </div>
            </div>
          )}

          {/* 作成日時 */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              作成日時: {new Date(report.createdAt).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};