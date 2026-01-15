import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Building2, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react';
import { useAuth } from '../../contexts/authcontext';
import { useAdminData } from '../../contexts/admindatacontext';
import { useBrands } from '../../hooks/usebrands';
import { useLocation } from 'react-router-dom';
import { StoresTable } from './storestable';
import { StoreForm } from './storeform';
import { StoreDetail } from './storedetail';
import { StoreSelector } from './storeselector';
import { StoreHolidayManagement } from './storeholidaymanagement';
import { Store } from '../../lib/supabase';
import { subscriptionService } from '@/services/subscriptionservice';
import { useOrganization } from '@/contexts/organizationcontext';

interface StoreManagerProps {
  userId: string | null;
  onStoresUpdate?: () => void;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  type: NotificationType;
  message: string;
}

export const StoreManager: React.FC<StoreManagerProps> = ({ userId, onStoresUpdate }) => {
  const { user, refreshStores } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();
  const { getBrandById } = useBrands();
  const {
    stores: adminStores,
    addStore,
    updateStore: adminUpdateStore,
    deleteStore: adminDeleteStore
  } = useAdminData();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stores = useMemo(() => adminStores.filter(s => s.isActive !== false), [adminStores]);
  const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId) || null, [stores, selectedStoreId]);
  const selectStore = useCallback((id: string | null) => setSelectedStoreId(id), []);

  const createStore = async (storeData: { name: string; address: string; managerName?: string; brandId?: string; changeFund?: number; isActive?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await addStore({
        name: storeData.name,
        address: storeData.address,
        managerName: storeData.managerName,
        brandId: storeData.brandId,
        changeFund: storeData.changeFund,
        isActive: storeData.isActive
      });
      if (!result.ok) {
        setError(result.error || '店舗作成に失敗しました');
        return { error: result.error };
      }
      return {};
    } catch (err) {
      const msg = err instanceof Error ? err.message : '店舗作成に失敗しました';
      setError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  };

  const updateStore = async (storeId: string, updateData: any) => {
    setLoading(true);
    setError(null);
    try {
      await adminUpdateStore(storeId, {
        name: updateData.name,
        address: updateData.address,
        manager: updateData.manager_name,
        brandId: updateData.brand_id,
        changeFund: updateData.change_fund,
        isActive: updateData.isActive
      });
      return {};
    } catch (err) {
      const msg = err instanceof Error ? err.message : '店舗更新に失敗しました';
      setError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  };

  const deleteStore = async (storeId: string) => {
    setLoading(true);
    setError(null);
    try {
      await adminDeleteStore(storeId);
      return {};
    } catch (err) {
      const msg = err instanceof Error ? err.message : '店舗削除に失敗しました';
      setError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  };

  const assignUserToStore = async (_userId: string, _storeId: string) => {
    return { error: 'ユーザー割り当て機能は現在利用できません' };
  };

  // URLから業態IDを取得
  const params = new URLSearchParams(location.search);
  const brandId = params.get('brand') || '';
  const selectedBrand = getBrandById(brandId);

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [viewingStore, setViewingStore] = useState<Store | null>(null);
  const [holidaySettingStore, setHolidaySettingStore] = useState<Store | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  // 通知表示
  const showNotification = (type: NotificationType, message: string, duration: number = 4000) => {
    console.log(`📢 StoreManager: 通知表示 - ${type}: ${message}`);
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  };

  // 権限チェック
  const canManageStores = user?.role === 'admin' || user?.role === 'manager';
  const canEditStore = (store: Store) => {
    // 管理者は全店舗を編集可能
    if (user?.role === 'admin') {
      return true;
    }
    // マネージャーは全店舗を編集可能
    if (user?.role === 'manager') {
      return true;
    }
    // スタッフは割り当てられた店舗を編集可能
    if (user?.role === 'staff') {
      // デモ環境では全店舗にアクセス可能とする
      return true;
    }
    return false;
  };

  // 店舗作成
  const handleCreateStore = async (storeData: {
    name: string;
    address: string;
    managerName?: string;
    brandId?: string;
    changeFund?: number;
    isActive?: boolean;
  }) => {
    console.log('🏪 StoreManager: 店舗作成処理開始', {
      storeData,
      userId,
      currentStoresCount: stores.length
    });

    try {
    if (!userId) {
      showNotification('error', 'ユーザーIDが見つかりません');
      return { ok: false, error: 'ユーザーIDが見つかりません' };
    }

    const { error } = await createStore(storeData);

    if (error) {
      console.error('❌ StoreManager: 店舗作成エラー', error);
      showNotification('error', error);
      return { ok: false, error };
    } else {
      console.log('✅ StoreManager: 店舗作成成功');
      const message = storeData.brandId
        ? '店舗を作成し、業態を登録しました'
        : '店舗を作成しました';
      showNotification('success', message, storeData.brandId ? 5000 : 4000);

       // AuthContextの店舗データを更新（ReportFormなど他画面での表示に必要）
       await refreshStores();

       // グローバルイベントを発火して店舗数更新を通知
       window.dispatchEvent(new CustomEvent('store-count-updated'));
       console.log('📢 StoreManager: 店舗数更新イベントを発火しました');

       // ダッシュボード側の店舗データを更新
       if (onStoresUpdate) {
         console.log('🔄 StoreManager: ダッシュボード側店舗データ更新を通知');
         setTimeout(() => {
           onStoresUpdate();
         }, 500);
       }

      return { ok: true };
    }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '店舗作成でエラーが発生しました';
      console.error('💥 StoreManager: 予期しないエラー', err);
      showNotification('error', errorMessage);
      return { ok: false, error: errorMessage };
    }
  };

  // 店舗更新
  const handleUpdateStore = async (storeData: {
    name: string;
    address: string;
    managerName?: string;
    brandId?: string;
    changeFund?: number;
    isActive?: boolean;
  }) => {
    if (!editingStore) return { ok: false, error: '編集対象の店舗が見つかりません' };

    console.log('🔄 StoreManager: 店舗更新処理開始', { storeId: editingStore.id, storeData });

    // 業態が変更されたかをチェック
    const previousBrandId = (editingStore as any).brand_id || '';
    const newBrandId = storeData.brandId || '';
    const brandChanged = previousBrandId !== newBrandId;
    const brandAdded = !previousBrandId && newBrandId;
    const brandRemoved = previousBrandId && !newBrandId;

    try {
    const { error } = await updateStore(editingStore.id, {
      name: storeData.name,
      address: storeData.address,
      manager_name: storeData.managerName,
      brand_id: storeData.brandId,
      change_fund: storeData.changeFund,
      isActive: storeData.isActive
    });

    if (error) {
      console.error('❌ StoreManager: 店舗更新エラー', error);
      showNotification('error', error);
      return { ok: false, error };
    } else {
      console.log('✅ StoreManager: 店舗更新成功');
      let message = '店舗を更新しました';
      let duration = 4000;
      if (brandAdded) {
        message = '店舗を更新し、業態を登録しました';
        duration = 5000; // 業態登録時は長めに表示
      } else if (brandRemoved) {
        message = '店舗を更新し、業態を解除しました';
      } else if (brandChanged) {
        message = '店舗を更新し、業態を変更しました';
        duration = 5000; // 業態変更時も長めに表示
      }
      showNotification('success', message, duration);
      setEditingStore(null);
      setViewingStore(null);

       // グローバルイベントを発火して店舗数更新を通知
       window.dispatchEvent(new CustomEvent('store-count-updated'));
       console.log('📢 StoreManager: 店舗数更新イベントを発火しました（更新）');

       // ダッシュボード側の店舗データを更新
       if (onStoresUpdate) {
         console.log('🔄 StoreManager: ダッシュボード側店舗データ更新を通知（更新）');
         setTimeout(() => {
           onStoresUpdate();
         }, 500);
       }

      return { ok: true };
    }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '店舗更新でエラーが発生しました';
      console.error('💥 StoreManager: 予期しないエラー', err);
      showNotification('error', errorMessage);
      return { ok: false, error: errorMessage };
    }
  };

  // 店舗削除
  const handleDeleteStore = async (storeId: string, storeName: string) => {
    const { error } = await deleteStore(storeId);

    if (error) {
      showNotification('error', error);
    } else {
      showNotification('success', `店舗「${storeName}」を削除しました`);
      setViewingStore(null);

       // グローバルイベントを発火して店舗数更新を通知
       window.dispatchEvent(new CustomEvent('store-count-updated'));
       console.log('📢 StoreManager: 店舗数更新イベントを発火しました（削除）');

       // ダッシュボード側の店舗データを更新
       if (onStoresUpdate) {
         console.log('🔄 StoreManager: ダッシュボード側店舗データ更新を通知（削除）');
         setTimeout(() => {
           onStoresUpdate();
         }, 500);
       }
    }
  };

  // 編集開始
  const handleEdit = (store: Store) => {
    if (!canEditStore(store)) {
      showNotification('error', 'この店舗を編集する権限がありません');
      return;
    }
    setEditingStore(store);
    setShowForm(true);
    setViewingStore(null);
  };

  // 詳細表示
  const handleView = (store: Store) => {
    setViewingStore(store);
  };

  // 新規店舗ボタンクリック
  const handleNewStoreClick = async () => {
    console.log('🏪 StoreManager: 新規店舗ボタンがクリックされました');

    if (!organization?.id) {
      showNotification('error', '組織情報が見つかりません');
      return;
    }

    try {
      const limitCheck = await subscriptionService.canAddStore(organization.id);
      console.log('📊 StoreManager: 店舗追加制限チェック結果', limitCheck);

      if (!limitCheck.allowed) {
        const message = limitCheck.reason || '店舗数の上限に達しています';
        showNotification('error', message, 6000);

        if (limitCheck.priceImpact) {
          setTimeout(() => {
            const { currentPrice, newPrice, increase } = limitCheck.priceImpact;
            showNotification('info',
              `店舗を追加すると月額料金が¥${currentPrice.toLocaleString()}から¥${newPrice.toLocaleString()}に増加します（+¥${increase.toLocaleString()}）`,
              8000
            );
          }, 1000);
        }
        return;
      }

      if (limitCheck.warning) {
        showNotification('info', limitCheck.warning, 6000);
      }

      console.log('✅ StoreManager: 店舗追加可能、フォームを開きます');
      setShowForm(true);
    } catch (err) {
      console.error('❌ StoreManager: 制限チェックエラー', err);
      showNotification('error', '店舗数の確認中にエラーが発生しました');
    }
  };

  // フォーム閉じる
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingStore(null);
  };

  // フォーム送信
  const handleSubmitForm = async (storeData: {
    name: string;
    address: string;
    managerName?: string;
    isActive?: boolean;
  }) => {
    console.log('📝 StoreManager: フォーム送信処理', { 
      isEditing: !!editingStore, 
      storeData 
    });
    
    let result;
    if (editingStore) {
      result = await handleUpdateStore(storeData);
    } else {
      result = await handleCreateStore(storeData);
    }
    
    // 成功時はフォームを閉じる
    if (!result || !result.error) {
      console.log('✅ StoreManager: 処理成功、フォームを閉じます');
      setTimeout(() => {
        setShowForm(false);
        setEditingStore(null);
      }, 100);
    }
    
    return result || {};
  };

  // データ再読み込み
  const handleRefresh = () => {
    window.location.reload();
  };

  // ユーザー割り当て（簡易実装）
  const handleAssignUser = (storeId: string) => {
    const newUserId = prompt('割り当てるユーザーIDを入力してください:');
    if (newUserId) {
      assignUserToStore(newUserId, storeId).then(({ error }) => {
        if (error) {
          showNotification('error', error);
        } else {
          showNotification('success', 'ユーザーを割り当てました');
        }
      });
    }
  };

  // 休日設定
  const handleHolidaySetting = (store: Store) => {
    setHolidaySettingStore(store);
  };

  // アクセス権限チェック
  if (user?.role === 'staff') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-600 mb-4">
            <Building2 className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">アクセス制限</h3>
          <p className="text-yellow-700">
            スタッフアカウントでは店舗管理機能をご利用いただけません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 削除操作の説明 */}
      {canManageStores && stores.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">店舗削除について</h4>
              <p className="text-xs text-yellow-700">
                店舗を削除すると非表示になりますが、関連する報告データは保持されます。完全削除ではなく論理削除です。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 通知 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl animate-in slide-in-from-right duration-300 flex items-center gap-3 min-w-[320px] ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex-shrink-0">
            {notification.type === 'success' && <CheckCircle className="w-6 h-6" />}
            {notification.type === 'error' && <XCircle className="w-6 h-6" />}
            {notification.type === 'info' && <Info className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{notification.message}</p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            店舗管理
          </h2>
          <p className="text-gray-600 mt-1">
            店舗の作成、編集、管理を行います（{stores.length}店舗）
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
          
          {canManageStores && (
            <button
              onClick={handleNewStoreClick}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              新規店舗
            </button>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 店舗選択 */}
        <div className="xl:col-span-1">
          <StoreSelector
            stores={stores}
            selectedStoreId={selectedStoreId}
            onStoreSelect={selectStore}
            loading={loading}
            selectedBrand={selectedBrand}
          />
          
          {/* 選択中店舗の詳細 */}
          {selectedStore && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">選択中の店舗</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">店舗名：</span>
                  <span className="font-medium text-gray-900">{selectedStore.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">状態：</span>
                  <span className={`font-medium ${
                    selectedStore.is_active ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedStore.is_active ? '営業中' : '休業中'}
                  </span>
                </div>
                {selectedStore.address && (
                  <div>
                    <span className="text-gray-600">住所：</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {selectedStore.address}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleView(selectedStore)}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  詳細表示
                </button>
                {canEditStore(selectedStore) && (
                  <button
                    onClick={() => handleEdit(selectedStore)}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    編集
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 店舗一覧テーブル */}
        <div className="xl:col-span-3">
          <StoresTable
            stores={stores}
            onEdit={handleEdit}
            onDelete={canManageStores ? handleDeleteStore : undefined}
            onView={handleView}
            onHolidaySetting={canManageStores ? handleHolidaySetting : undefined}
            onAssignUser={user?.role === 'admin' ? handleAssignUser : undefined}
            loading={loading}
          />
        </div>
      </div>

      {/* 休日設定モーダル */}
      {holidaySettingStore && organization && (
        <StoreHolidayManagement
          storeId={holidaySettingStore.id}
          storeName={holidaySettingStore.name}
          organizationId={organization.id}
          onClose={() => setHolidaySettingStore(null)}
        />
      )}

      {/* 店舗フォームモーダル */}
      {showForm && (
        <StoreForm
          store={editingStore}
          onSubmit={handleSubmitForm}
          onCancel={handleCloseForm}
          loading={loading}
        />
      )}

      {/* 店舗詳細モーダル */}
      {viewingStore && (
        <StoreDetail
          store={viewingStore}
          onClose={() => setViewingStore(null)}
          onEdit={() => handleEdit(viewingStore)}
          onDelete={canManageStores ? () => handleDeleteStore(viewingStore.id, viewingStore.name) : undefined}
          onAssignUser={user?.role === 'admin' ? () => handleAssignUser(viewingStore.id) : undefined}
          canEdit={true}
        />
      )}
    </div>
  );
};