// 業務報告システム - 型定義

export interface DailyReport {
  id: string;
  date: string;
  storeId: string;
  storeName: string;
  staffName: string;
  // 売上詳細（税率・決済方法別）
  salesCash10: number;     // 現金・10%飲食
  salesCash8: number;      // 現金・8%飲食
  salesCredit10: number;   // クレジット・10%飲食
  salesCredit8: number;    // クレジット・8%飲食
  sales: number;           // 合計売上（自動計算）
  purchase: number;        // 仕入れ
  laborCost: number;      // 人件費
  utilities: number;      // 水道光熱費
  rent: number;          // 賃料
  consumables: number;   // 消耗品費
  promotion: number;      // 販促費
  cleaning: number;       // 清掃費
  misc: number;          // 雑費
  communication: number; // 通信費
  others: number;        // その他
  reportText: string;    // 報告内容
  createdAt: string;
  lineUserId?: string;   // LINE送信者ID
}

export interface SummaryData {
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;    // 粗利益（売上 - 仕入れ）
  operatingProfit: number; // 営業利益（売上 - 全経費）
  profitMargin: number;   // 利益率
  storeCount?: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  manager_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'manager' | 'admin';
  storeIds?: string[];
  lineUserId?: string;
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionPlan: 'free' | 'starter' | 'business' | 'enterprise';
  trialEndsAt?: string;
  maxStores: number;
  maxUsers: number;
  maxAiRequestsPerMonth: number;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: 'vegetable_meat' | 'seafood' | 'alcohol' | 'rice' | 'seasoning' | 'frozen' | 'dessert' | 'others';
  contactInfo?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreVendorAssignment {
  storeId: string;
  vendorId: string;
  displayOrder: number;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly';

// Google Sheets API用の型
export interface SheetsData {
  range: string;
  majorDimension: 'ROWS' | 'COLUMNS';
  values: string[][];
}

// LINE Webhook用の型
export interface LineMessage {
  type: 'text';
  text: string;
}

export interface LineWebhookEvent {
  type: 'message';
  message: LineMessage;
  source: {
    userId: string;
    type: 'user';
  };
  timestamp: number;
  replyToken: string;
}

// 日報データ型（フロントエンド用）
export interface DailyReportData {
  id: string
  date: string
  storeId: string
  storeName: string
  staffName: string
  sales: number
  purchase: number
  laborCost: number
  utilities: number
  rent: number
  consumables: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  customers?: number
  reportText: string
  vendorPurchases?: Record<string, number>
  createdAt: string
}

// 目標データ型
export interface TargetData {
  id: string
  storeId: string
  storeName?: string
  period: string
  periodType: 'daily' | 'weekly' | 'monthly'
  targetSales: number
  targetProfit: number
  targetProfitMargin: number
  targetCostRate: number      // 目標原価率 (%)
  targetLaborRate: number     // 目標人件費率 (%)
  createdAt?: string
  updatedAt?: string
}

// 日別売上目標データ型
export interface DailyTargetData {
  id: string
  storeId: string
  date: string // YYYY-MM-DD
  targetSales: number
  createdAt?: string
  updatedAt?: string
}

// 目標達成状況型
export interface TargetAchievement {
  targetSales: number
  actualSales: number
  achievementRate: number // 達成率 (%)
  isAchieved: boolean
  difference: number // 目標との差額
}