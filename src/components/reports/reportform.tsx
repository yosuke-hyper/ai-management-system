import React, { useState } from 'react';
import { Store } from '../../lib/supabase';
import { Save, X, FileSpreadsheet, CheckCircle, AlertCircle, Calculator, RefreshCw, Pen as Yen, TrendingUp, Users } from 'lucide-react';

interface ReportFormProps {
  selectedStore?: Store | null;
  availableStores?: Store[];
  onSubmit: (reportData: any) => void;
  onCancel: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ selectedStore, availableStores = [], onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [sheetsStatus, setSheetsStatus] = useState<{
    syncing: boolean;
    success: boolean | null;
    message: string;
  }>({ syncing: false, success: null, message: '' });
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    storeId: selectedStore?.id || '',
    storeName: selectedStore?.name || '',
    staffName: 'デモスタッフ',
    sales: 0,
    purchase: 0,
    laborCost: 0,
    utilities: 0,
    promotion: 0,
    cleaning: 0,
    misc: 0,
    communication: 0,
    others: 0,
    reportText: ''
  });

  // Update store info when storeId changes
  React.useEffect(() => {
    if (formData.storeId) {
      const store = availableStores.find(s => s.id === formData.storeId);
      if (store) {
        setFormData(prev => ({ ...prev, storeName: store.name }));
      }
    }
  }, [formData.storeId, availableStores]);

  // 自動計算機能
  const calculateTotals = () => {
    const totalExpenses = formData.purchase + formData.laborCost + formData.utilities + 
                         formData.promotion + formData.cleaning + formData.misc + 
                         formData.communication + formData.others;
    const grossProfit = formData.sales - formData.purchase;
    const operatingProfit = formData.sales - totalExpenses;
    const profitMargin = formData.sales > 0 ? (operatingProfit / formData.sales * 100) : 0;
    
    return { totalExpenses, grossProfit, operatingProfit, profitMargin };
  };

  const totals = calculateTotals();

  // バリデーション関数
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.date) {
      errors.date = '日付を選択してください';
    }

    if (!formData.storeId && !selectedStore?.id) {
      errors.store = '店舗を選択してください';
    }

    if (!formData.staffName.trim()) {
      errors.staffName = 'スタッフ名を入力してください';
    }

    if (formData.sales <= 0) {
      errors.sales = '売上は1円以上で入力してください';
    }

    if (formData.sales > 10000000) {
      errors.sales = '売上が非常に高い値です。確認してください';
    }

    // 経費が売上を超えている場合の警告
    if (totals.totalExpenses > formData.sales) {
      errors.expenses = '経費合計が売上を超えています';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // フィールドクリア機能
  const clearExpenses = () => {
    setFormData(prev => ({
      ...prev,
      purchase: 0,
      laborCost: 0,
      utilities: 0,
      promotion: 0,
      cleaning: 0,
      misc: 0,
      communication: 0,
      others: 0
    }));
  };

  // 数値フォーマット関数
  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  // 数値入力コンポーネント
  const NumberInput = ({ 
    label, 
    value, 
    onChange, 
    placeholder = "0",
    error,
    required = false,
    icon: IconComponent,
    hint
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    icon?: any;
    hint?: string;
  }) => (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        {IconComponent && <IconComponent className="w-4 h-4" />}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === 0 ? '' : formatNumber(value)}
          onChange={(e) => {
            const numericValue = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
            onChange(numericValue);
          }}
          className={`w-full pl-3 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right font-mono text-lg ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm font-medium">円</span>
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('入力内容を確認してください');
      return;
    }

    setLoading(true);
    setError('');
    setSheetsStatus({ syncing: true, success: null, message: 'Google Sheetsに同期中...' });

    try {
      await onSubmit({
        ...formData,
        storeId: formData.storeId || selectedStore?.id,
        lineUserId: undefined
      });
      
      // Google Sheets同期の結果を表示
      setSheetsStatus({ 
        syncing: false, 
        success: true, 
        message: '✓ 報告とGoogle Sheetsへの同期が完了しました' 
      });
      
      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        onCancel();
      }, 1500);
      
    } catch (err) {
      console.error('Report submission error:', err);
      setError('エラーが発生しました。しばらくしてから再度お試しください。');
      setSheetsStatus({ 
        syncing: false, 
        success: false, 
        message: '⚠ 報告は作成されましたが、Google Sheets同期でエラーが発生しました' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    if (error) {
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">日次報告作成</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報セクション */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              基本情報
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日付 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.date && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗
                </label>
                {availableStores.length > 1 ? (
                  <>
                    <select
                      required
                      value={formData.storeId}
                      onChange={(e) => handleInputChange('storeId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">店舗を選択してください</option>
                      {availableStores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.store && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.store}</p>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      disabled
                      value={formData.storeName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      placeholder="店舗名"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      選択された店舗: {selectedStore?.name || '未選択'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スタッフ名 *
              </label>
              <input
                type="text"
                required
                value={formData.staffName}
                onChange={(e) => handleInputChange('staffName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.staffName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="報告者名を入力"
              />
              {validationErrors.staffName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.staffName}</p>
              )}
            </div>
          </div>

          {/* 売上セクション */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Yen className="w-5 h-5 text-green-600" />
              売上情報
            </h3>
            <NumberInput
              label="本日の売上"
              value={formData.sales}
              onChange={(value) => handleInputChange('sales', value)}
              placeholder="150,000"
              error={validationErrors.sales}
              required
              icon={Yen}
              hint="税込み売上金額を入力してください"
            />
          </div>

          {/* 経費セクション */}
          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-red-600" />
                経費項目
              </h3>
              <button
                type="button"
                onClick={clearExpenses}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                クリア
              </button>
            </div>
            
            {validationErrors.expenses && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">{validationErrors.expenses}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput
                label="仕入・材料費"
                value={formData.purchase}
                onChange={(value) => handleInputChange('purchase', value)}
                placeholder="80,000"
                hint="食材・飲料の仕入れ費用"
              />
              <NumberInput
                label="人件費"
                value={formData.laborCost}
                onChange={(value) => handleInputChange('laborCost', value)}
                placeholder="60,000"
                hint="アルバイト代・給料等"
              />
              <NumberInput
                label="光熱費"
                value={formData.utilities}
                onChange={(value) => handleInputChange('utilities', value)}
                placeholder="15,000"
                hint="電気・ガス・水道代"
              />
              <NumberInput
                label="広告・宣伝費"
                value={formData.promotion}
                onChange={(value) => handleInputChange('promotion', value)}
                placeholder="8,000"
                hint="チラシ・ネット広告等"
              />
              <NumberInput
                label="清掃費"
                value={formData.cleaning}
                onChange={(value) => handleInputChange('cleaning', value)}
                placeholder="5,000"
                hint="清掃用品・クリーニング"
              />
              <NumberInput
                label="通信費"
                value={formData.communication}
                onChange={(value) => handleInputChange('communication', value)}
                placeholder="3,000"
                hint="電話・インターネット代"
              />
              <NumberInput
                label="雑費"
                value={formData.misc}
                onChange={(value) => handleInputChange('misc', value)}
                placeholder="2,000"
                hint="文房具・消耗品等"
              />
              <NumberInput
                label="その他経費"
                value={formData.others}
                onChange={(value) => handleInputChange('others', value)}
                placeholder="1,000"
                hint="上記以外の支出"
              />
            </div>
          </div>

          {/* 計算結果セクション */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              計算結果
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-600 mb-1">経費合計</p>
                <p className="text-xl font-bold text-red-600">{formatNumber(totals.totalExpenses)}円</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">粗利益</p>
                <p className={`text-xl font-bold ${totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(totals.grossProfit)}円
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">営業利益</p>
                <p className={`text-xl font-bold ${totals.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(totals.operatingProfit)}円
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">利益率</p>
                <p className={`text-xl font-bold ${totals.profitMargin >= 15 ? 'text-green-600' : totals.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {totals.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 報告内容セクション */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              📝
              報告内容・特記事項
            </label>
            <textarea
              value={formData.reportText}
              onChange={(e) => handleInputChange('reportText', e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="本日の特記事項や気づいた点などを記入してください..."
            />
          </div>

          {/* Google Sheets同期状態 */}
          <div className={`border rounded-lg p-3 ${
            sheetsStatus.success === true ? 'bg-green-50 border-green-200' :
            sheetsStatus.success === false ? 'bg-red-50 border-red-200' :
            sheetsStatus.syncing ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Google Sheets連携</span>
            </div>
            {sheetsStatus.message && (
              <p className="mt-1 text-sm text-gray-600">{sheetsStatus.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-base font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center gap-2 text-base font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  報告を送信
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};