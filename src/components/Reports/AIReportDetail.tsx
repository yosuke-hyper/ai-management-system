import { useState } from 'react';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Download, ArrowLeft, Trash2, Share2, Copy } from 'lucide-react';
import { AIReport } from '../../hooks/useAIReports';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AIReportDetailProps {
  report: AIReport;
  onBack: () => void;
  onDelete?: (reportId: string) => Promise<{ error: string | null }>;
}

export function AIReportDetail({ report, onBack, onDelete }: AIReportDetailProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const canShare = user?.role === 'manager' || user?.role === 'admin';

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    const { error } = await onDelete(report.id);

    if (error) {
      alert(`削除に失敗しました: ${error}`);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      onBack();
    }
  };

  const handleShare = async () => {
    setShowShareDialog(true);

    const { data, error } = await supabase
      .from('ai_generated_reports')
      .select('share_token, is_public')
      .eq('id', report.id)
      .single();

    if (!error && data) {
      setIsPublic(data.is_public || false);
      if (data.share_token) {
        const link = `${window.location.origin}/share/report/${data.share_token}`;
        setShareLink(link);
      }
    } else {
      console.error('Error loading share data:', error);
    }
  };

  const handleTogglePublic = async () => {
    setIsUpdatingShare(true);
    try {
      const newIsPublic = !isPublic;

      const { data, error } = await supabase
        .from('ai_generated_reports')
        .update({ is_public: newIsPublic })
        .eq('id', report.id)
        .select('share_token')
        .single();

      if (error) throw error;

      setIsPublic(newIsPublic);

      if (newIsPublic && data.share_token) {
        const link = `${window.location.origin}/share/report/${data.share_token}`;
        setShareLink(link);
      } else {
        setShareLink('');
      }
    } catch (error) {
      console.error('Error toggling share:', error);
      alert('共有設定の更新に失敗しました');
    } finally {
      setIsUpdatingShare(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExport = () => {
    const reportText = `
${report.title}
${'='.repeat(report.title.length)}

期間: ${report.period_start} 〜 ${report.period_end}
レポート種別: ${report.report_type === 'weekly' ? '週次' : '月次'}
生成日時: ${new Date(report.generated_at).toLocaleString('ja-JP')}

【エグゼクティブサマリー】
${report.summary}

【主要指標】
- 総売上: ¥${report.metrics.totalSales.toLocaleString('ja-JP')}
- 総経費: ¥${report.metrics.totalExpenses.toLocaleString('ja-JP')}
- 粗利益: ¥${report.metrics.grossProfit.toLocaleString('ja-JP')}
- 営業利益: ¥${report.metrics.operatingProfit.toLocaleString('ja-JP')}
- 利益率: ${report.metrics.profitMargin.toFixed(1)}%
- 原価率: ${report.metrics.costRate.toFixed(1)}%
- 人件費率: ${report.metrics.laborRate.toFixed(1)}%

【重要な発見】
${report.key_insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

【改善提案】
${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

【詳細分析】
${Object.entries(report.analysis_content || {}).map(([key, value]) => `\n■ ${key}\n${value}`).join('\n')}
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}_${report.period_start}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <div className="flex gap-2">
          {canShare && (
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              共有リンク
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              削除
            </Button>
          )}
        </div>
      </div>

      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Share2 className="w-5 h-5 mr-2" />
                レポートを共有
              </h3>
              <p className="text-gray-600 mb-4">
                共有リンクを有効にすると、誰でもこのレポートを閲覧できるようになります。
              </p>

              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={handleTogglePublic}
                    disabled={isUpdatingShare}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    共有リンクを有効にする
                  </span>
                </label>
              </div>

              {shareLink && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    共有リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                      disabled={!isPublic}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copySuccess ? 'コピー済み' : 'コピー'}
                    </Button>
                  </div>
                  {isPublic ? (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      ✓ このリンクは有効です。誰でもレポートを閲覧できます
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      共有を有効にすると、このリンクでレポートを閲覧できるようになります
                    </p>
                  )}
                </div>
              )}

              {copySuccess && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">リンクをコピーしました</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowShareDialog(false);
                  setCopySuccess(false);
                }}
              >
                閉じる
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">レポートを削除</h3>
              <p className="text-gray-600">
                このレポートを削除してもよろしいですか？この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant={report.report_type === 'weekly' ? 'default' : 'secondary'} className="text-sm">
              {report.report_type === 'weekly' ? '期間指定レポート' : '月次レポート'}
            </Badge>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {report.period_start} 〜 {report.period_end}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {report.title}
          </h1>

          <p className="text-sm text-gray-500">
            生成日時: {new Date(report.generated_at).toLocaleString('ja-JP')} |
            AI Model: {report.generated_by}
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            エグゼクティブサマリー
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {report.summary}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">総売上</div>
            <div className="text-2xl font-bold text-blue-600">
              ¥{report.metrics.totalSales.toLocaleString('ja-JP')}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">粗利益</div>
            <div className="text-2xl font-bold text-green-600">
              ¥{report.metrics.grossProfit.toLocaleString('ja-JP')}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">営業利益</div>
            <div className="text-2xl font-bold text-purple-600">
              ¥{Math.round(report.metrics.operatingProfit).toLocaleString('ja-JP')}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">営業利益率</div>
            <div className="text-2xl font-bold text-indigo-600">
              {report.metrics.profitMargin.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">原価率</div>
            <div className="text-2xl font-bold text-orange-600">
              {report.metrics.costRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {report.metrics.storeBreakdown && report.metrics.storeBreakdown.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              店舗別実績
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.metrics.storeBreakdown.map((store) => (
                <Card key={store.storeId} className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{store.storeName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">売上</span>
                      <span className="font-medium">¥{store.sales.toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">営業利益</span>
                      <span className="font-medium text-green-600">¥{Math.round(store.profit).toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">営業利益率</span>
                      <span className="font-medium">{store.profitMargin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">原価率</span>
                      <span className="font-medium">{store.costRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
            重要な発見
          </h2>
          <div className="space-y-3">
            {report.key_insights.map((insight, index) => (
              <div key={index} className="flex items-start bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  {index + 1}
                </span>
                <p className="text-gray-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            改善提案
          </h2>
          <div className="space-y-3">
            {report.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start bg-green-50 border-l-4 border-green-500 p-4">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  {index + 1}
                </span>
                <p className="text-gray-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {report.analysis_content && Object.keys(report.analysis_content).length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              詳細分析
            </h2>
            <div className="space-y-6">
              {report.analysis_content.salesTrend && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">売上トレンド分析</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.analysis_content.salesTrend}
                  </p>
                </div>
              )}
              {report.analysis_content.profitability && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">収益性分析</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.analysis_content.profitability}
                  </p>
                </div>
              )}
              {report.analysis_content.costStructure && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">コスト構造分析</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.analysis_content.costStructure}
                  </p>
                </div>
              )}
              {report.analysis_content.storeComparison && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">店舗間比較分析</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.analysis_content.storeComparison}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
