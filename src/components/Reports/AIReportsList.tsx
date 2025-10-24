import { FileText, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { useAIReports } from '../../hooks/useAIReports';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AIReportsListProps {
  storeId?: string;
  onReportSelect: (reportId: string) => void;
}

export function AIReportsList({ storeId, onReportSelect }: AIReportsListProps) {
  const { reports, loading, error } = useAIReports(storeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">レポートの読み込みに失敗しました</p>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">レポートがありません</h3>
        <p className="text-gray-500">
          自動生成されたレポートがここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onReportSelect(report.id)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant={report.report_type === 'weekly' ? 'default' : 'secondary'}>
                  {report.report_type === 'weekly' ? '期間指定' : '月次レポート'}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {report.period_start} 〜 {report.period_end}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {report.title}
              </h3>

              <p className="text-gray-600 mb-4 line-clamp-2">
                {report.summary}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">売上</div>
                  <div className="text-lg font-bold text-blue-600">
                    ¥{report.metrics.totalSales.toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">営業利益</div>
                  <div className="text-lg font-bold text-green-600">
                    ¥{Math.round(report.metrics.operatingProfit).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">利益率</div>
                  <div className="text-lg font-bold text-purple-600">
                    {report.metrics.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {report.key_insights.length}件の重要な発見
                </span>
              </div>
            </div>

            <div className="ml-4 text-right">
              <div className="text-sm text-gray-500 mb-2">
                {new Date(report.generated_at).toLocaleString('ja-JP')}
              </div>
              <Button variant="outline" size="sm">
                詳細を見る
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
