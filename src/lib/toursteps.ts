import { TourStep } from '../components/tour/interactivetour';

export const dashboardTourSteps: TourStep[] = [
  {
    id: 'dashboard-store-selector',
    target: '[data-tour="store-selector"]',
    title: '店舗を選択',
    content: 'まず、表示する店舗を選択しましょう。複数店舗がある場合は、ここで切り替えることができます。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
  {
    id: 'dashboard-period-selector',
    target: '[data-tour="period-selector"]',
    title: '期間を選択',
    content: '日次、週次、月次のダッシュボードを切り替えられます。デフォルトは日次表示です。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
  {
    id: 'dashboard-kpi-cards',
    target: '[data-tour="kpi-cards"]',
    title: '主要指標（KPI）',
    content: 'ここに売上、原価率、利益などの主要な経営指標が表示されます。目標との比較も一目で分かります。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
  {
    id: 'dashboard-sales-chart',
    target: '[data-tour="sales-chart"]',
    title: '売上推移グラフ',
    content: '売上の推移をビジュアルで確認できます。トレンドを把握して、素早く経営判断ができます。',
    position: 'top',
    route: '/dashboard/daily',
  },
  {
    id: 'dashboard-ai-chat',
    target: '[data-tour="ai-chat-widget"]',
    title: 'AI経営アシスタント',
    content: 'AIに質問して、データ分析やアドバイスを受けられます。「今月の売上はどう？」などと聞いてみましょう。',
    position: 'left',
    route: '/dashboard/daily',
  },
  {
    id: 'dashboard-sidebar-reports',
    target: '[data-tour="sidebar-reports"]',
    title: '日報入力',
    content: 'ここから日々の売上と仕入データを入力します。入力すると、自動で分析が行われます。',
    position: 'right',
    route: '/dashboard/daily',
  },
];

export const reportFormTourSteps: TourStep[] = [
  {
    id: 'report-date',
    target: '[data-tour="report-date"]',
    title: '日付を選択',
    content: '日報の対象日を選択します。当日だけでなく、過去のデータも入力できます。',
    position: 'bottom',
    route: '/reports/new',
  },
  {
    id: 'report-sales-section',
    target: '[data-tour="sales-section"]',
    title: '売上情報を入力',
    content: '売上金額、客数、客単価などを入力します。POS連携がある場合は自動入力されます。',
    position: 'right',
    route: '/reports/new',
  },
  {
    id: 'report-purchases-section',
    target: '[data-tour="purchases-section"]',
    title: '仕入情報を入力',
    content: '仕入先ごとに金額を入力します。テンプレートを使うと、毎日の入力が簡単になります。',
    position: 'right',
    route: '/reports/new',
  },
  {
    id: 'report-submit-button',
    target: '[data-tour="submit-button"]',
    title: '保存して分析',
    content: '入力が完了したら保存します。AIが自動で分析し、改善提案を生成します。',
    position: 'top',
    route: '/reports/new',
  },
];

export const settingsTourSteps: TourStep[] = [
  {
    id: 'settings-store-management',
    target: '[data-tour="store-management"]',
    title: '店舗管理',
    content: '店舗の基本情報や目標値を設定できます。複数店舗の一括管理も可能です。',
    position: 'right',
    route: '/admin',
    roles: ['owner', 'admin'],
  },
  {
    id: 'settings-vendor-management',
    target: '[data-tour="vendor-management"]',
    title: '仕入先管理',
    content: 'よく使う仕入先を登録しておくと、日報入力がスムーズになります。',
    position: 'right',
    route: '/admin',
    roles: ['owner', 'admin'],
  },
  {
    id: 'settings-target-settings',
    target: '[data-tour="target-settings"]',
    title: '目標設定',
    content: '売上目標、原価率目標などを設定します。ダッシュボードで達成度が可視化されます。',
    position: 'right',
    route: '/targets',
    roles: ['owner', 'admin', 'manager'],
  },
  {
    id: 'settings-member-management',
    target: '[data-tour="member-management"]',
    title: 'メンバー管理',
    content: 'チームメンバーを招待して、権限を設定できます。店長、スタッフなど役割に応じて設定しましょう。',
    position: 'right',
    route: '/organization',
    roles: ['owner', 'admin'],
  },
];

export const firstTimeTourSteps: TourStep[] = [
  {
    id: 'welcome-intro',
    target: '[data-tour="main-content"]',
    title: 'FoodValue AIへようこそ！',
    content: 'このツアーで、基本的な使い方をご案内します。いつでもスキップできます。画面の主要な機能を順番に紹介していきます。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
  {
    id: 'welcome-dashboard',
    target: '[data-tour="main-content"]',
    title: 'ダッシュボード画面',
    content: 'ここに売上・原価・利益などの主要データが表示されます。まずは日報を入力してデータを蓄積しましょう。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
  {
    id: 'welcome-complete',
    target: '[data-tour="main-content"]',
    title: 'ツアー完了！',
    content: 'これで基本的な使い方の説明は完了です。詳しい操作方法は「使い方ガイド」をご覧ください。',
    position: 'bottom',
    route: '/dashboard/daily',
  },
];

export const aiChatTourSteps: TourStep[] = [
  {
    id: 'chat-input',
    target: '[data-tour="chat-input"]',
    title: 'AIに質問',
    content: '自然な言葉で質問できます。「今月の売上は？」「原価率を改善するには？」など、何でも聞いてください。',
    position: 'top',
    route: '/ai-chat',
  },
  {
    id: 'chat-history',
    target: '[data-tour="chat-history"]',
    title: '会話履歴',
    content: '過去の会話は自動で保存されます。いつでも振り返ることができます。',
    position: 'bottom',
    route: '/ai-chat',
  },
  {
    id: 'chat-suggested-questions',
    target: '[data-tour="suggested-questions"]',
    title: 'おすすめの質問',
    content: 'よくある質問が表示されます。クリックするだけで簡単に質問できます。',
    position: 'top',
    route: '/ai-chat',
  },
];

export type TourName = 'dashboard' | 'reportForm' | 'settings' | 'firstTime' | 'aiChat';

export const tourStepsMap: Record<TourName, TourStep[]> = {
  dashboard: dashboardTourSteps,
  reportForm: reportFormTourSteps,
  settings: settingsTourSteps,
  firstTime: firstTimeTourSteps,
  aiChat: aiChatTourSteps,
};

export function getTourSteps(tourName: TourName): TourStep[] {
  return tourStepsMap[tourName] || [];
}

export function findStepIndexById(tourName: TourName, stepId: string): number {
  const steps = getTourSteps(tourName);
  return steps.findIndex(step => step.id === stepId);
}
