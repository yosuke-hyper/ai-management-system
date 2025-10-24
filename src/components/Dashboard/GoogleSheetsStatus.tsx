import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ExternalLink, Settings, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SetupGuide } from './SetupGuide';

interface GoogleSheetsStatusProps {
  className?: string;
}

export const GoogleSheetsStatus: React.FC<GoogleSheetsStatusProps> = ({ className = '' }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [showSetup, setShowSetup] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    error?: string;
  }>({ tested: false, success: false });

  useEffect(() => {
    // Check if Google Sheets is configured
    const checkConfiguration = () => {
      const hasApiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      const hasSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
      const configured = hasApiKey && hasSheetId;
      
      setIsConfigured(!!configured);
      
      if (hasSheetId) {
        setSheetsUrl(`https://docs.google.com/spreadsheets/d/${hasSheetId}/edit`);
      }
    };

    checkConfiguration();
  }, []);

  const testSheetsConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({ tested: false, success: false });

    try {
      const SHEET_ID = '1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco';
      const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      
      // Check for missing or placeholder API key
      if (!API_KEY || API_KEY.trim() === '' || 
          API_KEY === 'your_google_sheets_api_key_here' || 
          API_KEY === 'your_api_key' || 
          API_KEY.includes('your_') || 
          API_KEY.includes('placeholder')) {
        setConnectionStatus({
          tested: true,
          success: false,
          error: 'Google Sheets APIキーが設定されていません。.envファイルのVITE_GOOGLE_SHEETS_API_KEYに、Google Cloud Consoleで生成した実際のAPIキーを設定してください。現在はプレースホルダー値のままです。'
        });
        return;
      }

      // Validate API key format
      if (!API_KEY.startsWith('AIza') || API_KEY.length < 35) {
        setConnectionStatus({
          tested: true,
          success: false,
          error: `APIキーの形式が正しくありません。Google Sheets APIキーは "AIza" で始まり、通常39文字です。現在の値: "${API_KEY.substring(0, 10)}..." (${API_KEY.length}文字)`
        });
        return;
      }

      // Test API access to the sheet
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}`;
      
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const sheetData = await response.json();
        console.log('Sheet connection successful:', sheetData.properties?.title);
        setConnectionStatus({
          tested: true,
          success: true
        });
        setSheetsUrl(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
      } else {
        const errorText = await response.text();
        let errorMessage = 'シートにアクセスできません';
        
        if (response.status === 400) {
          errorMessage = 'APIキーが無効です。Google Cloud Consoleで以下を確認してください：\n1. APIキーが正しくコピーされているか\n2. Google Sheets APIが有効になっているか\n3. APIキーの制限設定が正しいか';
        } else if (response.status === 403) {
          errorMessage = 'シートの共有設定を確認してください。「リンクを知っている全員が閲覧可能」に設定する必要があります。';
        } else if (response.status === 404) {
          errorMessage = 'シートが見つかりません。URLが正しいか確認してください。';
        } else if (response.status === 401) {
          errorMessage = 'APIキーが無効または権限がありません。Google Cloud ConsoleでAPIキーの設定を確認してください。';
        }
        
        console.error('Sheet connection failed:', response.status, errorText);
        setConnectionStatus({
          tested: true,
          success: false,
          error: errorMessage
        });
      }
    } catch (error) {
      console.error('Network error during sheet test:', error);
      setConnectionStatus({
        tested: true,
        success: false,
        error: 'ネットワークエラーが発生しました'
      });
    } finally {
      setTestingConnection(false);
    }
  };
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-medium text-gray-900">Google Sheets連携</h3>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-orange-500" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className={`text-xs px-2 py-1 rounded ${
          isConfigured 
            ? 'bg-green-100 text-green-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {isConfigured ? 
            (connectionStatus.tested ? 
              (connectionStatus.success ? '✓ 連携確認済み' : '⚠ 接続エラー') 
              : '✓ 連携設定済み') 
            : '⚠ 連携未設定'}
        </div>

        {/* Connection Test Button */}
        {isConfigured && (
          <button
            onClick={testSheetsConnection}
            disabled={testingConnection}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
            {testingConnection ? '接続テスト中...' : '接続テスト'}
          </button>
        )}

        {/* Connection Status */}
        {connectionStatus.tested && (
          <div className={`text-xs p-2 rounded ${
            connectionStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {connectionStatus.success ? 
              '✅ シートへの接続に成功しました' : 
              `❌ ${connectionStatus.error}`
            }
          </div>
        )}

        {isConfigured && connectionStatus.success ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              日次報告が自動的にGoogle Sheetsに保存されます
            </p>
            {sheetsUrl && (
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Sheetsを開く
              </a>
            )}
          </div>
        ) : isConfigured ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              シートへの接続を確認してください
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Google Sheets連携を有効にするには設定が必要です
            </p>
            <SetupGuide />
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Google Sheets設定</h3>
              <button
                onClick={() => setShowSetup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium mb-2">1. Google Sheets APIキーを取得</h4>
                <p className="text-xs">Google Cloud Consoleでプロジェクトを作成し、Sheets APIを有効にしてAPIキーを取得してください。</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Google Sheetsの共有設定</h4>
                <p className="text-xs">シートを開き、「共有」ボタンをクリック → 「制限付きアクセス」を「リンクを知っている全員」に変更 → 「閲覧者」または「編集者」を選択してください。</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. 環境変数を設定</h4>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                  VITE_GOOGLE_SHEETS_API_KEY=your_api_key<br/>
                  VITE_GOOGLE_SHEET_ID=1GWp6bW4WnSc9EFobaYNqhUz6wtMuL6gG74Tg2Osvtco
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">4. よくあるエラーの対処法</h4>
                <ul className="text-xs space-y-1">
                  <li>• <strong>403エラー</strong>: シートの共有設定を「リンクを知っている全員」に変更</li>
                  <li>• <strong>404エラー</strong>: シートのURLまたはIDを確認</li>
                  <li>• <strong>400エラー</strong>: APIキーが無効または制限設定を確認</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};