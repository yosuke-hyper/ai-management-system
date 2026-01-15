/**
 * CSV Import Service
 * POSレジからのCSVデータをインポートする機能
 * 様々なフォーマットに対応できる柔軟な設計
 */

import { supabase } from '@/lib/supabase'
import { saveAs } from 'file-saver'

export interface CSVColumn {
  field: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean'
  example?: string
}

export interface CSVImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{ row: number; message: string }>
  skipped: number
}

export interface DailyReportCSVRow {
  report_date: string
  store_id: string
  operation_type?: 'lunch' | 'dinner' | 'full_day'
  sales?: number
  customers?: number
  purchases?: number
  labor_cost?: number
  rent?: number
  utilities?: number
  advertising?: number
  consumables?: number
  other_expenses?: number
  notes?: string
}

export interface MonthlyExpenseCSVRow {
  month: string
  store_id: string
  labor_cost: number
  rent: number
  utilities: number
  advertising: number
  consumables: number
  other_expenses: number
  notes?: string
}

/**
 * CSVファイルをパースする
 */
export function parseCSV(csvText: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim())
        if (currentLine.some(field => field !== '')) {
          lines.push(currentLine)
        }
        currentLine = []
        currentField = ''
      }
    } else {
      currentField += char
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim())
    if (currentLine.some(field => field !== '')) {
      lines.push(currentLine)
    }
  }

  return lines
}

/**
 * CSVヘッダーからカラムマッピングを作成
 */
export function createColumnMapping(
  headers: string[],
  expectedColumns: CSVColumn[]
): Map<string, number> {
  const mapping = new Map<string, number>()

  expectedColumns.forEach(column => {
    const headerIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[_\s-]/g, '')
      const fieldNormalized = column.field.toLowerCase().replace(/[_\s-]/g, '')
      const labelNormalized = column.label.toLowerCase().replace(/[_\s-]/g, '')

      if (normalized === fieldNormalized || normalized === labelNormalized) {
        return true
      }

      if (fieldNormalized.includes(normalized) || normalized.includes(fieldNormalized)) {
        return true
      }

      return false
    })

    if (headerIndex !== -1) {
      mapping.set(column.field, headerIndex)
    }
  })

  return mapping
}

/**
 * データ型を検証・変換
 */
export function convertValue(value: string, type: string): any {
  if (!value || value === '') return null

  switch (type) {
    case 'number':
      const num = parseFloat(value.replace(/[,¥]/g, ''))
      return isNaN(num) ? null : num

    case 'date':
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]

    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1' || value === 'はい'

    default:
      return value
  }
}

/**
 * 日次レポート用CSVカラム定義
 */
export const dailyReportColumns: CSVColumn[] = [
  { field: 'report_date', label: '日付', required: true, type: 'date', example: '2025-11-25' },
  { field: 'store_id', label: '店舗ID', required: true, type: 'string', example: 'uuid' },
  { field: 'operation_type', label: '営業区分', required: false, type: 'string', example: 'lunch/dinner/full_day' },
  { field: 'sales', label: '売上', required: false, type: 'number', example: '150000' },
  { field: 'customers', label: '客数', required: false, type: 'number', example: '85' },
  { field: 'purchases', label: '仕入', required: false, type: 'number', example: '45000' },
  { field: 'labor_cost', label: '人件費', required: false, type: 'number', example: '30000' },
  { field: 'rent', label: '家賃', required: false, type: 'number', example: '20000' },
  { field: 'utilities', label: '水道光熱費', required: false, type: 'number', example: '5000' },
  { field: 'advertising', label: '広告宣伝費', required: false, type: 'number', example: '3000' },
  { field: 'consumables', label: '消耗品費', required: false, type: 'number', example: '2000' },
  { field: 'other_expenses', label: 'その他経費', required: false, type: 'number', example: '1000' },
  { field: 'notes', label: '備考', required: false, type: 'string', example: 'メモ' }
]

/**
 * 月次経費用CSVカラム定義
 */
export const monthlyExpenseColumns: CSVColumn[] = [
  { field: 'month', label: '年月', required: true, type: 'string', example: '2025-11' },
  { field: 'store_id', label: '店舗ID', required: true, type: 'string', example: 'uuid' },
  { field: 'labor_cost', label: '人件費', required: true, type: 'number', example: '900000' },
  { field: 'rent', label: '家賃', required: true, type: 'number', example: '300000' },
  { field: 'utilities', label: '水道光熱費', required: true, type: 'number', example: '150000' },
  { field: 'advertising', label: '広告宣伝費', required: true, type: 'number', example: '100000' },
  { field: 'consumables', label: '消耗品費', required: true, type: 'number', example: '50000' },
  { field: 'other_expenses', label: 'その他経費', required: true, type: 'number', example: '80000' },
  { field: 'notes', label: '備考', required: false, type: 'string', example: 'メモ' }
]

