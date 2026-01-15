import { supabase } from '@/lib/supabase'

export interface MonthlySalesExportOptions {
  month: string // YYYY-MM
  storeIds?: string[]
  format: 'csv' | 'excel'
  storeName?: string
}

export interface MonthlySalesByStoreOptions {
  month: string // YYYY-MM
  format: 'excel'
  stores: Array<{ id: string; name: string; change_fund?: number }>
}

export interface MonthlySalesExportResult {
  success: boolean
  filename?: string
  error?: string
  recordCount?: number
}

interface DailySalesData {
  date: string
  totalSalesWithTax: number
  cashSalesNoTax: number
  creditSalesNoTax: number
  cashTax8: number
  cashTax10: number
  creditTax8: number
  creditTax10: number
  changeFund: number
  cashPayment: number
  actualCash: number
  bankDeposit: number
  memo: string
}

export const monthlySalesExportService = {
  async exportMonthlySalesByStore(
    organizationId: string,
    options: MonthlySalesByStoreOptions
  ): Promise<MonthlySalesExportResult> {
    try {
      const { month, stores } = options

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('無効な月形式です。YYYY-MM形式で指定してください。')
      }

      if (!stores || stores.length === 0) {
        throw new Error('店舗が指定されていません')
      }

      // Calculate date range
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = `${month}-01`
      const lastDay = new Date(year, monthNum, 0).getDate()
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

      // Fetch all daily reports for all stores in one query
      const storeIds = stores.map(s => s.id)
      const { data: allReports, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('organization_id', organizationId)
        .in('store_id', storeIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (reportsError) {
        throw new Error(`データの取得に失敗しました: ${reportsError.message}`)
      }

      // Fetch cash vendor for cash payment calculation
      const { data: cashVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('name', '現金仕入れ')
        .eq('organization_id', organizationId)
        .maybeSingle()

      // Fetch vendor purchases if cash vendor exists
      let cashPurchaseMap = new Map<string, number>()
      if (allReports && allReports.length > 0 && cashVendor) {
        const reportIds = allReports.map(r => r.id)
        const { data: purchases } = await supabase
          .from('daily_report_vendor_purchases')
          .select('daily_report_id, vendor_id, amount')
          .in('daily_report_id', reportIds)
          .eq('vendor_id', cashVendor.id)

        if (purchases) {
          purchases.forEach(vp => {
            cashPurchaseMap.set(vp.daily_report_id, vp.amount || 0)
          })
        }
      }

      // Group reports by store
      const reportsByStore = new Map<string, any[]>()
      if (allReports) {
        allReports.forEach(report => {
          const storeId = report.store_id
          if (!reportsByStore.has(storeId)) {
            reportsByStore.set(storeId, [])
          }
          reportsByStore.get(storeId)!.push(report)
        })
      }

      // Generate Excel with multiple sheets
      await this.downloadExcelMultipleSheets(
        stores,
        reportsByStore,
        cashPurchaseMap,
        month,
        lastDay
      )

      return {
        success: true,
        filename: `月次売上一覧_全店舗個別_${year}年${String(monthNum).padStart(2, '0')}月.xlsx`,
        recordCount: stores.length
      }
    } catch (err: any) {
      console.error('Failed to export monthly sales by store:', err)
      return {
        success: false,
        error: err.message || '月次売上一覧の個別エクスポートに失敗しました'
      }
    }
  },

  async exportMonthlySalesSummary(
    organizationId: string,
    options: MonthlySalesExportOptions
  ): Promise<MonthlySalesExportResult> {
    try {
      const { month, storeIds, format, storeName } = options

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('無効な月形式です。YYYY-MM形式で指定してください。')
      }

      // Calculate date range (1st to last day of month)
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = `${month}-01`
      const lastDay = new Date(year, monthNum, 0).getDate()
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

      // Fetch store data to get change_fund
      let storeQuery = supabase
        .from('stores')
        .select('id, change_fund')
        .eq('organization_id', organizationId)

      if (storeIds && storeIds.length > 0) {
        storeQuery = storeQuery.in('id', storeIds)
      }

      const { data: stores, error: storeError } = await storeQuery

      if (storeError) {
        console.error('Store data error:', storeError)
        throw new Error(`店舗データの取得に失敗しました: ${storeError.message}`)
      }

      // Calculate total change_fund from all selected stores
      const changeFund = stores && stores.length > 0
        ? stores.reduce((sum, store) => sum + (store.change_fund || 0), 0)
        : 0

      // Fetch daily reports for the month
      let query = supabase
        .from('daily_reports')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (storeIds && storeIds.length > 0) {
        query = query.in('store_id', storeIds)
      }

      const { data: reports, error } = await query

      if (error) {
        console.error('Database error:', error)
        throw new Error(`データの取得に失敗しました: ${error.message}`)
      }

      // Fetch vendor purchases for cash payment calculation
      // Get the "現金仕入れ" vendor ID
      const { data: cashVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('name', '現金仕入れ')
        .eq('organization_id', organizationId)
        .maybeSingle()

      // Fetch all vendor purchases for the reports
      let vendorPurchasesData: any[] = []
      if (reports && reports.length > 0 && cashVendor) {
        const reportIds = reports.map(r => r.id)
        const { data: purchases } = await supabase
          .from('daily_report_vendor_purchases')
          .select('daily_report_id, vendor_id, amount')
          .in('daily_report_id', reportIds)
          .eq('vendor_id', cashVendor.id)

        vendorPurchasesData = purchases || []
      }

      // Create a map of report_id -> cash purchase amount
      const cashPurchaseMap = new Map<string, number>()
      vendorPurchasesData.forEach(vp => {
        cashPurchaseMap.set(vp.daily_report_id, vp.amount || 0)
      })

      // Generate data for all days of the month
      const dailyDataMap = new Map<string, DailySalesData>()

      // Initialize all days with empty data
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`
        dailyDataMap.set(dateStr, {
          date: dateStr,
          totalSalesWithTax: 0,
          cashSalesNoTax: 0,
          creditSalesNoTax: 0,
          cashTax8: 0,
          cashTax10: 0,
          creditTax8: 0,
          creditTax10: 0,
          changeFund: changeFund,
          cashPayment: 0,
          actualCash: changeFund,
          bankDeposit: 0,
          memo: ''
        })
      }

      // Aggregate reports by date
      if (reports && reports.length > 0) {
        const dateAggregation = new Map<string, any[]>()

        reports.forEach(report => {
          const dateKey = report.date
          if (!dateAggregation.has(dateKey)) {
            dateAggregation.set(dateKey, [])
          }
          dateAggregation.get(dateKey)!.push(report)
        })

        // Calculate totals for each date
        dateAggregation.forEach((dayReports, dateKey) => {
          const totals = this.calculateDailySalesSummary(dayReports, changeFund, cashPurchaseMap)
          dailyDataMap.set(dateKey, totals)
        })
      }

      // Convert map to array and sort by date
      const dailyDataArray = Array.from(dailyDataMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      // Calculate monthly totals
      const monthlyTotals = this.calculateMonthlyTotals(dailyDataArray)

      // Export based on format
      const extension = format === 'excel' ? 'xlsx' : 'csv'
      const storePrefix = storeName ? `${storeName}_` : ''
      const filename = `月次売上一覧_${storePrefix}${year}年${String(monthNum).padStart(2, '0')}月.${extension}`

      if (format === 'excel') {
        await this.downloadExcel(dailyDataArray, monthlyTotals, month, storeName)
      } else {
        this.downloadCSV(dailyDataArray, monthlyTotals, month, storeName)
      }

      return {
        success: true,
        filename,
        recordCount: dailyDataArray.length
      }
    } catch (err: any) {
      console.error('Failed to export monthly sales summary:', err)
      return {
        success: false,
        error: err.message || '月次売上一覧のエクスポートに失敗しました'
      }
    }
  },

  calculateDailySalesSummary(reports: any[], changeFund: number = 0, cashPurchaseMap?: Map<string, number>): DailySalesData {
    const memos: string[] = []
    let totalSales = 0
    let cashSales10 = 0
    let cashSales8 = 0
    let creditSales10 = 0
    let creditSales8 = 0
    let totalCashPayment = 0

    // Sum up sales and cash payments from all operation types (lunch, dinner) for the day
    reports.forEach(report => {
      totalSales += report.sales || 0
      cashSales10 += report.sales_cash_10 || 0
      cashSales8 += report.sales_cash_8 || 0
      creditSales10 += report.sales_credit_10 || 0
      creditSales8 += report.sales_credit_8 || 0

      // Use cash purchase amount from cashPurchaseMap if available
      // Only add the cash payment if it exists in the vendor purchases
      if (cashPurchaseMap) {
        const cashPurchase = cashPurchaseMap.get(report.id)
        if (cashPurchase !== undefined) {
          totalCashPayment += cashPurchase
        }
      }

      if (report.report_text && report.report_text.trim()) {
        memos.push(report.report_text.trim())
      }
    })

    // Calculate tax amounts
    const cashNoTax10 = Math.floor(cashSales10 / 1.10)
    const cashTax10 = cashSales10 - cashNoTax10
    const cashNoTax8 = Math.floor(cashSales8 / 1.08)
    const cashTax8 = cashSales8 - cashNoTax8

    const creditNoTax10 = Math.floor(creditSales10 / 1.10)
    const creditTax10 = creditSales10 - creditNoTax10
    const creditNoTax8 = Math.floor(creditSales8 / 1.08)
    const creditTax8 = creditSales8 - creditNoTax8

    const totalSalesWithTax = totalSales
    const cashSalesNoTax = cashNoTax10 + cashNoTax8
    const creditSalesNoTax = creditNoTax10 + creditNoTax8

    // Calculate actual cash: Cash sales + Cash tax + Change fund - Cash payment
    const actualCash = cashSalesNoTax + cashTax10 + cashTax8 + changeFund - totalCashPayment
    const bankDeposit = actualCash - changeFund

    return {
      date: reports[0].date,
      totalSalesWithTax,
      cashSalesNoTax,
      creditSalesNoTax,
      cashTax8,
      cashTax10,
      creditTax8,
      creditTax10,
      changeFund,
      cashPayment: totalCashPayment,
      actualCash,
      bankDeposit,
      memo: memos.join(' / ')
    }
  },

  calculateMonthlyTotals(dailyData: DailySalesData[]): DailySalesData {
    const totals: DailySalesData = {
      date: '月計',
      totalSalesWithTax: 0,
      cashSalesNoTax: 0,
      creditSalesNoTax: 0,
      cashTax8: 0,
      cashTax10: 0,
      creditTax8: 0,
      creditTax10: 0,
      changeFund: 0,
      cashPayment: 0,
      actualCash: 0,
      bankDeposit: 0,
      memo: ''
    }

    dailyData.forEach(day => {
      totals.totalSalesWithTax += day.totalSalesWithTax
      totals.cashSalesNoTax += day.cashSalesNoTax
      totals.creditSalesNoTax += day.creditSalesNoTax
      totals.cashTax8 += day.cashTax8
      totals.cashTax10 += day.cashTax10
      totals.creditTax8 += day.creditTax8
      totals.creditTax10 += day.creditTax10
      totals.changeFund += day.changeFund
      totals.cashPayment += day.cashPayment
      totals.actualCash += day.actualCash
      totals.bankDeposit += day.bankDeposit
    })

    return totals
  },

  async downloadExcel(
    dailyData: DailySalesData[],
    monthlyTotals: DailySalesData,
    month: string,
    storeName?: string
  ) {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ])

    const [year, monthNum] = month.split('-')
    const displayMonth = `${year}年${monthNum}月`
    const displayStore = storeName || '全店舗'

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('月次売上一覧')

    // Define border style
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Add title rows (merged cells)
    worksheet.mergeCells('A1:M1')
    const titleRow1 = worksheet.getCell('A1')
    titleRow1.value = '月次売上明細'
    titleRow1.font = { bold: true, size: 14 }
    titleRow1.alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells('A2:M2')
    const titleRow2 = worksheet.getCell('A2')
    titleRow2.value = `店舗: ${displayStore}`
    titleRow2.font = { bold: true }
    titleRow2.alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells('A3:M3')
    const titleRow3 = worksheet.getCell('A3')
    titleRow3.value = `対象月: ${displayMonth}`
    titleRow3.font = { bold: true }
    titleRow3.alignment = { horizontal: 'center', vertical: 'middle' }

    // Empty row 4

    // Add header row (row 5)
    const headerRow = worksheet.getRow(5)
    headerRow.values = [
      '日付',
      '総売上(税込)',
      '現金売上(税抜)',
      'クレジット売上(税抜)',
      '現金税8%',
      '現金税10%',
      'クレジット税8%',
      'クレジット税10%',
      '釣銭準備金',
      '現金出金',
      '実現金(釣り銭+現金売上)',
      '銀行入金額(実現金-釣り銭)',
      '備考'
    ]
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.eachCell((cell) => {
      cell.border = thinBorder
    })
    headerRow.height = 20

    // Add data rows
    dailyData.forEach((day, index) => {
      const row = worksheet.getRow(6 + index)

      // If there is no sales data for this day, show as empty instead of 0
      const hasSalesData = day.totalSalesWithTax > 0

      row.values = [
        day.date,
        hasSalesData ? day.totalSalesWithTax : 0,
        hasSalesData ? day.cashSalesNoTax : 0,
        hasSalesData ? day.creditSalesNoTax : 0,
        hasSalesData ? day.cashTax8 : 0,
        hasSalesData ? day.cashTax10 : 0,
        hasSalesData ? day.creditTax8 : 0,
        hasSalesData ? day.creditTax10 : 0,
        day.changeFund,
        hasSalesData ? day.cashPayment : 0,
        hasSalesData ? day.actualCash : day.changeFund,
        hasSalesData ? day.bankDeposit : 0,
        day.memo || ''
      ]

      // Apply borders to all cells
      row.eachCell((cell) => {
        cell.border = thinBorder
      })

      // Format number columns with thousand separators
      for (let col = 2; col <= 12; col++) {
        const cell = row.getCell(col)
        cell.numFmt = '#,##0'
        cell.alignment = { horizontal: 'right' }
      }

      // Date column alignment
      row.getCell(1).alignment = { horizontal: 'center' }

      // Memo column alignment
      row.getCell(13).alignment = { horizontal: 'left' }
    })

    // Add monthly totals row
    const totalsRowIndex = 6 + dailyData.length
    const totalsRow = worksheet.getRow(totalsRowIndex)
    totalsRow.values = [
      monthlyTotals.date,
      monthlyTotals.totalSalesWithTax,
      monthlyTotals.cashSalesNoTax,
      monthlyTotals.creditSalesNoTax,
      monthlyTotals.cashTax8,
      monthlyTotals.cashTax10,
      monthlyTotals.creditTax8,
      monthlyTotals.creditTax10,
      monthlyTotals.changeFund,
      monthlyTotals.cashPayment,
      monthlyTotals.actualCash,
      monthlyTotals.bankDeposit,
      ''
    ]
    totalsRow.font = { bold: true }
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    }
    totalsRow.eachCell((cell) => {
      cell.border = thinBorder
    })

    // Format number columns with thousand separators
    for (let col = 2; col <= 12; col++) {
      const cell = totalsRow.getCell(col)
      cell.numFmt = '#,##0'
      cell.alignment = { horizontal: 'right' }
    }

    // Date column alignment
    totalsRow.getCell(1).alignment = { horizontal: 'center' }
    totalsRow.height = 20

    // Set column widths (optimized for A4 printing)
    worksheet.columns = [
      { width: 11 },   // 日付
      { width: 12 },   // 総売上(税込)
      { width: 12 },   // 現金売上(税抜)
      { width: 14 },   // クレジット売上(税抜)
      { width: 10 },   // 現金税8%
      { width: 10 },   // 現金税10%
      { width: 12 },   // クレジット税8%
      { width: 12 },   // クレジット税10%
      { width: 11 },   // 釣銭準備金
      { width: 11 },   // 現金出金
      { width: 19 },   // 実現金
      { width: 21 },   // 銀行入金額
      { width: 23 }    // 備考
    ]

    // Set up page layout for A4 printing
    worksheet.pageSetup = {
      paperSize: 9,              // A4 paper
      orientation: 'landscape',  // Landscape orientation to fit all columns
      fitToPage: true,           // Enable fit to page
      fitToWidth: 1,             // Fit all columns to 1 page width
      fitToHeight: 0,            // Allow multiple pages vertically if needed
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      },
      printTitlesRow: '5:5',     // Repeat header row on each page
      horizontalCentered: true   // Center horizontally on page
    }

    // Set print area (from A1 to last row and column M)
    worksheet.pageSetup.printArea = `A1:M${totalsRowIndex}`

    // Generate filename
    const storePrefix = storeName ? `${storeName}_` : ''
    const filename = `月次売上一覧_${storePrefix}${year}年${monthNum}月.xlsx`

    // Write file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, filename)
  },

  async downloadExcelMultipleSheets(
    stores: Array<{ id: string; name: string; change_fund?: number }>,
    reportsByStore: Map<string, any[]>,
    cashPurchaseMap: Map<string, number>,
    month: string,
    lastDay: number
  ) {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver')
    ])

    const [year, monthNum] = month.split('-')
    const displayMonth = `${year}年${monthNum}月`

    const workbook = new ExcelJS.Workbook()

    // Define border style (reused for all sheets)
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Create a worksheet for each store
    for (const store of stores) {
      const storeReports = reportsByStore.get(store.id) || []
      const changeFund = store.change_fund || 0

      // Generate data for all days of the month
      const dailyDataMap = new Map<string, DailySalesData>()

      // Initialize all days with empty data
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`
        dailyDataMap.set(dateStr, {
          date: dateStr,
          totalSalesWithTax: 0,
          cashSalesNoTax: 0,
          creditSalesNoTax: 0,
          cashTax8: 0,
          cashTax10: 0,
          creditTax8: 0,
          creditTax10: 0,
          changeFund: changeFund,
          cashPayment: 0,
          actualCash: changeFund,
          bankDeposit: 0,
          memo: ''
        })
      }

      // Aggregate reports by date for this store
      if (storeReports.length > 0) {
        const dateAggregation = new Map<string, any[]>()

        storeReports.forEach(report => {
          const dateKey = report.date
          if (!dateAggregation.has(dateKey)) {
            dateAggregation.set(dateKey, [])
          }
          dateAggregation.get(dateKey)!.push(report)
        })

        // Calculate totals for each date
        dateAggregation.forEach((dayReports, dateKey) => {
          const totals = this.calculateDailySalesSummary(dayReports, changeFund, cashPurchaseMap)
          dailyDataMap.set(dateKey, totals)
        })
      }

      // Convert map to array and sort by date
      const dailyDataArray = Array.from(dailyDataMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      // Calculate monthly totals
      const monthlyTotals = this.calculateMonthlyTotals(dailyDataArray)

      // Create worksheet for this store
      const worksheet = workbook.addWorksheet(store.name)

      // Add title rows
      worksheet.mergeCells('A1:M1')
      const titleRow1 = worksheet.getCell('A1')
      titleRow1.value = '月次売上明細'
      titleRow1.font = { bold: true, size: 14 }
      titleRow1.alignment = { horizontal: 'center', vertical: 'middle' }

      worksheet.mergeCells('A2:M2')
      const titleRow2 = worksheet.getCell('A2')
      titleRow2.value = `店舗: ${store.name}`
      titleRow2.font = { bold: true }
      titleRow2.alignment = { horizontal: 'center', vertical: 'middle' }

      worksheet.mergeCells('A3:M3')
      const titleRow3 = worksheet.getCell('A3')
      titleRow3.value = `対象月: ${displayMonth}`
      titleRow3.font = { bold: true }
      titleRow3.alignment = { horizontal: 'center', vertical: 'middle' }

      // Add header row (row 5)
      const headerRow = worksheet.getRow(5)
      headerRow.values = [
        '日付',
        '総売上(税込)',
        '現金売上(税抜)',
        'クレジット売上(税抜)',
        '現金税8%',
        '現金税10%',
        'クレジット税8%',
        'クレジット税10%',
        '釣銭準備金',
        '現金出金',
        '実現金(釣り銭+現金売上)',
        '銀行入金額(実現金-釣り銭)',
        '備考'
      ]
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
      headerRow.eachCell((cell) => {
        cell.border = thinBorder
      })
      headerRow.height = 20

      // Add data rows
      dailyDataArray.forEach((day, index) => {
        const row = worksheet.getRow(6 + index)
        const hasSalesData = day.totalSalesWithTax > 0

        row.values = [
          day.date,
          hasSalesData ? day.totalSalesWithTax : 0,
          hasSalesData ? day.cashSalesNoTax : 0,
          hasSalesData ? day.creditSalesNoTax : 0,
          hasSalesData ? day.cashTax8 : 0,
          hasSalesData ? day.cashTax10 : 0,
          hasSalesData ? day.creditTax8 : 0,
          hasSalesData ? day.creditTax10 : 0,
          day.changeFund,
          hasSalesData ? day.cashPayment : 0,
          hasSalesData ? day.actualCash : day.changeFund,
          hasSalesData ? day.bankDeposit : 0,
          day.memo || ''
        ]

        row.eachCell((cell) => {
          cell.border = thinBorder
        })

        for (let col = 2; col <= 12; col++) {
          const cell = row.getCell(col)
          cell.numFmt = '#,##0'
          cell.alignment = { horizontal: 'right' }
        }

        row.getCell(1).alignment = { horizontal: 'center' }
        row.getCell(13).alignment = { horizontal: 'left' }
      })

      // Add monthly totals row
      const totalsRowIndex = 6 + dailyDataArray.length
      const totalsRow = worksheet.getRow(totalsRowIndex)
      totalsRow.values = [
        monthlyTotals.date,
        monthlyTotals.totalSalesWithTax,
        monthlyTotals.cashSalesNoTax,
        monthlyTotals.creditSalesNoTax,
        monthlyTotals.cashTax8,
        monthlyTotals.cashTax10,
        monthlyTotals.creditTax8,
        monthlyTotals.creditTax10,
        monthlyTotals.changeFund,
        monthlyTotals.cashPayment,
        monthlyTotals.actualCash,
        monthlyTotals.bankDeposit,
        ''
      ]
      totalsRow.font = { bold: true }
      totalsRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB9C' }
      }
      totalsRow.eachCell((cell) => {
        cell.border = thinBorder
      })

      for (let col = 2; col <= 12; col++) {
        const cell = totalsRow.getCell(col)
        cell.numFmt = '#,##0'
        cell.alignment = { horizontal: 'right' }
      }

      totalsRow.getCell(1).alignment = { horizontal: 'center' }
      totalsRow.height = 20

      // Set column widths
      worksheet.columns = [
        { width: 11 },   // 日付
        { width: 12 },   // 総売上(税込)
        { width: 12 },   // 現金売上(税抜)
        { width: 14 },   // クレジット売上(税抜)
        { width: 10 },   // 現金税8%
        { width: 10 },   // 現金税10%
        { width: 12 },   // クレジット税8%
        { width: 12 },   // クレジット税10%
        { width: 11 },   // 釣銭準備金
        { width: 11 },   // 現金出金
        { width: 19 },   // 実現金
        { width: 21 },   // 銀行入金額
        { width: 23 }    // 備考
      ]

      // Set up page layout for A4 printing
      worksheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3
        },
        printTitlesRow: '5:5',
        horizontalCentered: true
      }

      worksheet.pageSetup.printArea = `A1:M${totalsRowIndex}`
    }

    // Generate filename
    const filename = `月次売上一覧_全店舗個別_${year}年${String(monthNum).padStart(2, '0')}月.xlsx`

    // Write file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, filename)
  },

  async downloadCSV(
    dailyData: DailySalesData[],
    monthlyTotals: DailySalesData,
    month: string,
    storeName?: string
  ) {
    const { saveAs } = await import('file-saver')

    const [year, monthNum] = month.split('-')
    const displayMonth = `${year}年${monthNum}月`
    const displayStore = storeName || '全店舗'

    // Create title rows
    const titleRows = [
      '"月次売上明細"',
      `"店舗: ${displayStore}"`,
      `"対象月: ${displayMonth}"`,
      ''  // Empty row
    ]

    const headers = [
      '日付',
      '総売上(税込)',
      '現金売上(税抜)',
      'クレジット売上(税抜)',
      '現金税8%',
      '現金税10%',
      'クレジット税8%',
      'クレジット税10%',
      '釣銭準備金',
      '現金出金',
      '実現金(釣り銭+現金売上)',
      '銀行入金額(実現金-釣り銭)',
      '備考'
    ]

    const rows = dailyData.map(day => {
      const hasSalesData = day.totalSalesWithTax > 0

      return [
        day.date,
        hasSalesData ? day.totalSalesWithTax : 0,
        hasSalesData ? day.cashSalesNoTax : 0,
        hasSalesData ? day.creditSalesNoTax : 0,
        hasSalesData ? day.cashTax8 : 0,
        hasSalesData ? day.cashTax10 : 0,
        hasSalesData ? day.creditTax8 : 0,
        hasSalesData ? day.creditTax10 : 0,
        day.changeFund,
        hasSalesData ? day.cashPayment : 0,
        hasSalesData ? day.actualCash : day.changeFund,
        hasSalesData ? day.bankDeposit : 0,
        day.memo || ''
      ]
    })

    // Add monthly totals row
    rows.push([
      monthlyTotals.date,
      monthlyTotals.totalSalesWithTax,
      monthlyTotals.cashSalesNoTax,
      monthlyTotals.creditSalesNoTax,
      monthlyTotals.cashTax8,
      monthlyTotals.cashTax10,
      monthlyTotals.creditTax8,
      monthlyTotals.creditTax10,
      monthlyTotals.changeFund,
      monthlyTotals.cashPayment,
      monthlyTotals.actualCash,
      monthlyTotals.bankDeposit,
      ''
    ])

    // Build CSV content
    const csvRows = [
      ...titleRows,
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row =>
        row.map(cell => {
          const value = cell === null || cell === undefined ? '' : String(cell)
          return `"${value.replace(/"/g, '""')}"`
        }).join(',')
      )
    ]

    const csvContent = csvRows.join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Generate filename (use year and monthNum from earlier)
    const [fileYear, fileMonthNum] = month.split('-')
    const storePrefix = storeName ? `${storeName}_` : ''
    const filename = `月次売上一覧_${storePrefix}${fileYear}年${fileMonthNum}月.csv`

    saveAs(blob, filename)
  }
}
