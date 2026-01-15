import React, { useState } from 'react';
import { Target, Save, X, Building, Calendar, TrendingUp, Pen as Yen, Plus, CreditCard as Edit, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { type TargetTemplate } from '@/lib/targettemplates';
import { TemplateSelector } from './templateselector';
import type { Store, TargetData } from '@/types';

interface TargetSettingsProps {
  stores: Store[];
  onClose: () => void;
  existingTargets?: Array<{
    storeId: string;
    period: string;
    targetSales: number;
    targetProfitMargin: number;
    targetCostRate?: number;
    targetLaborRate?: number;
  }>;
  onSaved?: () => void;
  upsertTarget?: (target: TargetData) => Promise<void>;
  deleteTarget?: (storeId: string, period: string) => Promise<void>;
}

export const TargetSettings: React.FC<TargetSettingsProps> = ({
  stores,
  onClose,
  existingTargets = [],
  onSaved,
  upsertTarget: upsertTargetProp,
  deleteTarget: deleteTargetProp
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showOnlyConfigured, setShowOnlyConfigured] = useState(false);
  const [formData, setFormData] = useState({
    targetSales: 0,
    targetProfitMargin: 0,
    targetCostRate: 0,
    targetLaborRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const getTarget = (storeId: string, year: number, month: number) => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    return existingTargets.find(t => t.storeId === storeId && t.period === period);
  };

  const startEditing = (storeId: string) => {
    const existingTarget = getTarget(storeId, selectedYear, selectedMonth);
    setEditingStoreId(storeId);
    setFormData({
      targetSales: existingTarget?.targetSales || 8000000,
      targetProfitMargin: existingTarget?.targetProfitMargin || 20,
      targetCostRate: existingTarget?.targetCostRate || 30,
      targetLaborRate: existingTarget?.targetLaborRate || 25
    });
  };

  const cancelEditing = () => {
    setEditingStoreId(null);
    setFormData({ targetSales: 0, targetProfitMargin: 0, targetCostRate: 0, targetLaborRate: 0 });
  };

  const handleSave = async () => {
    if (!editingStoreId) return;

    const store = stores.find(s => s.id === editingStoreId);
    if (!store) return;

    if (formData.targetSales <= 0) {
      showNotification('error', '目標売上は1円以上で入力してください');
      return;
    }

    if (formData.targetProfitMargin <= 0 || formData.targetProfitMargin > 100) {
      showNotification('error', '目標営業利益率は1-100%で入力してください');
      return;
    }

    if (formData.targetCostRate < 0 || formData.targetCostRate > 100) {
      showNotification('error', '目標原価率は0-100%で入力してください');
      return;
    }

    if (formData.targetLaborRate < 0 || formData.targetLaborRate > 100) {
      showNotification('error', '目標人件費率は0-100%で入力してください');
      return;
    }

    setLoading(true);

    const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const targetProfit = Math.round(formData.targetSales * (formData.targetProfitMargin / 100));

    try {
      if (upsertTargetProp) {
        await upsertTargetProp({
          storeId: editingStoreId,
          period,
          targetSales: formData.targetSales,
          targetProfit,
          targetProfitMargin: formData.targetProfitMargin,
          targetCostRate: formData.targetCostRate,
          targetLaborRate: formData.targetLaborRate
        });
        showNotification('success', `${store.name}の目標を設定しました`);
        setEditingStoreId(null);
        onSaved?.();
      } else {
        showNotification('error', 'データ保存機能が利用できません');
      }
    } catch (error: any) {
      showNotification('error', error?.message ?? 'データの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    if (confirm(`${store.name}の目標を削除しますか？`)) {
      setLoading(true);
      const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

      try {
        if (deleteTargetProp) {
          await deleteTargetProp(storeId, period);
          showNotification('success', `${store.name}の目標を削除しました`);
          onSaved?.();
        } else {
          showNotification('error', 'データ削除機能が利用できません');
        }
      } catch (error: any) {
        showNotification('error', error?.message ?? 'データの削除に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const applyTemplate = (template: TargetTemplate) => {
    setFormData(prev => ({
      ...prev,
      targetProfitMargin: template.targetProfitMargin,
      targetCostRate: template.targetCostRate,
      targetLaborRate: template.targetLaborRate
    }));
    setShowTemplateModal(false);
    showNotification('success', `「${template.name}」テンプレートを適用しました`);
  };

  // フィルタリングされた店舗リスト
  const filteredStores = showOnlyConfigured
    ? stores.filter(store => {
        const target = getTarget(store.id, selectedYear, selectedMonth);
        return target !== undefined;
      })
    : stores;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">月間目標設定</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {notification && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100'
              : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">対象期間:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500"
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedYear}年{selectedMonth}月の目標設定
              </div>
            </div>
            <button
              onClick={() => setShowOnlyConfigured(!showOnlyConfigured)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showOnlyConfigured
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showOnlyConfigured ? <CheckCircle2 className="w-4 h-4" /> : <Building className="w-4 h-4" />}
              {showOnlyConfigured ? '設定済みのみ' : '全店舗'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {showOnlyConfigured
                  ? `${selectedYear}年${selectedMonth}月の設定済み目標はありません`
                  : '店舗が登録されていません'}
              </p>
              {showOnlyConfigured && (
                <button
                  onClick={() => setShowOnlyConfigured(false)}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  全店舗を表示
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStores.map((store) => {
              const existingTarget = getTarget(store.id, selectedYear, selectedMonth);
              const isEditing = editingStoreId === store.id;

              return (
                <div key={store.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{store.name}</h3>
                      {existingTarget && !isEditing && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-xs">
                          設定済み
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(store.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          {existingTarget ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {existingTarget ? '編集' : '設定'}
                        </button>
                        {existingTarget && (
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            削除
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">目標テンプレート</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              経営スタイル・業種別の標準目標値を簡単適用
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowTemplateModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          テンプレート選択
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Yen className="w-4 h-4" />
                            月間目標売上
                          </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.targetSales === 0 ? '' : formatNumber(formData.targetSales)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                              setFormData(prev => ({ ...prev, targetSales: value }));
                            }}
                            className="w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-mono text-lg"
                            placeholder="8,000,000"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm font-medium">円</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <TrendingUp className="w-4 h-4" />
                          目標営業利益率
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.1"
                            value={formData.targetProfitMargin || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, targetProfitMargin: value }));
                            }}
                            className="w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-mono text-lg"
                            placeholder="20"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm font-medium">%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <TrendingUp className="w-4 h-4" />
                          目標原価率
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.targetCostRate || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, targetCostRate: value }));
                            }}
                            className="w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-mono text-lg"
                            placeholder="30"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm font-medium">%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <TrendingUp className="w-4 h-4" />
                          目標人件費率
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.targetLaborRate || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, targetLaborRate: value }));
                            }}
                            className="w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 text-right font-mono text-lg"
                            placeholder="25"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm font-medium">%</span>
                          </div>
                        </div>
                      </div>

                        <div className="md:col-span-2 flex justify-end gap-3">
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            {loading ? '保存中...' : '保存'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : existingTarget ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">月間目標売上</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(existingTarget.targetSales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">目標営業利益率</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          {existingTarget.targetProfitMargin}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">目標原価率</p>
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                          {existingTarget.targetCostRate || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">目標人件費率</p>
                        <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                          {existingTarget.targetLaborRate || 0}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Target className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>この店舗の目標が設定されていません</p>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>

      {showTemplateModal && editingStoreId && (
        <TemplateSelector
          onSelect={applyTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
};
