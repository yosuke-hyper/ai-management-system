import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { generateReport } from '../../hooks/useAIReports';
import { supabase } from '../../lib/supabase';

interface GenerateReportDialogProps {
  onClose: () => void;
  onSuccess: (reportId: string) => void;
}

interface Store {
  id: string;
  name: string;
}

export function GenerateReportDialog({ onClose, onSuccess }: GenerateReportDialogProps) {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(weekAgo);
  const [endDate, setEndDate] = useState<string>(today);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setStores(data || []);
      } catch (err) {
        console.error('Failed to fetch stores:', err);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const storeId = selectedStoreId === 'all' ? undefined : selectedStoreId;

      let periodStart: string | undefined;
      let periodEnd: string | undefined;

      if (reportType === 'weekly') {
        periodStart = startDate;
        periodEnd = endDate;
      }

      const { data, error } = await generateReport(reportType, storeId, periodStart, periodEnd);

      if (error) {
        setResult({ success: false, message: error });
      } else if (data) {
        setResult({ success: true, message: 'レポートが正常に生成されました。表示中...' });
        setTimeout(() => {
          onSuccess(data.id);
          onClose();
        }, 1000);
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'レポート生成中にエラーが発生しました',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            レポート生成
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isGenerating}
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              レポート種別
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportType('weekly')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  reportType === 'weekly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isGenerating}
              >
                <div className="font-semibold text-gray-900">期間指定レポート</div>
                <div className="text-xs text-gray-500 mt-1">日付範囲を指定</div>
              </button>

              <button
                onClick={() => setReportType('monthly')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  reportType === 'monthly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isGenerating}
              >
                <div className="font-semibold text-gray-900">月次レポート</div>
                <div className="text-xs text-gray-500 mt-1">先月全体</div>
              </button>
            </div>
          </div>

          {reportType === 'weekly' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isGenerating}
                  max={endDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isGenerating}
                  min={startDate}
                  max={today}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象店舗
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isGenerating || loadingStores}
            >
              <option value="all">全店舗</option>
              {loadingStores ? (
                <option disabled>読み込み中...</option>
              ) : (
                stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg flex items-start ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? '成功' : 'エラー'}
                </p>
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isGenerating}>
              キャンセル
            </Button>
            <Button onClick={handleGenerate} className="flex-1" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  生成開始
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>注意:</strong> レポート生成には30秒〜1分程度かかる場合があります。
              AIが過去のデータを分析し、詳細なレポートを作成します。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
