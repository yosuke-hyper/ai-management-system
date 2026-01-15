import { supabase } from '@/lib/supabase';

export interface AnomalyResult {
  is_anomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  message: string;
  reason: string;
  current_value: number;
  average_value: number;
  std_deviation: number;
}

export interface AnomalyDetectionRequest {
  store_id: string;
  target_date: string;
  metric_type: 'sales' | 'cost_ratio' | 'labor_ratio' | 'customer_count' | 'fl_cost';
}

export interface AnomalyDetectionResponse {
  success: boolean;
  result?: AnomalyResult;
  error?: string;
}

export async function detectAnomaly(
  request: AnomalyDetectionRequest
): Promise<AnomalyDetectionResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: '認証が必要です'
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/detect-anomaly`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'エラーが発生しました'
      };
    }

    return {
      success: true,
      result: data.result
    };
  } catch (error) {
    console.error('異常検知エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
    };
  }
}

export async function checkMultipleMetrics(
  storeId: string,
  targetDate: string,
  metrics: Array<'sales' | 'cost_ratio' | 'labor_ratio' | 'customer_count' | 'fl_cost'>
): Promise<Array<{ metric: string; result: AnomalyResult | null }>> {
  const results = await Promise.all(
    metrics.map(async (metric) => {
      const response = await detectAnomaly({
        store_id: storeId,
        target_date: targetDate,
        metric_type: metric
      });

      return {
        metric,
        result: response.success ? response.result || null : null
      };
    })
  );

  return results;
}

export function getMetricName(metricType: string): string {
  switch (metricType) {
    case 'sales':
      return '売上';
    case 'cost_ratio':
      return '原価率';
    case 'labor_ratio':
      return '人件費率';
    case 'customer_count':
      return '客数';
    case 'fl_cost':
      return 'FLコスト';
    default:
      return '指標';
  }
}

export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'red';
    case 'medium':
      return 'amber';
    case 'low':
      return 'blue';
    default:
      return 'gray';
  }
}

export function getSeverityLabel(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return '重要';
    case 'medium':
      return '注意';
    case 'low':
      return '軽度';
    default:
      return '不明';
  }
}
