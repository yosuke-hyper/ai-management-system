import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { DailyReport } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface EditReportModalProps {
  report: DailyReport;
  isOpen: boolean;
  onClose: () => void;
  onSave: (reportId: string, updates: Record<string, any>) => Promise<void>;
}

interface EditFormData {
  sales: number;
  purchase: number;
  labor_cost: number;
  utilities: number;
  promotion: number;
  cleaning: number;
  misc: number;
  communication: number;
  others: number;
  customers: number;
  lunch_customers?: number;
  dinner_customers?: number;
  report_text: string;
}

export const EditReportModal: React.FC<EditReportModalProps> = ({
  report,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<EditFormData>({
    sales: 0,
    purchase: 0,
    labor_cost: 0,
    utilities: 0,
    promotion: 0,
    cleaning: 0,
    misc: 0,
    communication: 0,
    others: 0,
    customers: 0,
    lunch_customers: 0,
    dinner_customers: 0,
    report_text: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (report) {
      setFormData({
        sales: report.sales || 0,
        purchase: report.purchase || 0,
        labor_cost: report.laborCost || 0,
        utilities: report.utilities || 0,
        promotion: report.promotion || 0,
        cleaning: report.cleaning || 0,
        misc: report.misc || 0,
        communication: report.communication || 0,
        others: report.others || 0,
        customers: report.customers || 0,
        lunch_customers: report.lunchCustomers || 0,
        dinner_customers: report.dinnerCustomers || 0,
        report_text: report.reportText || '',
      });
      setErrors({});
    }
  }, [report, isOpen]);

  const handleInputChange = (field: keyof EditFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const numericFields: (keyof EditFormData)[] = [
      'sales',
      'purchase',
      'labor_cost',
      'utilities',
      'promotion',
      'cleaning',
      'misc',
      'communication',
      'others',
      'customers',
      'lunch_customers',
      'dinner_customers',
    ];

    numericFields.forEach((field) => {
      const value = formData[field];
      if (typeof value === 'number' && value < 0) {
        newErrors[field] = '0以上の値を入力してください';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await onSave(report.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save report:', error);
      setErrors({ _general: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">日次レポート編集</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(report.date).toLocaleDateString('ja-JP')} - {report.storeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {errors._general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors._general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                売上 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.sales}
                onChange={(e) => handleInputChange('sales', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.sales ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                disabled={isSaving}
              />
              {errors.sales && <p className="text-sm text-red-600 mt-1">{errors.sales}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客数
              </label>
              <input
                type="number"
                value={formData.customers}
                onChange={(e) => handleInputChange('customers', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">経費内訳</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'purchase', label: '仕入れ' },
                { key: 'labor_cost', label: '人件費' },
                { key: 'utilities', label: '光熱費' },
                { key: 'promotion', label: '販促費' },
                { key: 'cleaning', label: '清掃費' },
                { key: 'misc', label: '雑費' },
                { key: 'communication', label: '通信費' },
                { key: 'others', label: 'その他' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={formData[key as keyof EditFormData] as number}
                    onChange={(e) =>
                      handleInputChange(key as keyof EditFormData, parseInt(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[key] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min="0"
                    disabled={isSaving}
                  />
                  {errors[key] && <p className="text-sm text-red-600 mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>

          {(formData.lunch_customers !== undefined || formData.dinner_customers !== undefined) && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">時間帯別客数</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ランチ客数
                  </label>
                  <input
                    type="number"
                    value={formData.lunch_customers || 0}
                    onChange={(e) =>
                      handleInputChange('lunch_customers', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ディナー客数
                  </label>
                  <input
                    type="number"
                    value={formData.dinner_customers || 0}
                    onChange={(e) =>
                      handleInputChange('dinner_customers', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考・メモ
            </label>
            <textarea
              value={formData.report_text}
              onChange={(e) => handleInputChange('report_text', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
