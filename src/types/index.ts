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
  manager?: string;
  brand_id?: string;
  brandId?: string;
  change_fund?: number;
  changeFund?: number;
  is_active?: boolean;
  isActive?: boolean;
  lunch_start_time?: string;
  lunch_end_time?: string;
  dinner_start_time?: string;
  dinner_end_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  type: string;
  defaultTargetProfitMargin: number;
  defaultCostRate: number;
  defaultLaborRate: number;
  color: string;
  icon: string;
  description?: string;
  settings?: Record<string, any>;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'manager' | 'admin' | 'owner';
  storeIds?: string[];
  lineUserId?: string;
  organizationId?: string;
  isSuperAdmin?: boolean;
  superAdminPermissions?: SuperAdminPermissions;
}

export interface SuperAdminPermissions {
  view_all_errors: boolean;
  view_all_organizations: boolean;
  manage_subscriptions: boolean;
  manage_users: boolean;
  delete_data: boolean;
}

export interface SystemAdmin {
  userId: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  permissions: SuperAdminPermissions;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivityLog {
  id: string;
  adminUserId: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  targetOrganizationId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
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
  role: 'owner' | 'admin' | 'manager' | 'staff';
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

export interface VendorPurchase {
  id: string;
  dailyReportId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: 'vegetable_meat' | 'seafood' | 'alcohol' | 'rice' | 'seasoning' | 'frozen' | 'dessert' | 'others';
  amount: number;
  date?: string;
  createdAt?: string;
}

export interface VendorPurchaseSummary {
  vendorId: string;
  vendorName: string;
  vendorCategory: 'vegetable_meat' | 'seafood' | 'alcohol' | 'rice' | 'seasoning' | 'frozen' | 'dessert' | 'others';
  totalAmount: number;
  purchaseCount: number;
  percentage: number;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly';

// Operation type for lunch/dinner split
export type OperationType = 'lunch' | 'dinner' | 'full_day';

// Operation hours configuration
export interface OperationHours {
  lunchStartTime: string; // HH:MM:SS format
  lunchEndTime: string;
  dinnerStartTime: string;
  dinnerEndTime: string;
}

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
  operationType: OperationType // 営業時間帯: lunch/dinner/full_day
  sales: number
  salesCash10?: number // 現金売上（10%税率）
  salesCash8?: number // 現金売上（8%税率）
  salesCredit10?: number // クレジット売上（10%税率）
  salesCredit8?: number // クレジット売上（8%税率）
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
  lunchCustomers?: number // ランチ客数
  dinnerCustomers?: number // ディナー客数
  reportText: string
  vendorPurchases?: Record<string, number>
  createdAt: string
  lastEditedBy?: string
  lastEditedAt?: string
  editCount?: number
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
  operationType?: OperationType // 営業時間帯別の目標
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