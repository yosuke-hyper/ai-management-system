import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/authcontext';
import { useError } from '@/contexts/errorcontext';
import { logAuditEvent } from '@/services/auditlog';

interface UpdateReportData {
  sales?: number;
  purchase?: number;
  labor_cost?: number;
  utilities?: number;
  promotion?: number;
  cleaning?: number;
  misc?: number;
  communication?: number;
  others?: number;
  customers?: number;
  lunch_customers?: number;
  dinner_customers?: number;
  report_text?: string;
}

export function useReportEdit() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { showError } = useError();

  const updateReport = async (
    reportId: string,
    updates: UpdateReportData,
    organizationId?: string
  ): Promise<boolean> => {
    if (!user) {
      showError('ユーザーが認証されていません');
      return false;
    }

    setIsUpdating(true);
    try {
      const { data: report, error: fetchError } = await supabase
        .from('daily_reports')
        .select('*, stores(organization_id)')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;
      if (!report) throw new Error('レポートが見つかりません');

      const { error: updateError } = await supabase
        .from('daily_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      const orgId = organizationId || (report.stores as any)?.organization_id;
      if (orgId) {
        await logAuditEvent({
          action: 'update',
          resourceType: 'daily_report',
          resourceId: reportId,
          organizationId: orgId,
          details: {
            updated_fields: Object.keys(updates),
            report_date: report.date,
          },
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to update report:', error);
      showError(error.message || 'レポートの更新に失敗しました');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateReport,
    isUpdating,
  };
}
