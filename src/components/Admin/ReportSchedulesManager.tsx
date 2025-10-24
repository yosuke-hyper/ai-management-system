import { useState } from 'react';
import { Calendar, Plus, Edit2, Trash2, Power, PowerOff, Loader2 } from 'lucide-react';
import { useReportSchedules, ReportSchedule } from '../../hooks/useAIReports';
import { useStores } from '../../hooks/useStores';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function ReportSchedulesManager() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, refetch } = useReportSchedules();
  const { stores } = useStores();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const toggleSchedule = async (schedule: ReportSchedule) => {
    await updateSchedule(schedule.id, { is_enabled: !schedule.is_enabled });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('このスケジュールを削除してもよろしいですか?')) {
      await deleteSchedule(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-6 h-6 mr-3" />
            レポート自動生成スケジュール
          </h2>
          <p className="text-gray-600 mt-1">
            週次・月次レポートの自動生成を設定します
          </p>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          スケジュール追加
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            スケジュールがありません
          </h3>
          <p className="text-gray-500 mb-6">
            自動レポート生成のスケジュールを追加してください
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            最初のスケジュールを追加
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const storeName = schedule.store_id
              ? stores.find((s) => s.id === schedule.store_id)?.name || '不明な店舗'
              : '全店舗';

            return (
              <Card key={schedule.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant={schedule.report_type === 'weekly' ? 'default' : 'secondary'}>
                        {schedule.report_type === 'weekly' ? '週次' : '月次'}
                      </Badge>
                      <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                        {schedule.is_enabled ? '有効' : '無効'}
                      </Badge>
                      <span className="text-sm text-gray-500">{storeName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cron式:</span>
                        <span className="ml-2 font-mono text-gray-900">
                          {schedule.cron_expression}
                        </span>
                      </div>

                      {schedule.last_run_at && (
                        <div>
                          <span className="text-gray-600">前回実行:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(schedule.last_run_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                      )}

                      {schedule.next_run_at && (
                        <div>
                          <span className="text-gray-600">次回実行:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(schedule.next_run_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                      )}

                      {schedule.notification_emails.length > 0 && (
                        <div>
                          <span className="text-gray-600">通知先:</span>
                          <span className="ml-2 text-gray-900">
                            {schedule.notification_emails.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSchedule(schedule)}
                    >
                      {schedule.is_enabled ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showCreateDialog && (
        <CreateScheduleDialog
          stores={stores}
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (data) => {
            await createSchedule(data);
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface CreateScheduleDialogProps {
  stores: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreate: (data: Omit<ReportSchedule, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'next_run_at'>) => void;
}

function CreateScheduleDialog({ stores, onClose, onCreate }: CreateScheduleDialogProps) {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [storeId, setStoreId] = useState<string>('all');
  const [emails, setEmails] = useState<string>('');

  const handleSubmit = () => {
    const cronExpression = reportType === 'weekly' ? '0 6 * * 1' : '0 6 1 * *';

    onCreate({
      report_type: reportType,
      store_id: storeId === 'all' ? null : storeId,
      is_enabled: true,
      cron_expression: cronExpression,
      notification_emails: emails.split(',').map((e) => e.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          スケジュール追加
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              レポート種別
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'weekly' | 'monthly')}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="weekly">週次 (毎週月曜 6:00)</option>
              <option value="monthly">月次 (毎月1日 6:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象店舗
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">全店舗</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              通知先メールアドレス (カンマ区切り)
            </label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              作成
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
