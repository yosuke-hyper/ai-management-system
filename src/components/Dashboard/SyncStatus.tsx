import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Download,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { readFromSheets } from '../../services/googleSheets';
import { apiClient } from '../../services/api';

interface SyncStatusProps {
  reports: any[];
  onSyncComplete?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ reports, onSyncComplete }) => {
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: Date | null;
    syncing: boolean;
    connected: boolean;
    pendingCount: number;
    error: string | null;
  }>({
    lastSync: null,
    syncing: false,
    connected: true,
    pendingCount: 0,
    error: null
  });

  const [batchSyncProgress, setBatchSyncProgress] = useState<{
    inProgress: boolean;
    completed: number;
    total: number;
  }>({
    inProgress: false,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    // 初回接続テスト
    checkConnection();
    
    // 定期的な接続チェック（5分間隔）
    const interval = setInterval(checkConnection, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const result = await readFromSheets();
      setSyncStatus(prev => ({
        ...prev,
        connected: result.success,
        error: result.success ? null : result.error || 'Connection failed'
      }));
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        connected: false,
        error: 'ネットワークエラー'
      }));
    }
  };

  const handleManualSync = async () => {
    if (!reports.length) return;

    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));
    setBatchSyncProgress({ inProgress: true, completed: 0, total: reports.length });

    try {
      // Use backend API to sync reports to sheets (最新10件のみ)
      const recentReports = reports.slice(0, 10);
      
      for (let i = 0; i < recentReports.length; i++) {
        await apiClient.createReport(recentReports[i]);
        setBatchSyncProgress(prev => ({ ...prev, completed: i + 1 }));
        
        // API制限を避けるため少し待機
        if (i < recentReports.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        lastSync: new Date(),
        pendingCount: Math.max(0, prev.pendingCount - recentReports.length),
        error: null
      }));

      onSyncComplete?.();
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: error instanceof Error ? error.message : '同期エラー'
      }));
    } finally {
      setBatchSyncProgress({ inProgress: false, completed: 0, total: 0 });
    }
  };

  const handleReadFromSheets = async () => {
    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const result = await readFromSheets();
      
      if (result.success && result.data) {
        console.log('Sheets data:', result.data);
        // ここで取得したデータを処理（親コンポーネントに通知など）
        setSyncStatus(prev => ({
          ...prev,
          syncing: false,
          error: null,
          lastSync: new Date()
        }));
      } else {
        setSyncStatus(prev => ({
          ...prev,
          syncing: false,
          error: result.error || 'データ読み込みエラー'
        }));
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: error instanceof Error ? error.message : 'データ読み込みエラー'
      }));
    }
  };

  const { syncing, connected, lastSync, pendingCount, error } = syncStatus;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-medium text-gray-900">Sheets同期状況</h3>
        </div>
        
        {/* 接続状態 */}
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-xs">接続中</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">未接続</span>
            </div>
          )}
        </div>
      </div>

      {/* 同期統計 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">最終同期</p>
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-xs font-medium">
              {lastSync ? lastSync.toLocaleTimeString('ja-JP') : '未実行'}
            </p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">未同期</p>
          <p className={`text-sm font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {pendingCount}件
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">総報告数</p>
          <p className="text-sm font-bold text-blue-600">{reports.length}件</p>
        </div>
      </div>

      {/* 進行状況 */}
      {batchSyncProgress.inProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700">同期中...</span>
            <span className="text-sm font-medium text-blue-700">
              {batchSyncProgress.completed}/{batchSyncProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(batchSyncProgress.completed / batchSyncProgress.total) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleManualSync}
          disabled={syncing || !connected || reports.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {syncing ? '同期中...' : '手動同期'}
        </button>

        <button
          onClick={handleReadFromSheets}
          disabled={syncing || !connected}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          読み込み
        </button>

        <button
          onClick={checkConnection}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          接続確認
        </button>
      </div>

      {/* 状態表示 */}
      <div className="mt-4 flex items-center justify-center">
        {connected ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Google Sheets連携中</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">連携エラー - 設定を確認してください</span>
          </div>
        )}
      </div>
    </div>
  );
};