/**
 * CSVテンプレートを生成してダウンロード
 */
export function downloadCSVTemplate(type: 'daily_report' | 'monthly_expense'): void {
  const columns = type === 'daily_report' ? dailyReportColumns : monthlyExpenseColumns

  const headers = columns.map(c => c.label).join(',')
  const examples = columns.map(c => c.example || '').join(',')
  const required = columns.map(c => c.required ? '必須' : '任意').join(',')

  const csvContent = `${headers}\n${examples}\n${required}\n`
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  const filename = type === 'daily_report'
    ? 'daily_report_template.csv'
    : 'monthly_expense_template.csv'

  saveAs(blob, filename)
}

/**
 * 日次レポートCSVをインポート
 */
export async function importDailyReportCSV(
  file: File,
  organizationId: string,
  defaultStoreId?: string
): Promise<CSVImportResult> {
  try {
    const text = await file.text()
    const lines = parseCSV(text)

    if (lines.length < 2) {
      throw new Error('CSVファイルが空か、ヘッダーのみです')
    }

    const headers = lines[0]
    const mapping = createColumnMapping(headers, dailyReportColumns)

    const requiredFields = dailyReportColumns.filter(c => c.required).map(c => c.field)
    const missingRequired = requiredFields.filter(field => !mapping.has(field))

    if (missingRequired.length > 0 && !defaultStoreId) {
      throw new Error(`必須カラムが見つかりません: ${missingRequired.join(', ')}`)
    }

    const result: CSVImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      skipped: 0
    }

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]

      if (row.every(cell => !cell || cell === '')) {
        result.skipped++
        continue
      }

      try {
        const record: any = {
          organization_id: organizationId
        }

        dailyReportColumns.forEach(column => {
          const index = mapping.get(column.field)
          if (index !== undefined && index < row.length) {
            const value = convertValue(row[index], column.type)
            if (value !== null) {
              record[column.field] = value
            }
          }
        })

        if (defaultStoreId && !record.store_id) {
          record.store_id = defaultStoreId
        }

        if (!record.report_date) {
          result.errors.push({ row: i + 1, message: '日付が必須です' })
          result.failed++
          continue
        }

        if (!record.store_id) {
          result.errors.push({ row: i + 1, message: '店舗IDが必須です' })
          result.failed++
          continue
        }

        const { error } = await supabase
          .from('daily_reports')
          .insert(record)

        if (error) {
          result.errors.push({ row: i + 1, message: error.message })
          result.failed++
        } else {
          result.imported++
        }
      } catch (err: any) {
        result.errors.push({ row: i + 1, message: err.message })
        result.failed++
      }
    }

    result.success = result.imported > 0
    return result
  } catch (err: any) {
    throw new Error(`CSVインポートエラー: ${err.message}`)
  }
}

/**
 * 月次経費CSVをインポート
 */
export async function importMonthlyExpenseCSV(
  file: File,
  organizationId: string,
  defaultStoreId?: string
): Promise<CSVImportResult> {
  try {
    const text = await file.text()
    const lines = parseCSV(text)

    if (lines.length < 2) {
      throw new Error('CSVファイルが空か、ヘッダーのみです')
    }

    const headers = lines[0]
    const mapping = createColumnMapping(headers, monthlyExpenseColumns)

    const requiredFields = monthlyExpenseColumns.filter(c => c.required).map(c => c.field)
    const missingRequired = requiredFields.filter(field =>
      field !== 'store_id' && !mapping.has(field)
    )

    if (missingRequired.length > 0) {
      throw new Error(`必須カラムが見つかりません: ${missingRequired.join(', ')}`)
    }

    const result: CSVImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      skipped: 0
    }

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]

      if (row.every(cell => !cell || cell === '')) {
        result.skipped++
        continue
      }

      try {
        const record: any = {
          organization_id: organizationId
        }

        monthlyExpenseColumns.forEach(column => {
          const index = mapping.get(column.field)
          if (index !== undefined && index < row.length) {
            const value = convertValue(row[index], column.type)
            if (value !== null) {
              record[column.field] = value
            }
          }
        })

        if (defaultStoreId && !record.store_id) {
          record.store_id = defaultStoreId
        }

        if (!record.month) {
          result.errors.push({ row: i + 1, message: '年月が必須です' })
          result.failed++
          continue
        }

        if (!record.store_id) {
          result.errors.push({ row: i + 1, message: '店舗IDが必須です' })
          result.failed++
          continue
        }

        const { error } = await supabase
          .from('monthly_expenses')
          .upsert(record, {
            onConflict: 'month,store_id,organization_id'
          })

        if (error) {
          result.errors.push({ row: i + 1, message: error.message })
          result.failed++
        } else {
          result.imported++
        }
      } catch (err: any) {
        result.errors.push({ row: i + 1, message: err.message })
        result.failed++
      }
    }

    result.success = result.imported > 0
    return result
  } catch (err: any) {
    throw new Error(`CSVインポートエラー: ${err.message}`)
  }
}

