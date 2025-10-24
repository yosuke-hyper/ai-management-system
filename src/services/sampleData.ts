import {
  createStore,
  createVendor,
  assignVendorToStore,
  upsertTarget
} from './supabase'

export interface SampleDataResult {
  success: boolean
  message: string
  stores?: { id: string; name: string }[]
  vendors?: { id: string; name: string }[]
}

/**
 * サンプルデータを投入する（初期セットアップ用）
 */
export const insertSampleData = async (): Promise<SampleDataResult> => {
  try {
    const stores: { id: string; name: string }[] = []
    const vendors: { id: string; name: string }[] = []

    // 1. 店舗を作成
    const storeData = [
      { name: '豊洲店', address: '東京都江東区豊洲4-1-1' },
      { name: '有明店', address: '東京都江東区有明4-3-2' },
      { name: '本店', address: '東京都江東区古石場2-14-1' }
    ]

    for (const store of storeData) {
      const { data, error } = await createStore(store)
      if (error) {
        console.error('店舗作成エラー:', error)
        continue
      }
      if (data) {
        stores.push({ id: data.id, name: data.name })
      }
    }

    if (stores.length === 0) {
      return {
        success: false,
        message: '店舗の作成に失敗しました。管理者権限でログインしていることを確認してください。'
      }
    }

    // 2. 業者を作成
    const vendorData = [
      { name: '豊洲市場青果卸', category: 'vegetable_meat' as const, contact_info: '03-1234-5678', is_active: true },
      { name: '築地海産物', category: 'seafood' as const, contact_info: '03-2345-6789', is_active: true },
      { name: '酒類販売フジワラ', category: 'alcohol' as const, contact_info: '03-3456-7890', is_active: true },
      { name: '米問屋田中', category: 'rice' as const, contact_info: '03-4567-8901', is_active: true },
      { name: '調味料専門店', category: 'seasoning' as const, contact_info: '03-5678-9012', is_active: true },
      { name: '冷凍食品マルヨシ', category: 'frozen' as const, contact_info: '03-6789-0123', is_active: true }
    ]

    for (const vendor of vendorData) {
      const { data, error } = await createVendor(vendor)
      if (error) {
        console.error('業者作成エラー:', error)
        continue
      }
      if (data) {
        vendors.push({ id: data.id, name: data.name })
      }
    }

    // 3. 各店舗に全業者を割り当て
    for (const store of stores) {
      for (let i = 0; i < vendors.length; i++) {
        const vendor = vendors[i]
        await assignVendorToStore(store.id, vendor.id, i)
      }
    }

    // 4. 各店舗に目標値を設定（当月）
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const targetData = [
      { store_id: stores[0].id, period: currentMonth, target_sales: 5000000, target_profit: 1000000, target_profit_margin: 20.0 },
      { store_id: stores[1].id, period: currentMonth, target_sales: 4500000, target_profit: 900000, target_profit_margin: 20.0 },
      { store_id: stores[2].id, period: currentMonth, target_sales: 6000000, target_profit: 1200000, target_profit_margin: 20.0 }
    ]

    for (const target of targetData) {
      if (target.store_id) {
        await upsertTarget(target)
      }
    }

    return {
      success: true,
      message: `サンプルデータの投入が完了しました。\n店舗: ${stores.length}件、業者: ${vendors.length}件`,
      stores,
      vendors
    }
  } catch (error) {
    console.error('サンプルデータ投入エラー:', error)
    return {
      success: false,
      message: 'サンプルデータの投入中にエラーが発生しました。'
    }
  }
}
