import React, { useState } from 'react';
import { Plus, Building2, RefreshCw, Download, Upload } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStores } from '../../hooks/useStores';
import { StoresTable } from './StoresTable';
import { StoreForm } from './StoreForm';
import { StoreDetail } from './StoreDetail';
import { StoreSelector } from './StoreSelector';
import { Store } from '../../lib/supabase';
import { canAddStore } from '@/services/usageLimits';

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
  const { user } = useAuth();
  const {
    stores,
    selectedStoreId,
    selectedStore,
    loading,
    error,
    createStore,
    updateStore,
    deleteStore,
    assignUserToStore,
    selectStore,
    fetchStores
  } = useStores(userId);

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [viewingStore, setViewingStore] = useState<Store | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  // 通知表示
  const showNotification = (type: NotificationType, message: string) => {
    console.log(`📢 StoreManager: 通知表示 - ${type}: ${message}`);
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
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
      return { error: 'ユーザーIDが見つかりません' };
    }

    const limitCheck = await canAddStore(userId);
    if (!limitCheck.allowed) {
      showNotification('error', limitCheck.message || '店舗数の上限に達しています');
      return { error: limitCheck.message };
    }

    const { error } = await createStore(storeData);

    if (error) {
      console.error('❌ StoreManager: 店舗作成エラー', error);
      showNotification('error', error);
      return { error };
    } else {
      console.log('✅ StoreManager: 店舗作成成功');
      showNotification('success', '店舗を作成しました');

       // ダッシュボード側の店舗データを更新
       if (onStoresUpdate) {
         console.log('🔄 StoreManager: ダッシュボード側店舗データ更新を通知');
         setTimeout(() => {
           onStoresUpdate();
         }, 500); // 少し遅延させてデータ同期を確実に
       }

      return {};
    }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '店舗作成でエラーが発生しました';
      console.error('💥 StoreManager: 予期しないエラー', err);
      showNotification('error', errorMessage);
      return { error: errorMessage };
    }
  };

  // 店舗更新
  const handleUpdateStore = async (storeData: {
    name: string;
    address: string;
    managerName?: string;
    isActive?: boolean;
  }) => {
    if (!editingStore) return { error: '編集対象の店舗が見つかりません' };
    
    console.log('🔄 StoreManager: 店舗更新処理開始', { storeId: editingStore.id, storeData });
    
    try {
    const { error } = await updateStore(editingStore.id, {
      name: storeData.name,
      address: storeData.address,
      manager_name: storeData.managerName,
      isActive: storeData.isActive
    });
    
    if (error) {
      console.error('❌ StoreManager: 店舗更新エラー', error);
      showNotification('error', error);
      return { error };
    } else {
      console.log('✅ StoreManager: 店舗更新成功');
      showNotification('success', '店舗を更新しました');
      setEditingStore(null);
      setViewingStore(null);
       
       // ダッシュボード側の店舗データを更新
       if (onStoresUpdate) {
         console.log('🔄 StoreManager: ダッシュボード側店舗データ更新を通知（更新）');
         setTimeout(() => {
           onStoresUpdate();
         }, 500);
       }
       
      return {};
    }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '店舗更新でエラーが発生しました';
      console.error('💥 StoreManager: 予期しないエラー', err);
      showNotification('error', errorMessage);
      return { error: errorMessage };
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
    fetchStores();
    showNotification('info', 'データを更新しました');
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
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
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
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
            onAssignUser={user?.role === 'admin' ? handleAssignUser : undefined}
            loading={loading}
          />
        </div>
      </div>

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