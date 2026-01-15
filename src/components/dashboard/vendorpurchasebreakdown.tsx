import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { ShoppingCart, TrendingUp } from 'lucide-react'
import { VendorPurchaseSummary } from '@/types'

interface VendorPurchaseBreakdownProps {
  purchases: Array<{
    id: string
    vendor_id: string
    amount: number
    vendors: {
      id: string
      name: string
      category: string
    }
  }>
  title?: string
  className?: string
  showPercentage?: boolean
  groupByCategory?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  vegetable_meat: '野菜・肉類',
  seafood: '魚介類',
  alcohol: '酒類',
  rice: '米・穀物',
  seasoning: '調味料',
  frozen: '冷凍食品',
  dessert: 'デザート',
  others: 'その他'
}

const CATEGORY_COLORS: Record<string, string> = {
  vegetable_meat: 'bg-green-100 text-green-800',
  seafood: 'bg-blue-100 text-blue-800',
  alcohol: 'bg-purple-100 text-purple-800',
  rice: 'bg-amber-100 text-amber-800',
  seasoning: 'bg-orange-100 text-orange-800',
  frozen: 'bg-cyan-100 text-cyan-800',
  dessert: 'bg-pink-100 text-pink-800',
  others: 'bg-gray-100 text-gray-800'
}

export const VendorPurchaseBreakdown: React.FC<VendorPurchaseBreakdownProps> = ({
  purchases,
  title = '仕入内訳',
  className = '',
  showPercentage = true,
  groupByCategory = false
}) => {
  const summary = useMemo((): VendorPurchaseSummary[] => {
    const vendorMap = new Map<string, VendorPurchaseSummary>()
    let totalAmount = 0

    purchases.forEach(purchase => {
      const vendorId = purchase.vendor_id
      const amount = purchase.amount || 0
      totalAmount += amount

      if (vendorMap.has(vendorId)) {
        const existing = vendorMap.get(vendorId)!
        existing.totalAmount += amount
        existing.purchaseCount += 1
      } else {
        vendorMap.set(vendorId, {
          vendorId: vendorId,
          vendorName: purchase.vendors?.name || '不明',
          vendorCategory: purchase.vendors?.category as any || 'others',
          totalAmount: amount,
          purchaseCount: 1,
          percentage: 0
        })
      }
    })

    const summaryList = Array.from(vendorMap.values())
    summaryList.forEach(item => {
      item.percentage = totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0
    })

    summaryList.sort((a, b) => b.totalAmount - a.totalAmount)

    return summaryList
  }, [purchases])

  const totalAmount = useMemo(() => {
    return summary.reduce((sum, item) => sum + item.totalAmount, 0)
  }, [summary])

  const groupedByCategory = useMemo(() => {
    if (!groupByCategory) return null

    const categoryMap = new Map<string, VendorPurchaseSummary[]>()
    summary.forEach(item => {
      const category = item.vendorCategory
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(item)
    })

    return categoryMap
  }, [summary, groupByCategory])

  if (purchases.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            仕入データがありません
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderVendorRow = (item: VendorPurchaseSummary, index: number) => (
    <tr key={item.vendorId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge className={CATEGORY_COLORS[item.vendorCategory] || CATEGORY_COLORS.others}>
            {CATEGORY_LABELS[item.vendorCategory] || 'その他'}
          </Badge>
          <span className="font-medium">{item.vendorName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold">
        {formatCurrency(item.totalAmount)}
      </td>
      {showPercentage && (
        <td className="px-4 py-3 text-sm text-right text-gray-600">
          {item.percentage.toFixed(1)}%
        </td>
      )}
    </tr>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            {title}
          </span>
          <div className="flex items-center gap-2 text-base font-normal">
            <span className="text-gray-600">合計:</span>
            <span className="font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {groupByCategory && groupedByCategory ? (
            <div className="space-y-6">
              {Array.from(groupedByCategory.entries()).map(([category, items]) => {
                const categoryTotal = items.reduce((sum, item) => sum + item.totalAmount, 0)
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b-2">
                      <Badge className={`${CATEGORY_COLORS[category] || CATEGORY_COLORS.others} text-base`}>
                        {CATEGORY_LABELS[category] || 'その他'}
                      </Badge>
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(categoryTotal)}
                      </span>
                    </div>
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            業者名
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            金額
                          </th>
                          {showPercentage && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                              割合
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => (
                          <tr key={item.vendorId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-2 text-sm">
                              <span className="font-medium">{item.vendorName}</span>
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">
                              {formatCurrency(item.totalAmount)}
                            </td>
                            {showPercentage && (
                              <td className="px-4 py-2 text-sm text-right text-gray-600">
                                {item.percentage.toFixed(1)}%
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    業者名
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    金額
                  </th>
                  {showPercentage && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      割合
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.map((item, index) => renderVendorRow(item, index))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-sm">合計</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">
                    {formatCurrency(totalAmount)}
                  </td>
                  {showPercentage && (
                    <td className="px-4 py-3 text-sm text-right">100.0%</td>
                  )}
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>業者数: {summary.length}社</span>
          </div>
          <div>
            平均単価: {formatCurrency(summary.length > 0 ? totalAmount / summary.length : 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
