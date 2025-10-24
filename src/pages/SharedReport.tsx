import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, TrendingUp, TrendingDown, Calendar, Store } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  summary: string;
  report_type: string;
  period_start: string;
  period_end: string;
  key_insights: string[];
  recommendations: string[];
  metrics: {
    totalSales?: number;
    totalExpenses?: number;
    grossProfit?: number;
    operatingProfit?: number;
    profitMargin?: number;
    costRate?: number;
    laborRate?: number;
  };
  generated_at: string;
  store_id?: string;
  store_name?: string;
}

export default function SharedReport() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('ai_generated_reports')
          .select(`
            *,
            stores!ai_generated_reports_store_id_fkey(name)
          `)
          .eq('share_token', shareToken)
          .eq('is_public', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('このレポートは見つからないか、共有が無効になっています。');
          return;
        }

        setReport({
          ...data,
          store_name: data.stores?.name,
        });
      } catch (err) {
        console.error('Error loading shared report:', err);
        setError('レポートの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }

    if (shareToken) {
      loadReport();
    }
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">レポートを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">レポートが見つかりません</h2>
          <p className="text-gray-600">{error || 'このレポートは存在しないか、アクセスできません。'}</p>
        </div>
      </div>
    );
  }

  const metrics = report.metrics || {};
  const formatCurrency = (value: number) => `¥${value.toLocaleString('ja-JP')}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-3">{report.title}</h1>
              <div className="flex flex-wrap gap-4 text-blue-100">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{report.period_start} 〜 {report.period_end}</span>
                </div>
                {report.store_name && (
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>{report.store_name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <div className="text-sm text-blue-100">レポート種類</div>
              <div className="font-semibold">
                {report.report_type === 'weekly' ? '週次' : '月次'}レポート
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            エグゼクティブサマリー
          </h2>
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">主要指標</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metrics.totalSales !== undefined && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">総売上</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(metrics.totalSales)}
                </div>
              </div>
            )}
            {metrics.totalExpenses !== undefined && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">総経費</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(metrics.totalExpenses)}
                </div>
              </div>
            )}
            {metrics.grossProfit !== undefined && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">粗利益</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.grossProfit)}
                </div>
              </div>
            )}
            {metrics.operatingProfit !== undefined && (
              <div className={`${metrics.operatingProfit >= 0 ? 'bg-emerald-50' : 'bg-orange-50'} rounded-lg p-4`}>
                <div className="text-sm text-gray-600 mb-1">営業利益</div>
                <div className={`text-2xl font-bold flex items-center gap-1 ${metrics.operatingProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {metrics.operatingProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {formatCurrency(metrics.operatingProfit)}
                </div>
              </div>
            )}
            {metrics.profitMargin !== undefined && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">利益率</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatPercent(metrics.profitMargin)}
                </div>
              </div>
            )}
            {metrics.costRate !== undefined && (
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">原価率</div>
                <div className="text-2xl font-bold text-amber-600">
                  {formatPercent(metrics.costRate)}
                </div>
              </div>
            )}
            {metrics.laborRate !== undefined && (
              <div className="bg-cyan-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">人件費率</div>
                <div className="text-2xl font-bold text-cyan-600">
                  {formatPercent(metrics.laborRate)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Insights */}
        {report.key_insights && report.key_insights.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">重要な発見</h2>
            <div className="space-y-3">
              {report.key_insights.map((insight, index) => (
                <div key={index} className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">改善提案</h2>
            <div className="space-y-3">
              {report.recommendations.map((rec, index) => (
                <div key={index} className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-6">
          <p>このレポートは AI によって自動生成されました</p>
          <p className="mt-1">生成日時: {new Date(report.generated_at).toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>
  );
}
