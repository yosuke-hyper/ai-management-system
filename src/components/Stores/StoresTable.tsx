import React, { useState } from 'react';
import { Store } from '../../lib/supabase';
import { formatDate } from '../../utils/calculations';
import { 
  MapPin, 
  User, 
  Edit, 
  Trash2, 
  Eye, 
  MoreVertical, 
  Calendar,
  BarChart3,
  CheckCircle,
  XCircle,
  UserPlus,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface StoreWithDetails extends Store {
  manager?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reportCount?: number;
  lastReportDate?: string;
  isAssigned?: boolean;
}

interface StoresTableProps {
  stores: StoreWithDetails[];
  onEdit?: (store: StoreWithDetails) => void;
  onDelete?: (storeId: string, storeName: string) => void;
  onView?: (store: StoreWithDetails) => void;
  onAssignUser?: (storeId: string) => void;
  loading?: boolean;
}

type SortField = 'name' | 'created_at' | 'reportCount' | 'lastReportDate';
type SortOrder = 'asc' | 'desc';

export const StoresTable: React.FC<StoresTableProps> = ({ 
  stores, 
  onEdit, 
  onDelete, 
  onView,
  onAssignUser,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());

  // フィルタリング
  const filteredStores = stores.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (store.manager?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterActive === 'all' ? true :
      filterActive === 'active' ? store.is_active :
      !store.is_active;

    return matchesSearch && matchesFilter;
  });

  // ソート
  const sortedStores = [...filteredStores].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
        break;
      case 'reportCount':
        aValue = a.reportCount || 0;
        bValue = b.reportCount || 0;
        break;
      case 'lastReportDate':
        aValue = a.lastReportDate ? new Date(a.lastReportDate) : new Date(0);
        bValue = b.lastReportDate ? new Date(b.lastReportDate) : new Date(0);
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // ソート変更
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 複数選択
  const handleSelectAll = () => {
    if (selectedStores.size === sortedStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(sortedStores.map(s => s.id)));
    }
  };

  const handleSelectStore = (storeId: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId);
    } else {
      newSelected.add(storeId);
    }
    setSelectedStores(newSelected);
  };

  // 削除確認
  const handleDeleteClick = (store: StoreWithDetails) => {
    if (onDelete) {
      const hasReports = (store.reportCount || 0) > 0;
      const message = hasReports 
        ? `「${store.name}」には${store.reportCount}件の報告データがあります。削除すると非表示になりますが、データは保持されます。続行しますか？`
        : `「${store.name}」を完全に削除しますか？この操作は取り消せません。`;
      
      if (confirm(message)) {
        onDelete(store.id, store.name);
      }
    }
  };

  // SortIcon コンポーネント
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <SortAsc className="w-4 h-4 ml-1" /> : 
      <SortDesc className="w-4 h-4 ml-1" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">店舗データを読み込んでいます...</p>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <MapPin className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">店舗がありません</h3>
        <p className="text-gray-500">「新規店舗」ボタンから最初の店舗を作成してください。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ヘッダーとフィルタ */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">店舗一覧</h3>
            <p className="text-sm text-gray-500">
              {filteredStores.length}件中 {sortedStores.length}件を表示
              {selectedStores.size > 0 && ` (${selectedStores.size}件選択中)`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* 検索 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="店舗名、住所、店長名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* フィルタ */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">すべて</option>
              <option value="active">営業中のみ</option>
              <option value="inactive">休業中のみ</option>
            </select>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedStores.size === sortedStores.length && sortedStores.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  店舗情報
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                店長
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('reportCount')}
              >
                <div className="flex items-center">
                  活動状況
                  <SortIcon field="reportCount" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  作成日
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStores.map((store) => (
              <tr 
                key={store.id} 
                className={`hover:bg-gray-50 ${selectedStores.has(store.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedStores.has(store.id)}
                    onChange={() => handleSelectStore(store.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {store.name}
                        </div>
                        {store.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {store.address}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {store.manager_name ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{store.manager_name}</div>
                      <div className="text-gray-500">店長</div>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-400">
                      <User className="w-4 h-4 mr-1" />
                      未設定
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{store.reportCount || 0}件</span>
                    </div>
                    {store.lastReportDate && (
                      <div className="text-gray-500 flex items-center mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(store.lastReportDate)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {store.created_at ? formatDate(store.created_at) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(store)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="詳細を見る"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(store)}
                        className="text-green-600 hover:text-green-800 transition-colors p-1"
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onAssignUser && (
                      <button
                        onClick={() => onAssignUser(store.id)}
                        className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                        title="ユーザー割り当て"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(store.id, store.name)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedStores.length === 0 && (
        <div className="p-12 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">該当する店舗がありません</h3>
          <p className="text-gray-500">検索条件やフィルタを変更してください。</p>
        </div>
      )}
    </div>
  );
};