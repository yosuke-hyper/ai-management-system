import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL!
const key = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'rms-auth',
  },
})

export const isSupabaseReady = () => Boolean(url && key)

console.log(isSupabaseReady() ? '✅ Supabase configured' : '⚠️ Supabase not configured', {
  hasUrl: !!url,
  hasKey: !!key,
})

if (import.meta.env.DEV && supabase) {
  (window as any).__supabase = supabase
}

export interface Profile {
  id: string
  name: string
  email: string
  role: 'staff' | 'manager' | 'admin'
  created_at?: string
  updated_at?: string
}

export interface Store {
  id: string
  name: string
  address: string
  manager_id?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface DailyReportDb {
  id: string
  date: string
  store_id: string
  user_id: string
  sales: number
  purchase: number
  labor_cost: number
  utilities: number
  promotion: number
  cleaning: number
  misc: number
  communication: number
  others: number
  customers?: number
  report_text?: string
  created_at?: string
  updated_at?: string
}
