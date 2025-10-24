import React from 'react';
import { Store } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../utils/calculations';
import { 
  X, 
  MapPin, 
  User, 
  Calendar, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  Building,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  TrendingUp
} from 'lucide-react';

interface StoreDetailProps {
  store: Store & {
    manager_name?: string;
    reportCount?: number;
    lastReportDate?: string;
    isAssigned?: boolean;
  };
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssignUser?: () => void;
  canEdit?: boolean;
}

export const StoreDetail: React.FC<StoreDetailProps> = ({
  store,
  onClose,
  onEdit,
  onDelete,
  onAssignUser,
  canEdit = true
}) => {
  // 活動状況の計算
  const getActivityStatus = () => {
    const reportCount = store.reportCount || 0;
    const lastReport = store.lastReportDate;
    const daysSinceLastReport = lastReport 
      ? Math.floor((Date.now() - new Date(lastReport).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (reportCount === 0) {
      return { status: '未使用', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    } else if (daysSinceLastReport !== null) {
      if (daysSinceLastReport <= 1) {
        return { status: '活発', color: 'text-green-600', bgColor: 'bg-green-100' };
      } else if (daysSinceLastReport <= 7) {
        return { status: '通常', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      } else {
        return { status: '低調', color: 'text-orange-600', bgColor: 'bg-orange-100' };
      }
    }

    return { status: '不明', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  };

  const activity = getActivityStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{store.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {store.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">営業中</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">休業中</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-5 h-5" />
                基本情報
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">住所</label>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-900">{store.address}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">作成日</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {store.created_at ? formatDate(store.created_at) : '不明'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">最終更新</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {store.updated_at ? formatDate(store.updated_at) : '不明'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                店長情報
              </h3>
              
              {store.manager_name ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">{store.manager_name}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        店長
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">店舗責任者</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">店長が設定されていません</p>
                </div>
              )}
            </div>
          </div>

          {/* 活動状況 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5" />
              活動状況
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">報告数</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {store.reportCount || 0}件
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">最終報告</span>
                </div>
                <p className="text-sm font-bold text-green-600">
                  {store.lastReportDate 
                    ? formatDate(store.lastReportDate)
                    : '報告なし'
                  }
                </p>
              </div>

              <div className={`${activity.bgColor} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-4 h-4 ${activity.color.replace('text-', 'text-')}`} />
                  <span className="text-sm font-medium text-gray-700">状況</span>
                </div>
                <p className={`text-lg font-bold ${activity.color}`}>
                  {activity.status}
                </p>
              </div>
            </div>
          </div>

          {/* 割り当て状況 */}
          {store.isAssigned !== undefined && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5" />
                割り当て状況
              </h3>
              
              <div className={`rounded-lg p-4 ${
                store.isAssigned ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  {store.isAssigned ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        この店舗にアクセス権があります
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        この店舗にアクセス権がありません
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        {canEdit && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
            {onAssignUser && (
              <button
                onClick={onAssignUser}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                ユーザー割り当て
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                編集
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                店舗を削除
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};