// Python API クライアント
import { DailyReport, SummaryData } from '../types';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

// API クライアント基底クラス
class ApiClient {
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok && response.status !== 404) {
        // 404の場合はPython APIが利用できないのでフォールバックする
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.status === 404) {
        // Python APIが利用できない場合はnullを返す
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('API request failed, falling back to mock data:', error);
      return null;
    }
  }

  // ヘルスチェック
  async healthCheck() {
    return this.request('/health');
  }

  // 日次報告関連
  async getReports(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const query = params.toString();
    return this.request(`/reports${query ? `?${query}` : ''}`);
  }

  async createReport(reportData: Omit<DailyReport, 'id' | 'createdAt'>) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify({
        date: reportData.date,
        store_name: reportData.storeName,
        staff_name: reportData.staffName,
        sales: reportData.sales,
        purchase: reportData.purchase,
        labor_cost: reportData.laborCost,
        utilities: reportData.utilities,
        promotion: reportData.promotion,
        cleaning: reportData.cleaning,
        misc: reportData.misc,
        communication: reportData.communication,
        others: reportData.others,
        report_text: reportData.reportText,
        line_user_id: reportData.lineUserId,
      }),
    });
  }

  // 集計データ
  async getSummary(periodType: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string) {
    const params = new URLSearchParams({ period_type: periodType });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request(`/summary?${params.toString()}`);
  }
}

// エクスポート用インスタンス
export const apiClient = new ApiClient();

// 従来のSupabase関数をAPIクライアント経由に変更
export const getDailyReports = (startDate?: string, endDate?: string) => {
  return apiClient.getReports(startDate, endDate);
};

export const createDailyReport = (reportData: Omit<DailyReport, 'id' | 'createdAt'>) => {
  return apiClient.createReport(reportData);
};

export const getSummaryData = (periodType: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string) => {
  return apiClient.getSummary(periodType, startDate, endDate);
};

export const getDashboardStats = async () => {
  const today = new Date().toISOString().split('T')[0];
  return apiClient.getSummary('daily', today, today);
};

// ヘルスチェック
export const checkApiHealth = () => {
  return apiClient.healthCheck();
};

// Legacy functions for compatibility with useAuth hook
export const getUserProfile = async (userId: string) => {
  // For now, return mock data to maintain compatibility
  // This will be replaced when auth system is fully updated
  return { data: null, error: { message: 'Function not implemented' } };
};

export const createUserProfile = async (profile: any) => {
  // For now, return mock data to maintain compatibility  
  // This will be replaced when auth system is fully updated
  return { data: null, error: { message: 'Function not implemented' } };
};