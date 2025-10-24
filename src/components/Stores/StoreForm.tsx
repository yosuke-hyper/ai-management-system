import React, { useState, useEffect } from 'react';
import { Store } from '../../lib/supabase';
import { Save, X, MapPin, User, TriangleAlert as AlertTriangle, Building } from 'lucide-react';

interface StoreFormProps {
  store?: Store | null;
  onSubmit: (storeData: {
    name: string;
    address: string;
    managerId?: string;
    managerName?: string;
    isActive?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  loading?: boolean;
}

export const StoreForm: React.FC<StoreFormProps> = ({
  store,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    managerName: '',
    isActive: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // デバッグ: フォーム初期化ログ
  useEffect(() => {
    console.log('🔧 StoreForm: 初期化開始', { store, hasStore: !!store });
    
    if (store) {
      const initialData = {
        name: store.name || '',
        address: store.address || '',
        managerName: (store as any).manager_name || '',
        isActive: store.is_active !== false
      };
      console.log('📝 StoreForm: 編集データ設定', initialData);
      setFormData(initialData);
    } else {
      console.log('🆕 StoreForm: 新規作成モード');
      setFormData({
        name: '',
        address: '',
        managerName: '',
        isActive: true
      });
    }
    setError('');
  }, [store]);

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 基本バリデーション
    if (!formData.name?.trim()) {
      setError('店舗名を入力してください');
      return;
    }

    if (!formData.address?.trim()) {
      setError('住所を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        managerId: undefined,
        managerName: formData.managerName?.trim() || undefined,
        isActive: !!formData.isActive
      };

      const result = await onSubmit(submitData);

      if (!result?.ok) {
        setError(result?.error || '登録に失敗しました');
        return;
      }

      onCancel();
    } catch (e: any) {
      setError(e?.message ?? '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 入力変更ハンドラー
  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('✏️ StoreForm: 入力変更:', { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) {
      setError('');
    }
  };

  // 送信ボタンのクリックハンドラー（デバッグ用）
  const handleSubmitButtonClick = () => {
    console.log('🖱️ StoreForm: 送信ボタンがクリックされました');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {store ? '店舗編集' : '新規店舗作成'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 店舗名 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4" />
              店舗名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：らーめん太郎 銀座店"
            />
          </div>

          {/* 住所 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              住所 <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="例：東京都中央区銀座1-1-1"
            />
          </div>

          {/* 店長名 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              店長名（任意）
            </label>
            <input
              type="text"
              value={formData.managerName}
              onChange={(e) => handleInputChange('managerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：田中 太郎"
            />
          </div>

          {/* 営業状態（編集時のみ） */}
          {store && (
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">営業中</span>
              </label>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* デバッグ情報 */}
          <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
            <p>デバッグ: {store ? '編集' : '新規'}モード</p>
            <p>入力値: {formData.name} | {formData.address} | {formData.managerName}</p>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              onClick={handleSubmitButtonClick}
              disabled={isSubmitting || loading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {store ? '更新中...' : '作成中...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {store ? '更新' : '作成'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};