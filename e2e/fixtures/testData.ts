export const testUsers = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL || 'owner@example.com',
    password: process.env.E2E_OWNER_PASSWORD || 'ownerpass123',
    role: 'owner',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'adminpass123',
    role: 'admin',
  },
  manager: {
    email: 'manager@example.com',
    password: 'managerpass123',
    role: 'manager',
  },
  staff: {
    email: 'staff@example.com',
    password: 'staffpass123',
    role: 'staff',
  },
  test: {
    email: process.env.E2E_TEST_EMAIL || 'test@example.com',
    password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
    role: 'admin',
  },
};

export const testStores = [
  {
    name: 'いっき古石場本店',
    address: '東京都江東区古石場2-14-1',
    manager: '田中太郎',
    brandId: '1',
  },
  {
    name: 'いっき有明店',
    address: '東京都江東区有明3-7-26',
    manager: '佐藤花子',
    brandId: '1',
  },
  {
    name: 'いっき豊洲店',
    address: '東京都江東区豊洲4-1-1',
    manager: '鈴木一郎',
    brandId: '1',
  },
];

export const testReportData = {
  basic: {
    date: '2025-01-15',
    sales: 850000,
    customerCount: 120,
    foodCost: 255000,
    laborCost: 212500,
  },
  lunch: {
    date: '2025-01-16',
    operationType: 'lunch',
    sales: 350000,
    customerCount: 80,
    foodCost: 105000,
    laborCost: 87500,
  },
  dinner: {
    date: '2025-01-16',
    operationType: 'dinner',
    sales: 500000,
    customerCount: 95,
    foodCost: 150000,
    laborCost: 125000,
  },
  highSales: {
    date: '2025-01-17',
    sales: 1200000,
    customerCount: 200,
    foodCost: 360000,
    laborCost: 300000,
  },
  lowSales: {
    date: '2025-01-18',
    sales: 300000,
    customerCount: 45,
    foodCost: 90000,
    laborCost: 75000,
  },
};

export const testTargets = {
  monthly: {
    period: '2025-01',
    targetSales: 25000000,
    targetProfitMargin: 20,
    targetCostRate: 30,
    targetLaborRate: 25,
  },
  ambitious: {
    period: '2025-02',
    targetSales: 30000000,
    targetProfitMargin: 25,
    targetCostRate: 28,
    targetLaborRate: 23,
  },
};

export const testVendors = [
  {
    name: '築地青果卸',
    category: 'vegetable_meat',
    contactInfo: '03-1234-5678',
    isActive: true,
  },
  {
    name: '豊洲水産',
    category: 'seafood',
    contactInfo: '03-2345-6789',
    isActive: true,
  },
  {
    name: '酒類卸売センター',
    category: 'alcohol',
    contactInfo: '03-3456-7890',
    isActive: true,
  },
];

export const mockAIResponse = {
  report: {
    summary: '本日の売上は順調に推移しています。',
    analysis: '原価率は目標値内ですが、人件費が若干高めです。',
    recommendations: [
      '原価率を2%改善することで、利益率が向上します',
      'ピーク時の人員配置を最適化してください',
      '次月の仕入れ計画を見直すことをお勧めします',
    ],
    insights: [
      '週末の売上が平日の1.5倍です',
      'ランチタイムの客単価が低下傾向にあります',
    ],
  },
  chat: {
    response: 'ご質問ありがとうございます。売上向上のためには、以下の施策をお勧めします...',
    suggestions: [
      'メニュー構成の見直し',
      'プロモーション施策の実施',
      'オペレーション効率化',
    ],
  },
};

export const testMonthlyExpenses = {
  basic: {
    period: '2025-01',
    rent: 500000,
    utilities: 150000,
    marketing: 200000,
    communication: 30000,
    supplies: 100000,
    maintenance: 80000,
    insurance: 50000,
    others: 120000,
  },
};

export function generateRandomReportData() {
  const randomSales = Math.floor(Math.random() * 500000) + 500000;
  return {
    date: new Date().toISOString().split('T')[0],
    sales: randomSales,
    customerCount: Math.floor(randomSales / 7000),
    foodCost: Math.floor(randomSales * 0.3),
    laborCost: Math.floor(randomSales * 0.25),
  };
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}
