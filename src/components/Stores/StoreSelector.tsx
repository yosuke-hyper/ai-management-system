import React from 'react';
import { Store, ChevronDown } from 'lucide-react';
import { Store as StoreType } from '../../lib/supabase';

interface StoreSelectorProps {
  stores: StoreType[];
  selectedStoreId: string | null;
  onStoreSelect: (storeId: string | null) => void;
  loading?: boolean;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStoreId,
  onStoreSelect,
  loading = false
}) => {
  const selectedStore = stores.find(store => store.id === selectedStoreId);
  const isAllStores = selectedStoreId === 'all';

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        店舗を選択
      </label>
      <div className="relative">
        <select
          value={selectedStoreId || ''}
          onChange={(e) => onStoreSelect(e.target.value || null)}
          disabled={loading || stores.length === 0}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">店舗を選択してください</option>
          <option value="all">🏢 全店舗（合計）</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Store className="h-4 w-4 text-gray-400" />
        </div>
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {isAllStores && stores.length > 0 && (
        <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">全店舗（合計表示）</p>
              <p className="text-xs text-blue-700">{stores.length}店舗のデータを集計</p>
            </div>
          </div>
        </div>
      )}

      {selectedStore && !isAllStores && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">{selectedStore.name}</p>
              <p className="text-xs text-blue-700">{selectedStore.address}</p>
            </div>
          </div>
        </div>
      )}
      
      {stores.length === 0 && !loading && (
        <p className="mt-2 text-sm text-gray-500">
          まだ店舗が登録されていません。新しい店舗を作成してください。
        </p>
      )}
    </div>
  );
};