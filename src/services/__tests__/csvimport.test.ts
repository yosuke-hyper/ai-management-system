/**
 * CSV Import Service Tests
 * POSレジからのCSVインポート機能の包括的なテスト
 */

import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  createColumnMapping,
  convertValue,
  dailyReportColumns,
  monthlyExpenseColumns,
  detectPOSFormat,
  posFormatMappings
} from '../csvimport'

describe('CSV Import Service', () => {
  describe('parseCSV', () => {
    it('基本的なCSVをパースできる', () => {
      const csv = 'header1,header2,header3\nvalue1,value2,value3\nvalue4,value5,value6'
      const result = parseCSV(csv)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(['header1', 'header2', 'header3'])
      expect(result[1]).toEqual(['value1', 'value2', 'value3'])
      expect(result[2]).toEqual(['value4', 'value5', 'value6'])
    })

    it('引用符付きのフィールドをパースできる', () => {
      const csv = '"Field 1","Field 2","Field 3"\n"Value 1","Value 2","Value 3"'
      const result = parseCSV(csv)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(['Field 1', 'Field 2', 'Field 3'])
      expect(result[1]).toEqual(['Value 1', 'Value 2', 'Value 3'])
    })

    it('引用符内のカンマを正しく処理できる', () => {
      const csv = '"Name","Price","Note"\n"Item A","1,000","Note, with comma"'
      const result = parseCSV(csv)

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual(['Item A', '1,000', 'Note, with comma'])
    })

    it('引用符内の引用符（エスケープ）を処理できる', () => {
      const csv = '"Name","Note"\n"Item A","He said ""Hello"""'
      const result = parseCSV(csv)

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual(['Item A', 'He said "Hello"'])
    })

    it('改行コードCRLFを処理できる', () => {
      const csv = 'header1,header2\r\nvalue1,value2\r\nvalue3,value4'
      const result = parseCSV(csv)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(['header1', 'header2'])
    })

    it('改行コードLFを処理できる', () => {
      const csv = 'header1,header2\nvalue1,value2\nvalue3,value4'
      const result = parseCSV(csv)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(['header1', 'header2'])
    })

    it('空行をスキップする', () => {
      const csv = 'header1,header2\n\nvalue1,value2\n\nvalue3,value4\n\n'
      const result = parseCSV(csv)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(['header1', 'header2'])
      expect(result[1]).toEqual(['value1', 'value2'])
      expect(result[2]).toEqual(['value3', 'value4'])
    })

    it('日本語を含むCSVをパースできる', () => {
      const csv = '日付,売上,客数\n2025-11-25,150000,85\n2025-11-26,180000,92'
      const result = parseCSV(csv)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(['日付', '売上', '客数'])
      expect(result[1]).toEqual(['2025-11-25', '150000', '85'])
    })
  })

  describe('createColumnMapping', () => {
    it('完全一致するヘッダーをマッピングできる', () => {
      const headers = ['report_date', 'sales', 'customers']
      const mapping = createColumnMapping(headers, dailyReportColumns)

      expect(mapping.get('report_date')).toBe(0)
      expect(mapping.get('sales')).toBe(1)
      expect(mapping.get('customers')).toBe(2)
    })

    it('日本語ヘッダーをマッピングできる', () => {
      const headers = ['日付', '売上', '客数']
      const mapping = createColumnMapping(headers, dailyReportColumns)

      expect(mapping.get('report_date')).toBe(0)
      expect(mapping.get('sales')).toBe(1)
      expect(mapping.get('customers')).toBe(2)
    })

    it('大文字小文字を無視してマッピングできる', () => {
      const headers = ['REPORT_DATE', 'Sales', 'CUSTOMERS']
      const mapping = createColumnMapping(headers, dailyReportColumns)

      expect(mapping.get('report_date')).toBe(0)
      expect(mapping.get('sales')).toBe(1)
      expect(mapping.get('customers')).toBe(2)
    })

    it('スペースやアンダースコアを無視してマッピングできる', () => {
      const headers = ['report date', 'sales_amount', 'customers']
      const mapping = createColumnMapping(headers, dailyReportColumns)

      expect(mapping.get('report_date')).toBe(0)
      expect(mapping.get('sales')).toBe(1)
      expect(mapping.get('customers')).toBe(2)
    })
  })

  describe('convertValue', () => {
    it('数値を正しく変換できる', () => {
      expect(convertValue('1000', 'number')).toBe(1000)
      expect(convertValue('1,000', 'number')).toBe(1000)
      expect(convertValue('¥1,000', 'number')).toBe(1000)
      expect(convertValue('1000.50', 'number')).toBe(1000.50)
    })

    it('日付を正しく変換できる', () => {
      expect(convertValue('2025-11-25', 'date')).toBe('2025-11-25')
      expect(convertValue('2025/11/25', 'date')).toBe('2025-11-25')
    })

    it('真偽値を正しく変換できる', () => {
      expect(convertValue('true', 'boolean')).toBe(true)
      expect(convertValue('false', 'boolean')).toBe(false)
      expect(convertValue('1', 'boolean')).toBe(true)
      expect(convertValue('0', 'boolean')).toBe(false)
      expect(convertValue('はい', 'boolean')).toBe(true)
    })

    it('文字列をそのまま返す', () => {
      expect(convertValue('test', 'string')).toBe('test')
      expect(convertValue('テスト', 'string')).toBe('テスト')
    })

    it('空文字列はnullを返す', () => {
      expect(convertValue('', 'number')).toBeNull()
      expect(convertValue('', 'date')).toBeNull()
      expect(convertValue('', 'string')).toBeNull()
    })

    it('不正な数値はnullを返す', () => {
      expect(convertValue('abc', 'number')).toBeNull()
      expect(convertValue('不正', 'number')).toBeNull()
    })
  })

  describe('detectPOSFormat', () => {
    it('Airレジフォーマットを検出できる', () => {
      const headers = ['売上日', '売上金額', '客数', 'airレジ']
      expect(detectPOSFormat(headers)).toBe('airpay')
    })

    it('スマレジフォーマットを検出できる', () => {
      const headers = ['日付', '売上', '来店客数', 'スマレジ']
      expect(detectPOSFormat(headers)).toBe('smaregi')
    })

    it('ユビレジフォーマットを検出できる', () => {
      const headers = ['取引日', '売上合計', '顧客数', 'ユビレジ']
      expect(detectPOSFormat(headers)).toBe('ubiregi')
    })

    it('Squareフォーマットを検出できる', () => {
      const headers = ['Date', 'Gross Sales', 'Number of Transactions', 'Square']
      expect(detectPOSFormat(headers)).toBe('square')
    })

    it('汎用フォーマットを検出できる', () => {
      const headers = ['日付', '売上', '客数']
      expect(detectPOSFormat(headers)).toBe('generic')
    })
  })

  describe('POSフォーマットマッピング', () => {
    it('Airレジのマッピングが定義されている', () => {
      expect(posFormatMappings.airpay).toBeDefined()
      expect(posFormatMappings.airpay['売上日']).toBe('report_date')
      expect(posFormatMappings.airpay['売上金額']).toBe('sales')
    })

    it('スマレジのマッピングが定義されている', () => {
      expect(posFormatMappings.smaregi).toBeDefined()
      expect(posFormatMappings.smaregi['日付']).toBe('report_date')
      expect(posFormatMappings.smaregi['売上']).toBe('sales')
    })

    it('ユビレジのマッピングが定義されている', () => {
      expect(posFormatMappings.ubiregi).toBeDefined()
      expect(posFormatMappings.ubiregi['取引日']).toBe('report_date')
      expect(posFormatMappings.ubiregi['売上合計']).toBe('sales')
    })

    it('Squareのマッピングが定義されている', () => {
      expect(posFormatMappings.square).toBeDefined()
      expect(posFormatMappings.square['Date']).toBe('report_date')
      expect(posFormatMappings.square['Gross Sales']).toBe('sales')
    })
  })

  describe('実際のPOSレジCSVシミュレーション', () => {
    it('Airレジの典型的なCSVをパースできる', () => {
      const csv = `売上日,売上金額,客数,仕入
2025-11-25,"¥150,000",85,"¥45,000"
2025-11-26,"¥180,000",92,"¥52,000"`

      const result = parseCSV(csv)
      expect(result).toHaveLength(3)
      expect(result[1]).toEqual(['2025-11-25', '¥150,000', '85', '¥45,000'])
    })

    it('スマレジの典型的なCSVをパースできる', () => {
      const csv = `日付,売上,来店客数,原価
2025-11-25,150000,85,45000
2025-11-26,180000,92,52000`

      const result = parseCSV(csv)
      expect(result).toHaveLength(3)
      expect(result[1]).toEqual(['2025-11-25', '150000', '85', '45000'])
    })

    it('ユビレジの典型的なCSVをパースできる', () => {
      const csv = `取引日,売上合計,顧客数,原価合計
2025-11-25,150000,85,45000
2025-11-26,180000,92,52000`

      const result = parseCSV(csv)
      expect(result).toHaveLength(3)
      expect(result[1]).toEqual(['2025-11-25', '150000', '85', '45000'])
    })

    it('Square の典型的なCSVをパースできる', () => {
      const csv = `Date,Gross Sales,Number of Transactions,Cost
2025-11-25,150000,85,45000
2025-11-26,180000,92,52000`

      const result = parseCSV(csv)
      expect(result).toHaveLength(3)
      expect(result[1]).toEqual(['2025-11-25', '150000', '85', '45000'])
    })
  })

  describe('エッジケース', () => {
    it('空のCSVを処理できる', () => {
      const csv = ''
      const result = parseCSV(csv)
      expect(result).toHaveLength(0)
    })

    it('ヘッダーのみのCSVを処理できる', () => {
      const csv = 'header1,header2,header3'
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
    })

    it('不均一な列数を処理できる', () => {
      const csv = 'h1,h2,h3\nv1,v2\nv3,v4,v5,v6'
      const result = parseCSV(csv)
      expect(result).toHaveLength(3)
      expect(result[1]).toHaveLength(2)
      expect(result[2]).toHaveLength(4)
    })

    it('引用符のみのフィールドを処理できる', () => {
      const csv = '"","value",""'
      const result = parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(['', 'value', ''])
    })
  })

  describe('カラム定義', () => {
    it('日次レポートのカラムが正しく定義されている', () => {
      expect(dailyReportColumns).toHaveLength(13)

      const dateColumn = dailyReportColumns.find(c => c.field === 'report_date')
      expect(dateColumn).toBeDefined()
      expect(dateColumn?.required).toBe(true)
      expect(dateColumn?.type).toBe('date')

      const salesColumn = dailyReportColumns.find(c => c.field === 'sales')
      expect(salesColumn).toBeDefined()
      expect(salesColumn?.required).toBe(false)
      expect(salesColumn?.type).toBe('number')
    })

    it('月次経費のカラムが正しく定義されている', () => {
      expect(monthlyExpenseColumns).toHaveLength(9)

      const monthColumn = monthlyExpenseColumns.find(c => c.field === 'month')
      expect(monthColumn).toBeDefined()
      expect(monthColumn?.required).toBe(true)
      expect(monthColumn?.type).toBe('string')

      const laborColumn = monthlyExpenseColumns.find(c => c.field === 'labor_cost')
      expect(laborColumn).toBeDefined()
      expect(laborColumn?.required).toBe(true)
      expect(laborColumn?.type).toBe('number')
    })
  })
})
