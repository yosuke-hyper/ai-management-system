import React, { useMemo, useEffect, useState, useRef } from 'react'
import { X, TrendingUp, TrendingDown, Target, Calendar, FileText, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/lib/format'
import { DailyReportData } from '@/types'
import { useTargets } from '@/hooks/usetargets'
import { getMonthlyExpenses } from '@/services/supabase'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ProfitLossModalProps {
  month: string // 'YYYY-MM'
  reports: DailyReportData[]
  onClose: () => void
  storeId?: string
}

export const ProfitLossModal: React.FC<ProfitLossModalProps> = ({
  month,
  reports,
  onClose,
  storeId = 'all'
}) => {
  // monthパラメータのバリデーション
  const isValidMonth = useMemo(() => {
    const monthRegex = /^\d{4}-\d{2}$/
    return monthRegex.test(month)
  }, [month])

  if (!isValidMonth) {
    console.error('PLModal: 無効な月形式:', month)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p>無効な月形式です: {month}</p>
            <p className="text-xs text-muted-foreground mt-2">
              正しい形式: YYYY-MM (例: 2025-01)
            </p>
            <Button onClick={onClose} className="mt-4">
              閉じる
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { getAllStoresTarget, getTargetForStore } = useTargets(storeId, month)

  // 月次経費データを取得
  const [monthlyExpense, setMonthlyExpense] = useState<any>(null)

  useEffect(() => {
    const loadMonthlyExpense = async () => {
      const { data } = await getMonthlyExpenses({
        storeId: storeId !== 'all' ? storeId : undefined,
        month
      })

      if (data && data.length > 0) {
        console.log('📊 ProfitLossModal: 月次経費データ取得成功', data[0])
        setMonthlyExpense(data[0])
      } else {
        console.log('⚠️ ProfitLossModal: 月次経費データなし')
        setMonthlyExpense(null)
      }
    }

    loadMonthlyExpense()
  }, [storeId, month])

  // その月のデータを取得
  const monthReports = useMemo(() => {
    console.log('PLModal: データ取得開始', { month, storeId, inputReportsCount: reports.length })

    const filteredReports = reports.filter(r =>
      r.date.slice(0, 7) === month && (storeId === 'all' || r.storeId === storeId)
    )

    console.log('PLModal: フィルタ後レポート数', filteredReports.length)
    return filteredReports
  }, [reports, month, storeId])
  
  const totals = useMemo(() => {
    console.log('PLModal: 計算開始', { monthReportsCount: monthReports.length, hasMonthlyExpense: !!monthlyExpense })

    if (monthReports.length === 0) {
      console.log('PLModal: データなし - デフォルト値使用')
      return {
        salesCash10: 0, salesCash8: 0, salesCredit10: 0, salesCredit8: 0,
        sales: 0, purchase: 0, laborCost: 0, utilities: 0, rent: 0, consumables: 0,
        promotion: 0, cleaning: 0, misc: 0, communication: 0, others: 0,
        reportCount: 0
      }
    }

    const result = monthReports.reduce((acc, r) => {
      // 安全な数値取得（存在しないフィールドは0）
      const anyR = r as any
      const salesCash10 = Number(anyR.salesCash10 ?? 0)
      const salesCash8 = Number(anyR.salesCash8 ?? 0)
      const salesCredit10 = Number(anyR.salesCredit10 ?? 0)
      const salesCredit8 = Number(anyR.salesCredit8 ?? 0)
      const sales = Number(r.sales) || 0
      const purchase = Number(r.purchase) || 0
      const laborCost = Number(r.laborCost) || 0
      const utilities = Number(r.utilities) || 0
      const rent = Number(anyR.rent) || 0
      const consumables = Number(anyR.consumables) || 0
      const promotion = Number(r.promotion) || 0
      const cleaning = Number(r.cleaning) || 0
      const misc = Number(r.misc) || 0
      const communication = Number(r.communication) || 0
      const others = Number(r.others) || 0

      acc.salesCash10 += salesCash10
      acc.salesCash8 += salesCash8
      acc.salesCredit10 += salesCredit10
      acc.salesCredit8 += salesCredit8
      acc.sales += sales
      acc.purchase += purchase
      acc.laborCost += laborCost
      acc.utilities += utilities
      acc.rent += rent
      acc.consumables += consumables
      acc.promotion += promotion
      acc.cleaning += cleaning
      acc.misc += misc
      acc.communication += communication
      acc.others += others
      acc.reportCount += 1
      return acc
    }, {
      salesCash10: 0, salesCash8: 0, salesCredit10: 0, salesCredit8: 0,
      sales: 0, purchase: 0, laborCost: 0, utilities: 0, rent: 0, consumables: 0,
      promotion: 0, cleaning: 0, misc: 0, communication: 0, others: 0,
      reportCount: 0
    })

    // 月次経費データが存在する場合は、それで経費を上書き
    if (monthlyExpense) {
      console.log('✅ PLModal: 月次経費データで上書き', {
        before: { laborCost: result.laborCost, utilities: result.utilities },
        after: {
          laborCost: monthlyExpense.labor_cost_employee + monthlyExpense.labor_cost_part_time,
          utilities: monthlyExpense.utilities
        }
      })
      result.laborCost = monthlyExpense.labor_cost_employee + monthlyExpense.labor_cost_part_time
      result.utilities = monthlyExpense.utilities || 0
      result.rent = monthlyExpense.rent || 0
      result.consumables = monthlyExpense.consumables || 0
      result.promotion = monthlyExpense.promotion || 0
      result.cleaning = monthlyExpense.cleaning || 0
      result.misc = monthlyExpense.misc || 0
      result.communication = monthlyExpense.communication || 0
      result.others = monthlyExpense.others || 0
    }

    console.log('PLModal: 計算結果', {
      sales: result.sales,
      purchase: result.purchase,
      laborCost: result.laborCost,
      utilities: result.utilities,
      reportCount: result.reportCount
    })

    return result
  }, [monthReports, monthlyExpense])

  // 売上内訳の補正：内訳の合計が売上高と一致するように調整
  const adjustedSales = useMemo(() => {
    const breakdown = totals.salesCash10 + totals.salesCash8 + totals.salesCredit10 + totals.salesCredit8
    
    // 内訳の合計が売上高と大きく異なる場合（差が10%以上）、売上高から比率で分割
    if (Math.abs(breakdown - totals.sales) > totals.sales * 0.1 || breakdown === 0) {
      // 標準的な飲食店の比率で分割
      const cashRatio = 0.65      // 現金65%
      const tax10Ratio = 0.75     // 10%税率75%
      
      return {
        salesCash10: Math.round(totals.sales * cashRatio * tax10Ratio),
        salesCash8: Math.round(totals.sales * cashRatio * (1 - tax10Ratio)),
        salesCredit10: Math.round(totals.sales * (1 - cashRatio) * tax10Ratio),
        salesCredit8: Math.round(totals.sales * (1 - cashRatio) * (1 - tax10Ratio))
      }
    }
    
    // 内訳が存在する場合はそのまま使用
    return {
      salesCash10: totals.salesCash10,
      salesCash8: totals.salesCash8,
      salesCredit10: totals.salesCredit10,
      salesCredit8: totals.salesCredit8
    }
  }, [totals])
  // 前月データ（比較用）
  const prevTotals = useMemo(() => {
    if (!isValidMonth) return { sales: 0, purchase: 0, expenses: 0, profit: 0 }
    
    const prevMonth = new Date(month + '-01')
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`
    console.log('PLModal: 前月計算', { month, prevMonthStr })
    
    const prevReports = reports.filter(r =>
      r.date.slice(0,7) === prevMonthStr && (storeId === 'all' || r.storeId === storeId)
    )
    console.log('PLModal: 前月レポート数:', prevReports.length)
    
    return prevReports.reduce((acc, r) => {
      const sales = Number(r.sales) || 0
      const purchase = Number(r.purchase) || 0
      const expenses = purchase + (Number(r.laborCost) || 0) + (Number(r.utilities) || 0) + 
                      (Number(r.promotion) || 0) + (Number(r.cleaning) || 0) + (Number(r.misc) || 0) + 
                      (Number(r.communication) || 0) + (Number(r.others) || 0)
      acc.sales += sales
      acc.purchase += purchase
      acc.expenses += expenses
      acc.profit += (sales - expenses)
      return acc
    }, { sales: 0, purchase: 0, expenses: 0, profit: 0 })
  }, [month, reports, storeId])

  const totalExpenses = totals.purchase + totals.laborCost + totals.utilities +
                        totals.rent + totals.consumables +
                        totals.promotion + totals.cleaning + totals.misc +
                        totals.communication + totals.others
  const grossProfit = totals.sales - totals.purchase
  const operatingProfit = totals.sales - totalExpenses
  const profitMargin = totals.sales > 0 ? (operatingProfit / totals.sales) * 100 : 0

  // 前月比計算
  const salesGrowth = prevTotals.sales > 0 ? ((totals.sales - prevTotals.sales) / prevTotals.sales) * 100 : 0
  const profitGrowth = prevTotals.profit > 0 ? ((operatingProfit - prevTotals.profit) / prevTotals.profit) * 100 : 0

  // 目標データ
  const target = storeId === 'all' ? getAllStoresTarget() : getTargetForStore(storeId)
  const targetAchievement = target ? (totals.sales / target.targetSales) * 100 : null

  const monthLabel = new Date(month + '-01').toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  })

  // デバッグ用：計算結果をコンソールに出力
  console.log('PLModal: 最終計算結果', {
    month,
    monthLabel,
    totals,
    totalExpenses,
    grossProfit,
    operatingProfit,
    profitMargin,
    salesGrowth,
    profitGrowth
  })

  const handleCSVExport = () => {
    const csv = [
      ['項目', '金額'],
      ['売上高', totals.sales],
      ['　現金・10%飲食', adjustedSales.salesCash10],
      ['　現金・8%軽減', adjustedSales.salesCash8],
      ['　クレジット・10%飲食', adjustedSales.salesCredit10],
      ['　クレジット・8%軽減', adjustedSales.salesCredit8],
      ['売上原価（仕入）', totals.purchase],
      ['売上総利益（粗利）', grossProfit],
      ['粗利率(%)', totals.sales > 0 ? ((grossProfit / totals.sales) * 100).toFixed(1) : 0],
      ['', ''],
      ['販売費および一般管理費', ''],
      ['　人件費', totals.laborCost],
      ['　光熱費', totals.utilities],
      ['　賃借費', totals.rent],
      ['　消耗品費', totals.consumables],
      ['　販促費', totals.promotion],
      ['　清掃費', totals.cleaning],
      ['　雑費', totals.misc],
      ['　通信費', totals.communication],
      ['　その他', totals.others],
      ['販管費合計', totalExpenses - totals.purchase],
      ['', ''],
      ['営業利益', operatingProfit],
      ['営業利益率(%)', profitMargin.toFixed(1)],
      ['', ''],
      ['比率分析', ''],
      ['原価率(%)', totals.sales > 0 ? ((totals.purchase / totals.sales) * 100).toFixed(1) : 0],
      ['人件費率(%)', totals.sales > 0 ? ((totals.laborCost / totals.sales) * 100).toFixed(1) : 0],
      ['FLコスト率(%)', totals.sales > 0 ? (((totals.purchase + totals.laborCost) / totals.sales) * 100).toFixed(1) : 0]
    ].map(row => row.join(',')).join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `損益計算書_${monthLabel.replace(/\s/g, '')}_${storeId === 'all' ? '全店舗' : storeId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const contentRef = useRef<HTMLDivElement>(null)

  const handlePDFExport = async () => {
    if (!contentRef.current) return

    try {
      const element = contentRef.current
      const buttons = element.querySelectorAll('button')

      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none'
      })

      element.classList.add('pdf-compact-mode')
      const styleElement = document.createElement('style')
      styleElement.id = 'pdf-compact-styles'
      styleElement.textContent = `
        .pdf-compact-mode {
          max-height: none !important;
          overflow: visible !important;
          font-size: 11px !important;
        }
        .pdf-compact-mode .px-6 { padding-left: 1rem !important; padding-right: 1rem !important; }
        .pdf-compact-mode .py-4 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        .pdf-compact-mode .py-6 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
        .pdf-compact-mode .gap-6 { gap: 1rem !important; }
        .pdf-compact-mode .gap-4 { gap: 0.75rem !important; }
        .pdf-compact-mode .gap-3 { gap: 0.5rem !important; }
        .pdf-compact-mode .text-2xl { font-size: 1.25rem !important; line-height: 1.5rem !important; }
        .pdf-compact-mode .text-xl { font-size: 1.1rem !important; line-height: 1.4rem !important; }
        .pdf-compact-mode .text-lg { font-size: 1rem !important; line-height: 1.3rem !important; }
        .pdf-compact-mode .text-base { font-size: 0.9rem !important; line-height: 1.2rem !important; }
        .pdf-compact-mode .text-sm { font-size: 0.8rem !important; line-height: 1.1rem !important; }
        .pdf-compact-mode .text-xs { font-size: 0.7rem !important; line-height: 1rem !important; }
        .pdf-compact-mode .p-6 { padding: 1rem !important; }
        .pdf-compact-mode .p-4 { padding: 0.75rem !important; }
        .pdf-compact-mode .p-3 { padding: 0.5rem !important; }
        .pdf-compact-mode .p-2 { padding: 0.375rem !important; }
        .pdf-compact-mode .space-y-4 > * + * { margin-top: 0.75rem !important; }
        .pdf-compact-mode .space-y-3 > * + * { margin-top: 0.5rem !important; }
        .pdf-compact-mode .space-y-2 > * + * { margin-top: 0.375rem !important; }
        .pdf-compact-mode h3 { font-size: 1rem !important; margin: 0.5rem 0 !important; }
        .pdf-compact-mode .grid { gap: 0.5rem !important; }
      `
      document.head.appendChild(styleElement)

      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      })

      const styleEl = document.getElementById('pdf-compact-styles')
      if (styleEl) styleEl.remove()
      element.classList.remove('pdf-compact-mode')
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = ''
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const pdfHeight = 297

      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      if (imgHeight <= pdfHeight) {
        const yOffset = 0
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, yOffset, imgWidth, imgHeight)
      } else {
        const scaleFactor = pdfHeight / imgHeight
        const scaledWidth = imgWidth * scaleFactor
        const scaledHeight = pdfHeight
        const xOffset = (pdfWidth - scaledWidth) / 2
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, 0, scaledWidth, scaledHeight)
      }

      pdf.save(`損益計算書_${monthLabel.replace(/\s/g, '')}_${storeId === 'all' ? '全店舗' : storeId}.pdf`)
    } catch (error) {
      console.error('PDF生成エラー:', error)
      const styleEl = document.getElementById('pdf-compact-styles')
      if (styleEl) styleEl.remove()
      if (contentRef.current) {
        contentRef.current.classList.remove('pdf-compact-mode')
      }
      alert('PDFの生成に失敗しました。もう一度お試しください。')
    }
  }

  const PLRow = ({ label, amount, isSubtotal = false, isTotal = false, growth, note }: {
    label: string
    amount: number
    isSubtotal?: boolean
    isTotal?: boolean
    growth?: number
    note?: string
  }) => (
    <div className={`flex justify-between items-center py-2 ${
      isTotal ? 'border-t-2 border-primary bg-blue-50 font-bold' : 
      isSubtotal ? 'border-t border-border bg-muted font-medium' : ''
    } ${isTotal || isSubtotal ? 'px-3 -mx-3 rounded' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={isTotal ? 'text-lg' : isSubtotal ? 'text-base' : 'text-sm'}>
          {label}
        </span>
        {note && <span className="text-xs text-muted-foreground">({note})</span>}
        {growth !== undefined && Math.abs(growth) > 0.1 && (
          <div className="flex items-center gap-1">
            {growth >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <span className={`font-mono ${
        isTotal ? 'text-lg font-bold' : 
        isSubtotal ? 'text-base font-medium' : 'text-sm'
      } ${
        amount < 0 ? 'text-red-600' : amount > 0 ? 'text-green-600' : 'text-muted-foreground'
      }`}>
        {formatCurrency(Math.abs(amount))}
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={contentRef} className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {monthLabel} 損益計算書
              </h2>
              <p className="text-sm text-muted-foreground">
                {storeId === 'all' ? '全店舗合計' : storeId} • {totals.reportCount}件の報告
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 目標達成状況 */}
          {target && targetAchievement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  目標達成状況
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>売上目標達成率</span>
                  <Badge variant={
                    targetAchievement >= 100 ? 'default' : 
                    targetAchievement >= 80 ? 'secondary' : 'destructive'
                  }>
                    {targetAchievement.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">実績</span>
                  <span>{formatCurrency(totals.sales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">目標</span>
                  <span>{formatCurrency(target.targetSales)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 損益計算書 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">損益計算書（P&L）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* 売上 */}
              <PLRow label="売上高" amount={totals.sales} isTotal growth={salesGrowth} />
              
              {/* 売上内訳 */}
              <div className="ml-4 space-y-1 pb-2">
                <PLRow label="現金・10%飲食" amount={adjustedSales.salesCash10} />
                <PLRow label="現金・8%軽減" amount={adjustedSales.salesCash8} />
                <PLRow label="クレジット・10%飲食" amount={adjustedSales.salesCredit10} />
                <PLRow label="クレジット・8%軽減" amount={adjustedSales.salesCredit8} />
              </div>

              {/* 売上原価 */}
              <PLRow label="売上原価（仕入）" amount={totals.purchase} />
              
              {/* 粗利益 */}
              <PLRow 
                label="売上総利益（粗利）" 
                amount={grossProfit} 
                isSubtotal 
                note={`粗利率 ${totals.sales > 0 ? ((grossProfit / totals.sales) * 100).toFixed(1) : 0}%`}
              />

              {/* 販管費 */}
              <div className="pt-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">販売費および一般管理費</div>
                <div className="ml-4 space-y-1">
                  <PLRow label="人件費" amount={totals.laborCost} />
                  <PLRow label="光熱費" amount={totals.utilities} />
                  <PLRow label="賃借費" amount={totals.rent} />
                  <PLRow label="消耗品費" amount={totals.consumables} />
                  <PLRow label="販促費" amount={totals.promotion} />
                  <PLRow label="清掃費" amount={totals.cleaning} />
                  <PLRow label="雑費" amount={totals.misc} />
                  <PLRow label="通信費" amount={totals.communication} />
                  <PLRow label="その他" amount={totals.others} />
                </div>
                <PLRow
                  label="販管費合計"
                  amount={totalExpenses - totals.purchase}
                  isSubtotal
                />
              </div>

              {/* 営業利益 */}
              <PLRow 
                label="営業利益" 
                amount={operatingProfit} 
                isTotal 
                growth={profitGrowth}
                note={`利益率 ${formatPercent(profitMargin)}`}
              />
            </CardContent>
          </Card>

          {/* 比率分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">比率分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">売上構成比</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>現金・10%税率</span>
                      <span>{formatPercent((adjustedSales.salesCash10 / totals.sales) * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>現金・8%税率</span>
                      <span>{formatPercent((adjustedSales.salesCash8 / totals.sales) * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>クレジット・10%税率</span>
                      <span>{formatPercent((adjustedSales.salesCredit10 / totals.sales) * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>クレジット・8%税率</span>
                      <span>{formatPercent((adjustedSales.salesCredit8 / totals.sales) * 100)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">費用比率</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>原価率</span>
                      <span className={
                        totals.sales > 0 && ((totals.purchase / totals.sales) * 100) <= 32 ? 'text-green-600' : 'text-red-600'
                      }>
                        {formatPercent(totals.sales > 0 ? (totals.purchase / totals.sales) * 100 : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>人件費率</span>
                      <span className={
                        totals.sales > 0 && ((totals.laborCost / totals.sales) * 100) <= 27 ? 'text-green-600' : 'text-red-600'
                      }>
                        {formatPercent(totals.sales > 0 ? (totals.laborCost / totals.sales) * 100 : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>(販管費-人件費)率</span>
                      <span className={
                        totals.sales > 0 && (((totalExpenses - totals.purchase - totals.laborCost) / totals.sales) * 100) <= 30 ? 'text-green-600' : 'text-red-600'
                      }>
                        {formatPercent(totals.sales > 0 ? ((totalExpenses - totals.purchase - totals.laborCost) / totals.sales) * 100 : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>営業利益率</span>
                      <span className={
                        profitMargin >= 15 ? 'text-green-600' : 
                        profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {formatPercent(profitMargin)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePDFExport}
            >
              <Download className="w-4 h-4" />
              PDFエクスポート
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCSVExport}
            >
              <FileText className="w-4 h-4" />
              CSVエクスポート
            </Button>
            <Button onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}