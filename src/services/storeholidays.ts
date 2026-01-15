import { supabase } from '@/lib/supabase'

export interface StoreRegularClosedDay {
  id: string
  storeId: string
  dayOfWeek: number // 0=日曜, 1=月曜, ..., 6=土曜
  organizationId: string
  createdAt: string
}

export interface StoreHoliday {
  id: string
  storeId: string
  date: string
  type: 'national_holiday' | 'temporary_closure' | 'special_event'
  reason?: string
  organizationId: string
  createdAt: string
}

export interface StoreRegularClosedDayDb {
  id: string
  store_id: string
  day_of_week: number
  organization_id: string
  created_at: string
}

export interface StoreHolidayDb {
  id: string
  store_id: string
  date: string
  type: 'national_holiday' | 'temporary_closure' | 'special_event'
  reason?: string
  organization_id: string
  created_at: string
}

// 定休日の取得
export async function getStoreRegularClosedDays(storeId: string) {
  const { data, error } = await supabase
    .from('store_regular_closed_days')
    .select('*')
    .eq('store_id', storeId)
    .order('day_of_week')

  if (error) {
    console.error('Error fetching regular closed days:', error)
    return { data: null, error }
  }

  return {
    data: data?.map((row: StoreRegularClosedDayDb) => ({
      id: row.id,
      storeId: row.store_id,
      dayOfWeek: row.day_of_week,
      organizationId: row.organization_id,
      createdAt: row.created_at
    })) || null,
    error: null
  }
}

// 定休日の設定（一括更新）
export async function setStoreRegularClosedDays(
  storeId: string,
  organizationId: string,
  daysOfWeek: number[]
) {
  // 既存の定休日を削除
  const { error: deleteError } = await supabase
    .from('store_regular_closed_days')
    .delete()
    .eq('store_id', storeId)

  if (deleteError) {
    console.error('Error deleting regular closed days:', deleteError)
    return { error: deleteError }
  }

  // 新しい定休日を登録
  if (daysOfWeek.length > 0) {
    const records = daysOfWeek.map(day => ({
      store_id: storeId,
      day_of_week: day,
      organization_id: organizationId
    }))

    const { error: insertError } = await supabase
      .from('store_regular_closed_days')
      .insert(records)

    if (insertError) {
      console.error('Error inserting regular closed days:', insertError)
      return { error: insertError }
    }
  }

  return { error: null }
}

// 特定日の休日一覧を取得
export async function getStoreHolidays(storeId: string, yearMonth?: string) {
  let query = supabase
    .from('store_holidays')
    .select('*')
    .eq('store_id', storeId)

  // 年月が指定されている場合、その月のデータのみを取得
  if (yearMonth) {
    const startDate = `${yearMonth}-01`
    const endDate = `${yearMonth}-31`
    query = query.gte('date', startDate).lte('date', endDate)
  }

  const { data, error } = await query.order('date')

  if (error) {
    console.error('Error fetching store holidays:', error)
    return { data: null, error }
  }

  return {
    data: data?.map((row: StoreHolidayDb) => ({
      id: row.id,
      storeId: row.store_id,
      date: row.date,
      type: row.type,
      reason: row.reason,
      organizationId: row.organization_id,
      createdAt: row.created_at
    })) || null,
    error: null
  }
}

// 特定日の休日を追加
export async function addStoreHoliday(
  storeId: string,
  organizationId: string,
  date: string,
  type: 'national_holiday' | 'temporary_closure' | 'special_event',
  reason?: string
) {
  const { data, error } = await supabase
    .from('store_holidays')
    .insert({
      store_id: storeId,
      organization_id: organizationId,
      date,
      type,
      reason
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding store holiday:', error)
    return { data: null, error }
  }

  return {
    data: data ? {
      id: data.id,
      storeId: data.store_id,
      date: data.date,
      type: data.type,
      reason: data.reason,
      organizationId: data.organization_id,
      createdAt: data.created_at
    } : null,
    error: null
  }
}

// 特定日の休日を削除
export async function deleteStoreHoliday(holidayId: string) {
  const { error } = await supabase
    .from('store_holidays')
    .delete()
    .eq('id', holidayId)

  if (error) {
    console.error('Error deleting store holiday:', error)
    return { error }
  }

  return { error: null }
}

// 営業日数を計算
export async function calculateOpenDays(storeId: string, yearMonth: string) {
  const { data, error } = await supabase.rpc('calculate_open_days', {
    p_store_id: storeId,
    p_year_month: yearMonth
  })

  if (error) {
    console.error('Error calculating open days:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// 特定の日付が休日かどうかをチェック
export async function isHoliday(storeId: string, date: string): Promise<boolean> {
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()

  // 定休日チェック
  const { data: regularClosedDays } = await getStoreRegularClosedDays(storeId)
  if (regularClosedDays?.some(day => day.dayOfWeek === dayOfWeek)) {
    return true
  }

  // 特定日の休日チェック
  const { data: holidays } = await supabase
    .from('store_holidays')
    .select('id')
    .eq('store_id', storeId)
    .eq('date', date)
    .single()

  return !!holidays
}

// 休日を一括追加
export async function addStoreHolidaysBulk(
  storeId: string,
  organizationId: string,
  dates: string[],
  type: 'national_holiday' | 'temporary_closure' | 'special_event',
  reason?: string
) {
  const records = dates.map(date => ({
    store_id: storeId,
    organization_id: organizationId,
    date,
    type,
    reason
  }))

  const { data, error } = await supabase
    .from('store_holidays')
    .insert(records)
    .select()

  if (error) {
    console.error('Error adding bulk store holidays:', error)
    return { data: null, error }
  }

  return {
    data: data?.map((row: StoreHolidayDb) => ({
      id: row.id,
      storeId: row.store_id,
      date: row.date,
      type: row.type,
      reason: row.reason,
      organizationId: row.organization_id,
      createdAt: row.created_at
    })) || null,
    error: null
  }
}

// 休日を一括削除
export async function deleteStoreHolidaysBulk(holidayIds: string[]) {
  const { error } = await supabase
    .from('store_holidays')
    .delete()
    .in('id', holidayIds)

  if (error) {
    console.error('Error deleting bulk store holidays:', error)
    return { error }
  }

  return { error: null }
}
