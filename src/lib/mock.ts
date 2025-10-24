// モックストアデータ（フォールバック用）
// 実際のデータはSupabaseまたはローカルストレージから取得します

import type { DailyReportData } from '@/types'

export const mockStores = [
  {
    id: 'store-toyosu',
    name: '居酒屋いっき豊洲店',
    address: '東京都江東区豊洲4-1-1',
    is_active: true
  },
  {
    id: 'store-ariake',
    name: '居酒屋いっき有明店',
    address: '東京都江東区有明4-3-2',
    is_active: true
  },
  {
    id: 'store-honten',
    name: '居酒屋いっき本店',
    address: '東京都江東区古石場2-14-1',
    is_active: true
  },
  {
    id: 'store-afro',
    name: 'バールアフロマージュスーヴォワル',
    address: '東京都世田谷区玉川4-5-6尾島ビル１F',
    is_active: true
  }
]

/**
 * 指定日数分のモック日報データを生成（デモ／データ欠損時のフォールバック用）
 * @param days 生成する日数（デフォルト30日）
 * @param storeId 店舗ID（指定しない場合は全店舗からランダム）
 * @returns モック日報データの配列
 */
export function generateMockReports(days: number = 30, storeId?: string): DailyReportData[] {
  const today = new Date()
  const reports: DailyReportData[] = []

  const stores = storeId
    ? mockStores.filter(s => s.id === storeId)
    : mockStores

  if (stores.length === 0) {
    console.warn('generateMockReports: 有効な店舗がありません')
    return []
  }

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    // 各店舗のデータを生成
    stores.forEach(store => {
      // 基本売上（店舗ごとに変動）
      const baseSales = store.id === 'store-toyosu' ? 280000 :
                       store.id === 'store-ariake' ? 250000 :
                       store.id === 'store-honten' ? 320000 : 200000

      // 日次変動（±30%）
      const variation = 0.7 + Math.random() * 0.6
      const sales = Math.round(baseSales * variation)

      // 原価率32%
      const purchase = Math.round(sales * 0.32)

      // 人件費率25%
      const laborCost = Math.round(sales * 0.25)

      // その他経費
      const utilities = Math.round(sales * 0.03)
      const promotion = Math.round(sales * 0.02)
      const cleaning = Math.round(sales * 0.01)
      const misc = Math.round(sales * 0.02)
      const communication = Math.round(sales * 0.005)
      const others = Math.round(sales * 0.015)

      // 売上内訳（税率・決済方法）
      const salesCash10 = Math.round(sales * 0.50)    // 現金10%税率: 50%
      const salesCash8 = Math.round(sales * 0.15)     // 現金8%税率: 15%
      const salesCredit10 = Math.round(sales * 0.25)  // クレジット10%税率: 25%
      const salesCredit8 = Math.round(sales * 0.10)   // クレジット8%税率: 10%

      // 客数（客単価3,500円前後）
      const customers = Math.round(sales / 3500)

      reports.push({
        id: `mock-${store.id}-${dateStr}`,
        date: dateStr,
        storeId: store.id,
        storeName: store.name,
        sales,
        purchase,
        laborCost,
        utilities,
        promotion,
        cleaning,
        misc,
        communication,
        others,
        salesCash10,
        salesCash8,
        salesCredit10,
        salesCredit8,
        customers,
        reportText: 'モックデータ',
        createdAt: new Date().toISOString()
      })
    })
  }

  return reports
}

/**
 * 指定期間のモック日報を生成
 * @param params.storeId 店舗ID
 * @param params.start 開始日（YYYY-MM-DD）
 * @param params.end 終了日（YYYY-MM-DD）
 * @returns モック日報データの配列
 */
export function generateMockReportsForPeriod(params: {
  storeId: string
  start: string
  end: string
}): DailyReportData[] {
  const { storeId, start, end } = params
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (startDate > endDate) {
    console.warn('generateMockReportsForPeriod: 開始日が終了日より後です')
    return []
  }

  const reports: DailyReportData[] = []
  const store = mockStores.find(s => s.id === storeId)

  if (!store) {
    console.warn('generateMockReportsForPeriod: 店舗が見つかりません', storeId)
    return []
  }

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().slice(0, 10)

    // 基本売上
    const baseSales = store.id === 'store-toyosu' ? 280000 :
                     store.id === 'store-ariake' ? 250000 :
                     store.id === 'store-honten' ? 320000 : 200000

    const variation = 0.7 + Math.random() * 0.6
    const sales = Math.round(baseSales * variation)
    const purchase = Math.round(sales * 0.32)
    const laborCost = Math.round(sales * 0.25)
    const utilities = Math.round(sales * 0.03)
    const promotion = Math.round(sales * 0.02)
    const cleaning = Math.round(sales * 0.01)
    const misc = Math.round(sales * 0.02)
    const communication = Math.round(sales * 0.005)
    const others = Math.round(sales * 0.015)

    const salesCash10 = Math.round(sales * 0.50)
    const salesCash8 = Math.round(sales * 0.15)
    const salesCredit10 = Math.round(sales * 0.25)
    const salesCredit8 = Math.round(sales * 0.10)
    const customers = Math.round(sales / 3500)

    reports.push({
      id: `mock-${store.id}-${dateStr}`,
      date: dateStr,
      storeId: store.id,
      storeName: store.name,
      sales,
      purchase,
      laborCost,
      utilities,
      promotion,
      cleaning,
      misc,
      communication,
      others,
      salesCash10,
      salesCash8,
      salesCredit10,
      salesCredit8,
      customers,
      reportText: 'モックデータ',
      createdAt: new Date().toISOString()
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return reports
}

// 型定義は @/types からimportしてください
export type { DailyReportData, TargetData, Store } from '@/types'
