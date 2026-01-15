import React, { useState, useEffect } from 'react';
import { Store } from '../../lib/supabase';
import { Save, X, MapPin, User, TriangleAlert as AlertTriangle, Building, Store as StoreIcon, ArrowRight, Coins } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionservice';
import { useOrganization } from '../../contexts/organizationcontext';
import { getBrands, type BrandDb } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';

interface StoreFormProps {
  store?: Store | null;
  onSubmit: (storeData: {
    name: string;
    address: string;
    managerId?: string;
    managerName?: string;
    isActive?: boolean;
    brandId?: string;
    changeFund?: number;
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
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    managerName: '',
    brandId: '',
    changeFund: '',
    isActive: true
  });

  const [brands, setBrands] = useState<BrandDb[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [storeLimitReached, setStoreLimitReached] = useState(false);
  const [storeLimitInfo, setStoreLimitInfo] = useState<{
    currentStores: number;
    contractedStores: number;
    canAdd: boolean;
  } | null>(null);
  const [priceImpact, setPriceImpact] = useState<{
    currentPrice: number;
    newPrice: number;
    increase: number;
  } | null>(null);

  // 業態一覧と契約状況を取得
  useEffect(() => {
    const loadData = async () => {
      if (!organization?.id) {
        console.log('⚠️ StoreForm: 組織IDがありません');
        return;
      }

      console.log('🔍 StoreForm: 業態一覧を取得中...', { organizationId: organization.id });
      const { data, error } = await getBrands({
        organizationId: organization.id,
        isActive: true
      });

      if (error) {
        console.error('❌ StoreForm: 業態取得エラー', error);
      } else {
        console.log('✅ StoreForm: 業態取得成功', { count: data?.length, brands: data });
        setBrands(data || []);
      }

      // 新規作成時のみ料金影響をチェック
      if (!store) {
        const limits = await subscriptionService.getSubscriptionLimits(organization.id);
        const limitCheck = await subscriptionService.canAddStore(organization.id);

        if (limits) {
          setStoreLimitInfo({
            currentStores: limits.currentStores,
            contractedStores: limits.contractedStores,
            canAdd: true
          });
        }

        if (limitCheck.priceImpact) {
          setPriceImpact(limitCheck.priceImpact);
        }
      }
    };

    loadData();
  }, [organization, store]);

  // デバッグ: フォーム初期化ログ
  useEffect(() => {
    console.log('🔧 StoreForm: 初期化開始', { store, hasStore: !!store });

    if (store) {
      const initialData = {
        name: store.name || '',
        address: store.address || '',
        managerName: (store as any).manager_name || '',
        brandId: (store as any).brand_id || '',
        changeFund: (store as any).change_fund ? String((store as any).change_fund) : '',
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
        brandId: '',
        changeFund: '',
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

    if (!formData.brandId?.trim()) {
      setError('業態を選択してください');
      return;
    }

    if (!store && organization) {
      const limitCheck = await subscriptionService.canAddStore(organization.id);
      if (!limitCheck.allowed) {
        setStoreLimitReached(true);
        setError(limitCheck.reason || '店舗を追加できません');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        managerId: undefined,
        managerName: formData.managerName?.trim() || undefined,
        brandId: formData.brandId || undefined,
        changeFund: formData.changeFund ? parseInt(formData.changeFund, 10) : undefined,
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
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {store ? '店舗編集' : '新規店舗作成'}
                </h2>
                {!store && storeLimitInfo && (
                  <p className="text-xs text-gray-600 mt-1">
                    現在の登録店舗数: {storeLimitInfo.currentStores}店舗
                  </p>
                )}
              </div>
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

          {/* 業態選択 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <StoreIcon className="w-4 h-4" />
              業態 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.brandId}
              onChange={(e) => handleInputChange('brandId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">業態を選択してください</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.icon} {brand.display_name || brand.name}
                </option>
              ))}
            </select>
            {brands.length === 0 && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                ⚠️ 業態が登録されていません。先に業態管理から業態を登録してください。
              </p>
            )}
            {brands.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                店舗の業態（居酒屋、ラーメンなど）を選択してください
              </p>
            )}
          </div>

          {/* 店長名 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              店長名
            </label>
            <input
              type="text"
              value={formData.managerName}
              onChange={(e) => handleInputChange('managerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：田中 太郎"
            />
          </div>

          {/* 釣銭準備金 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Coins className="w-4 h-4" />
              釣銭準備金
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.changeFund}
              onChange={(e) => handleInputChange('changeFund', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例：50000"
            />
            <p className="mt-1 text-xs text-gray-500">
              店舗で保持する釣銭用の現金準備金（円単位）
            </p>
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

          {/* 料金影響表示（新規作成時） */}
          {!store && priceImpact && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">料金影響</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">現在の料金:</span>
                  <span className="font-medium text-gray-900">￥{priceImpact.currentPrice.toLocaleString()}/月</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">店舗追加後:</span>
                  <span className="font-semibold text-blue-700">￥{priceImpact.newPrice.toLocaleString()}/月</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <span className="text-gray-700 font-medium">増加額:</span>
                  <span className="font-bold text-blue-900">+￥{priceImpact.increase.toLocaleString()}/月</span>
                </div>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">エラー</p>
                  <p className="text-sm text-red-700">{error}</p>
                  {storeLimitReached && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          onCancel();
                          navigate('/dashboard/subscription');
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded font-medium flex items-center gap-1"
                      >
                        サブスクリプション管理へ
                        <ArrowRight className="w-3 h-3" />
                      </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || loading || brands.length === 0 || (storeLimitReached && !store)}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              title={
                brands.length === 0
                  ? '業態を先に登録してください'
                  : storeLimitReached && !store
                  ? '契約店舗数の上限に達しています'
                  : ''
              }
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

          {/* 業態未登録時の警告 */}
          {brands.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                👉 店舗を作成するには、まず「システム設定」から業態を登録してください。
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};