import { supabase } from '@/lib/supabase'
import { saveAs } from 'file-saver'

export interface ExportOptions {
  startDate?: string
  endDate?: string
  storeIds?: string[]
  format: 'csv' | 'json'
}

export interface ExportResult {
  success: boolean
  filename?: string
  error?: string
  recordCount?: number
}

export const dataExportService = {
  // Helper function to fetch data in batches to handle large datasets
  async fetchDataInBatches(
    tableName: string,
    organizationId: string,
    options: {
      startDateField?: string
      endDateField?: string
      startDate?: string
      endDate?: string
      storeIds?: string[]
      orderField?: string
      ascending?: boolean
    }
  ): Promise<any[]> {
    const BATCH_SIZE = 1000
    let offset = 0
    let allData: any[] = []

    while (true) {
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .range(offset, offset + BATCH_SIZE - 1)

      if (options.startDateField && options.startDate) {
        query = query.gte(options.startDateField, options.startDate)
      }
      if (options.endDateField && options.endDate) {
        query = query.lte(options.endDateField, options.endDate)
      }
      if (options.storeIds && options.storeIds.length > 0) {
        query = query.in('store_id', options.storeIds)
      }
      if (options.orderField) {
        query = query.order(options.orderField, { ascending: options.ascending ?? false })
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`${tableName}のデータ取得に失敗しました: ${error.message}`)
      }

      if (!data || data.length === 0) break

      allData = [...allData, ...data]

      // If we got less than BATCH_SIZE, we've reached the end
      if (data.length < BATCH_SIZE) break

      offset += BATCH_SIZE
    }

    return allData
  },

  async exportDailyReports(organizationId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchDataInBatches('daily_reports', organizationId, {
        startDateField: 'date',
        endDateField: 'date',
        startDate: options.startDate,
        endDate: options.endDate,
        storeIds: options.storeIds,
        orderField: 'date',
        ascending: false
      })

      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません。期間や店舗フィルターを確認してください。')
      }

      const filename = 'daily_reports'
      if (options.format === 'csv') {
        this.downloadCSV(data, filename)
      } else {
        this.downloadJSON(data, filename)
      }

      return {
        success: true,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.${options.format}`,
        recordCount: data.length
      }
    } catch (err: any) {
      console.error('Failed to export daily reports:', err)
      return {
        success: false,
        error: err.message || 'エクスポートに失敗しました'
      }
    }
  },

  async exportMonthlyExpenses(organizationId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchDataInBatches('monthly_expenses', organizationId, {
        startDateField: 'month',
        endDateField: 'month',
        startDate: options.startDate,
        endDate: options.endDate,
        storeIds: options.storeIds,
        orderField: 'month',
        ascending: false
      })

      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません。期間や店舗フィルターを確認してください。')
      }

      const filename = 'monthly_expenses'
      if (options.format === 'csv') {
        this.downloadCSV(data, filename)
      } else {
        this.downloadJSON(data, filename)
      }

      return {
        success: true,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.${options.format}`,
        recordCount: data.length
      }
    } catch (err: any) {
      console.error('Failed to export monthly expenses:', err)
      return {
        success: false,
        error: err.message || 'エクスポートに失敗しました'
      }
    }
  },

  async exportTargets(organizationId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchDataInBatches('targets', organizationId, {
        storeIds: options.storeIds,
        orderField: 'period',
        ascending: false
      })

      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません。店舗フィルターを確認してください。')
      }

      const filename = 'targets'
      if (options.format === 'csv') {
        this.downloadCSV(data, filename)
      } else {
        this.downloadJSON(data, filename)
      }

      return {
        success: true,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.${options.format}`,
        recordCount: data.length
      }
    } catch (err: any) {
      console.error('Failed to export targets:', err)
      return {
        success: false,
        error: err.message || 'エクスポートに失敗しました'
      }
    }
  },

  async exportStores(organizationId: string): Promise<ExportResult> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) {
        throw new Error(`データの取得に失敗しました: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません。')
      }

      const filename = 'stores'
      this.downloadCSV(data, filename)

      return {
        success: true,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.csv`,
        recordCount: data.length
      }
    } catch (err: any) {
      console.error('Failed to export stores:', err)
      return {
        success: false,
        error: err.message || 'エクスポートに失敗しました'
      }
    }
  },

  async exportAllData(organizationId: string): Promise<ExportResult> {
    try {
      // Use Promise.allSettled to get detailed error information for each table
      const results = await Promise.allSettled([
        this.fetchDataInBatches('daily_reports', organizationId, { orderField: 'date' })
          .then(data => ({ table: 'daily_reports', data })),
        this.fetchDataInBatches('monthly_expenses', organizationId, { orderField: 'month' })
          .then(data => ({ table: 'monthly_expenses', data })),
        this.fetchDataInBatches('targets', organizationId, { orderField: 'period' })
          .then(data => ({ table: 'targets', data })),
        supabase
          .from('stores')
          .select('*')
          .eq('organization_id', organizationId)
          .then(r => {
            if (r.error) throw new Error(`stores: ${r.error.message}`)
            return { table: 'stores', data: r.data || [] }
          }),
        supabase
          .from('vendors')
          .select('*')
          .eq('organization_id', organizationId)
          .then(r => {
            if (r.error) throw new Error(`vendors: ${r.error.message}`)
            return { table: 'vendors', data: r.data || [] }
          })
      ])

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      if (failures.length > 0) {
        const errorMessages = failures.map(f => f.reason?.message || 'Unknown error').join(', ')
        throw new Error(`一部のデータ取得に失敗しました: ${errorMessages}`)
      }

      // Extract successful data
      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value)

      const allData = {
        exportDate: new Date().toISOString(),
        organizationId,
        data: {
          dailyReports: successfulResults.find(r => r.table === 'daily_reports')?.data || [],
          monthlyExpenses: successfulResults.find(r => r.table === 'monthly_expenses')?.data || [],
          targets: successfulResults.find(r => r.table === 'targets')?.data || [],
          stores: successfulResults.find(r => r.table === 'stores')?.data || [],
          vendors: successfulResults.find(r => r.table === 'vendors')?.data || []
        }
      }

      // Calculate total record count
      const totalRecords = Object.values(allData.data).reduce((sum, arr) => sum + arr.length, 0)

      const filename = 'full_backup'
      this.downloadJSON(allData, filename)

      return {
        success: true,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.json`,
        recordCount: totalRecords
      }
    } catch (err: any) {
      console.error('Failed to export all data:', err)
      return {
        success: false,
        error: err.message || '完全バックアップのエクスポートに失敗しました'
      }
    }
  },

  downloadCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
      throw new Error('エクスポートするデータがありません')
    }

    // Get all keys from the first record
    const allKeys = Object.keys(data[0])

    // Filter out object types (including null and arrays) but keep simple values
    const headers = allKeys.filter(key => {
      const value = data[0][key]
      // Keep primitive types and exclude objects and arrays
      return typeof value !== 'object' || value === null
    })

    // Create CSV rows with proper escaping
    const csvRows = [
      headers.map(h => `"${h}"`).join(','),
      ...data.map(row =>
        headers.map(header => {
          let value = row[header]
          if (value === null || value === undefined) return '""'
          if (typeof value === 'object') {
            // Handle objects by converting to JSON string
            value = JSON.stringify(value)
          }
          // Escape double quotes and wrap in quotes
          const stringValue = String(value).replace(/"/g, '""')
          return `"${stringValue}"`
        }).join(',')
      )
    ]

    const csvContent = csvRows.join('\n')
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const timestamp = new Date().toISOString().slice(0, 10)
    saveAs(blob, `${filename}_${timestamp}.csv`)
  },

  downloadJSON(data: any, filename: string) {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const timestamp = new Date().toISOString().slice(0, 10)
    saveAs(blob, `${filename}_${timestamp}.json`)
  }
}