/**
 * POSレジの一般的なフォーマットを自動検出して変換
 */
export function detectPOSFormat(headers: string[]): 'airpay' | 'smaregi' | 'ubiregi' | 'square' | 'generic' {
  const headerStr = headers.join(',').toLowerCase()

  if (headerStr.includes('airpay') || headerStr.includes('airレジ')) {
    return 'airpay'
  } else if (headerStr.includes('smaregi') || headerStr.includes('スマレジ')) {
    return 'smaregi'
  } else if (headerStr.includes('ubiregi') || headerStr.includes('ユビレジ')) {
    return 'ubiregi'
  } else if (headerStr.includes('square')) {
    return 'square'
  }

  return 'generic'
}

/**
 * POSフォーマット別のカラムマッピング
 */
export const posFormatMappings: Record<string, Record<string, string>> = {
  airpay: {
    '売上日': 'report_date',
    '売上金額': 'sales',
    '客数': 'customers',
    '仕入': 'purchases'
  },
  smaregi: {
    '日付': 'report_date',
    '売上': 'sales',
    '来店客数': 'customers',
    '原価': 'purchases'
  },
  ubiregi: {
    '取引日': 'report_date',
    '売上合計': 'sales',
    '顧客数': 'customers',
    '原価合計': 'purchases'
  },
  square: {
    'Date': 'report_date',
    'Gross Sales': 'sales',
    'Number of Transactions': 'customers',
    'Cost': 'purchases'
  }
}

export interface ImportHistoryRecord {
  id: string
  organization_id: string
  user_id: string
  store_id: string | null
  import_type: 'daily_report' | 'monthly_expense'
  file_name: string
  file_size: number | null
  total_rows: number
  imported_count: number
  failed_count: number
  skipped_count: number
  status: 'success' | 'partial' | 'failed'
  error_details: Array<{ row: number; message: string }>
  date_range_start: string | null
  date_range_end: string | null
  created_at: string
  store_name?: string
}

export async function saveImportHistory(
  organizationId: string,
  userId: string,
  importType: 'daily_report' | 'monthly_expense',
  fileName: string,
  fileSize: number,
  result: CSVImportResult,
  storeId?: string,
  dateRangeStart?: string,
  dateRangeEnd?: string
): Promise<void> {
  const totalRows = result.imported + result.failed + result.skipped
  let status: 'success' | 'partial' | 'failed' = 'success'

  if (result.failed > 0 && result.imported > 0) {
    status = 'partial'
  } else if (result.failed > 0 && result.imported === 0) {
    status = 'failed'
  }

  await supabase.from('import_history').insert({
    organization_id: organizationId,
    user_id: userId,
    store_id: storeId || null,
    import_type: importType,
    file_name: fileName,
    file_size: fileSize,
    total_rows: totalRows,
    imported_count: result.imported,
    failed_count: result.failed,
    skipped_count: result.skipped,
    status,
    error_details: result.errors.slice(0, 50),
    date_range_start: dateRangeStart || null,
    date_range_end: dateRangeEnd || null
  })
}

export async function getImportHistory(
  organizationId: string,
  limit: number = 20
): Promise<ImportHistoryRecord[]> {
  const { data, error } = await supabase
    .from('import_history')
    .select(`
      *,
      stores:store_id (name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch import history:', error)
    return []
  }

  return (data || []).map(record => ({
    ...record,
    store_name: record.stores?.name
  }))
}

export async function deleteReportsByDateRange(
  organizationId: string,
  storeId: string,
  startDate: string,
  endDate: string
): Promise<{ deleted: number; error?: string }> {
  const { data, error } = await supabase
    .from('daily_reports')
    .delete()
    .eq('organization_id', organizationId)
    .eq('store_id', storeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .select('id')

  if (error) {
    return { deleted: 0, error: error.message }
  }

  return { deleted: data?.length || 0 }
}
