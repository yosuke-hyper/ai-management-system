import { useState, useEffect } from 'react';
import { FileText, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface RecentReport {
  id: string;
  title: string;
  report_type: 'weekly' | 'monthly';
  generated_at: string;
}

export function AIReportNotification() {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentReports();

    const dismissedIds = localStorage.getItem('dismissedReports');
    if (dismissedIds) {
      setDismissed(JSON.parse(dismissedIds));
    }

    const subscription = supabase
      .channel('ai_reports_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_generated_reports',
        },
        (payload) => {
          fetchRecentReports();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRecentReports = async () => {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from('ai_generated_reports')
        .select('id, title, report_type, generated_at')
        .gte('generated_at', oneDayAgo.toISOString())
        .order('generated_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      setRecentReports(data || []);
    } catch (err) {
      console.error('Failed to fetch recent reports:', err);
    }
  };

  const handleDismiss = (reportId: string) => {
    const newDismissed = [...dismissed, reportId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedReports', JSON.stringify(newDismissed));
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/ai-reports?report=${reportId}`);
  };

  const visibleReports = recentReports.filter((report) => !dismissed.includes(report.id));

  if (visibleReports.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 space-y-3 max-w-sm">
      {visibleReports.map((report) => (
        <div
          key={report.id}
          className="bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 animate-slide-in"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 rounded-full p-2">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">新しいレポート</p>
                <Badge variant={report.report_type === 'weekly' ? 'default' : 'secondary'} className="text-xs">
                  {report.report_type === 'weekly' ? '週次' : '月次'}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(report.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-700 mb-1 font-medium line-clamp-2">
            {report.title}
          </p>

          <p className="text-xs text-gray-500 mb-4">
            {new Date(report.generated_at).toLocaleString('ja-JP')}
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleViewReport(report.id)}
              className="flex-1"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              表示
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDismiss(report.id)}
            >
              閉じる
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
