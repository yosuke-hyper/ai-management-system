import { useState, useEffect } from 'react';
import { FileText, Plus, Filter, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AIReportsList } from '../components/reports/aireportslist';
import { AIReportDetail } from '../components/reports/aireportdetail';
import { GenerateReportDialog } from '../components/reports/generatereportdialog';
import { Button } from '../components/ui/button';
import { useAIReports } from '../hooks/useaireports';

export function AIReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdFromUrl = searchParams.get('report');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportIdFromUrl);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const { reports, refetch, deleteReport } = useAIReports();
  const [demoReport, setDemoReport] = useState<any>(null);

  useEffect(() => {
    if (reportIdFromUrl) {
      setSelectedReportId(reportIdFromUrl);
    }
  }, [reportIdFromUrl]);

  // Merge demo report with fetched reports if it exists
  const allReports = demoReport ? [demoReport, ...reports] : reports;

  const selectedReport = selectedReportId
    ? allReports.find((r) => r.id === selectedReportId)
    : null;

  // Filter by type
  let filteredReports = filterType === 'all'
    ? allReports
    : allReports.filter((r) => r.report_type === filterType);

  // Filter by month
  if (selectedMonth !== 'all') {
    filteredReports = filteredReports.filter((r) => {
      const reportMonth = r.period_start.substring(0, 7); // YYYY-MM format
      return reportMonth === selectedMonth;
    });
  }

  // Get unique months from all reports for the month selector
  // Also include current month and past 6 months even if no reports exist
  const getRecentMonths = () => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
    }
    return months;
  };

  const reportMonths = allReports.map((r) => r.period_start.substring(0, 7));
  const recentMonths = getRecentMonths();
  const availableMonths = Array.from(
    new Set([...recentMonths, ...reportMonths])
  ).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

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

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Type Filter */}
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

              {/* Month Filter */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべての月</option>
                  {availableMonths.map((month) => {
                    const [year, monthNum] = month.split('-');
                    return (
                      <option key={month} value={month}>
                        {year}年{monthNum}月
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <AIReportsList
            reports={filteredReports}
            onReportSelect={setSelectedReportId}
            onDelete={async (reportId) => {
              await deleteReport(reportId);
              await refetch();
            }}
          />
        </>
      )}

      {showGenerateDialog && (
        <GenerateReportDialog
          onClose={() => setShowGenerateDialog(false)}
          onSuccess={async (reportId, reportData) => {
            setShowGenerateDialog(false);

            // If reportData is provided (demo mode), store it temporarily
            if (reportData) {
              console.log('📊 Storing demo report:', reportData);
              setDemoReport(reportData);
            } else {
              // Otherwise refetch from database (authenticated mode)
              await refetch();
            }

            setSelectedReportId(reportId);
            setSearchParams({ report: reportId });
          }}
        />
      )}
    </div>
  );
}
