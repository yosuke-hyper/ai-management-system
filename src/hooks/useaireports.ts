import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AIReport {
  id: string;
  store_id: string | null;
  report_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  title: string;
  summary: string;
  analysis_content: {
    salesTrend?: string;
    profitability?: string;
    costStructure?: string;
    storeComparison?: string;
  };
  key_insights: string[];
  recommendations: string[];
  metrics: {
    totalSales: number;
    totalExpenses: number;
    grossProfit: number;
    operatingProfit: number;
    profitMargin: number;
    costRate: number;
    laborRate: number;
    storeBreakdown?: Array<{
      storeId: string;
      storeName: string;
      sales: number;
      expenses: number;
      profit: number;
      profitMargin: number;
      costRate: number;
      laborRate: number;
    }>;
  };
  generated_by: string;
  generated_at: string;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  report_type: 'weekly' | 'monthly';
  store_id: string | null;
  is_enabled: boolean;
  cron_expression: string;
  last_run_at: string | null;
  next_run_at: string | null;
  notification_emails: string[];
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationLog {
  id: string;
  schedule_id: string | null;
  report_id: string | null;
  report_type: 'weekly' | 'monthly';
  store_id: string | null;
  status: 'success' | 'failed' | 'in_progress';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  data_summary: {
    reportCount?: number;
    storeCount?: number;
  };
  created_at: string;
}

export function useAIReports(storeId?: string) {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if in demo mode
      const demoSessionId = typeof window !== 'undefined' ? localStorage.getItem('demo_session_id') : null;
      const isDemo = !!demoSessionId;

      if (isDemo && demoSessionId) {
        // Fetch from demo_ai_reports table
        let query = supabase
          .from('demo_ai_reports')
          .select('*')
          .eq('demo_session_id', demoSessionId)
          .order('generated_at', { ascending: false });

        if (storeId && storeId !== 'all') {
          query = query.eq('store_id', storeId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setReports(data || []);
      } else {
        // Fetch from production ai_generated_reports table
        let query = supabase
          .from('ai_generated_reports')
          .select('*')
          .order('generated_at', { ascending: false });

        if (storeId) {
          query = query.eq('store_id', storeId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setReports(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    console.log('🗑️ Starting delete process for report:', reportId);

    // Check if in demo mode
    const demoSessionId = typeof window !== 'undefined' ? localStorage.getItem('demo_session_id') : null;
    const isDemo = !!demoSessionId;

    const tableName = isDemo ? 'demo_ai_reports' : 'ai_generated_reports';
    console.log('📊 Using table:', tableName, 'Demo mode:', isDemo);

    // Get current user info for debugging
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.id);

    const { data, error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', reportId)
      .select();

    console.log('📤 Delete response:', { data, error: deleteError });

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw new Error(deleteError.message || 'Failed to delete report');
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No rows deleted - possible permission issue');
      throw new Error('削除に失敗しました。レポートを削除する権限がありません。管理者またはマネージャーの権限が必要です。');
    }

    console.log('✅ Delete successful');
    await fetchReports();
  };

  useEffect(() => {
    fetchReports();
  }, [storeId]);

  return { reports, loading, error, refetch: fetchReports, deleteReport };
}

export function useReportSchedules() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSchedules(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (schedule: Omit<ReportSchedule, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'next_run_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('report_schedules')
        .insert(schedule)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchSchedules();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create schedule' };
    }
  };

  const updateSchedule = async (id: string, updates: Partial<ReportSchedule>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('report_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchSchedules();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update schedule' };
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchSchedules();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to delete schedule' };
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return {
    schedules,
    loading,
    error,
    refetch: fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

export function useReportGenerationLogs() {
  const [logs, setLogs] = useState<ReportGenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_generation_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return { logs, loading, error, refetch: fetchLogs };
}

export async function generateReport(
  reportType: 'weekly' | 'monthly',
  storeId?: string,
  periodStart?: string,
  periodEnd?: string
) {
  try {
    // Check if demo session
    const demoSessionId = typeof window !== 'undefined' ? localStorage.getItem('demo_session_id') : null;
    const isDemo = !!demoSessionId;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session && !isDemo) {
      throw new Error('Not authenticated');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-report`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reportType,
        storeId: storeId || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        ...(isDemo && demoSessionId ? { demo_session_id: demoSessionId } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate report');
    }

    const result = await response.json();
    return { data: result.report, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to generate report' };
  }
}
