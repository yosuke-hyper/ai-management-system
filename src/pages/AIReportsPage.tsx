import { useState, useEffect } from 'react';
import { FileText, Plus, Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AIReportsList } from '../components/Reports/AIReportsList';
import { AIReportDetail } from '../components/Reports/AIReportDetail';
import { GenerateReportDialog } from '../components/Reports/GenerateReportDialog';
import { Button } from '../components/ui/button';
import { useAIReports } from '../hooks/useAIReports';

export function AIReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get('report');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportIdFromUrl);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'weekly' | 'monthly'>('all');
  const { reports, refetch, deleteReport } = useAIReports();

  useEffect(() => {
    if (reportIdFromUrl) {
      setSelectedReportId(reportIdFromUrl);
    }
  }, [reportIdFromUrl]);

  const selectedReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId)
    : null;

  const filteredReports = filterType === 'all'
    ? reports
    : reports.filter((r) => r.report_type === filterType);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {selectedReport ? (
        <AIReportDetail
          report={selectedReport}
          onBack={() => setSelectedReportId(null)}
          onDelete={deleteReport}
        />
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-8 h-8 mr-3" />
                  AI分析レポート
                </h1>
                <p className="text-gray-600 mt-2">
                  AIが自動生成した詳細な業績分析レポート
                </p>
              </div>

              <Button onClick={() => setShowGenerateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                レポート生成
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  すべて
                </Button>
                <Button
                  variant={filterType === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('weekly')}
                >
                  期間指定
                </Button>
                <Button
                  variant={filterType === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('monthly')}
                >
                  月次
                </Button>
              </div>
            </div>
          </div>

          <AIReportsList
            onReportSelect={setSelectedReportId}
          />
        </>
      )}

      {showGenerateDialog && (
        <GenerateReportDialog
          onClose={() => setShowGenerateDialog(false)}
          onSuccess={async (reportId) => {
            setShowGenerateDialog(false);
            await refetch();
            setSelectedReportId(reportId);
            setSearchParams({ report: reportId });
          }}
        />
      )}
    </div>
  );
}
