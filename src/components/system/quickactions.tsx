import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

type Priority = '高' | '中' | '低'

interface QuickActionItem {
  category: string
  description: string
  priority: Priority
  timeframe: string
  actions: string[]
  expectedSavings: number
}

// 優先度別スタイル定義（型安全・フォールバック付き）
const priorityStyle = (p: Priority | undefined) => {
  switch (p) {
    case '高':
      return {
        card: 'bg-red-600 text-white border-red-600',
        title: 'text-white',
        desc: 'text-white/90',
        chipVariant: 'destructive' as const,
        action: 'bg-white/20 text-white border-white/30',
        effect: 'text-white/80',
      }
    case '中':
      return {
        card: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        title: 'text-yellow-900',
        desc: 'text-yellow-700',
        chipVariant: 'secondary' as const,
        action: 'bg-white/50 text-yellow-800 border-yellow-200',
        effect: 'text-yellow-700',
      }
    case '低':
      return {
        card: 'bg-green-50 text-green-800 border-green-200',
        title: 'text-green-900',
        desc: 'text-green-700',
        chipVariant: 'secondary' as const,
        action: 'bg-white/50 text-green-800 border-green-200',
        effect: 'text-green-700',
      }
    default:
      // フォールバック（型安全）
      return {
        card: 'bg-muted text-foreground border-border',
        title: 'text-foreground',
        desc: 'text-muted-foreground',
        chipVariant: 'secondary' as const,
        action: 'bg-white text-foreground border-border',
        effect: 'text-muted-foreground',
      }
  }
}

export const QuickActions: React.FC = () => {
  const quickActionItems: QuickActionItem[] = [
    {
      category: '在庫管理システム',
      description: '食材ロス削減とコスト最適化',
      priority: '高',
      timeframe: '2-3ヶ月',
      actions: [
        '発注点管理システム',
        '廃棄率自動計算',
        '業者別価格比較',
        'ABC分析導入'
      ],
      expectedSavings: 600000
    },
    {
      category: 'POS連携機能',
      description: 'レジデータ自動取込でデータ精度向上',
      priority: '高',
      timeframe: '1-2ヶ月',
      actions: [
        'レジAPI連携',
        '客数・客単価自動計算',
        '商品別売上分析',
        'リアルタイム売上更新'
      ],
      expectedSavings: 360000
    },
    {
      category: '税務レポート',
      description: '税理士費用削減と法務対応',
      priority: '中',
      timeframe: '1ヶ月',
      actions: [
        '消費税計算精度向上',
        '月次税務レポート',
        '年次決算資料生成',
        '監査ログ機能'
      ],
      expectedSavings: 360000
    },
    {
      category: 'シフト管理',
      description: '人件費最適化と労務管理',
      priority: '中',
      timeframe: '2ヶ月',
      actions: [
        '時給計算システム',
        '労働時間管理',
        'シフト最適化AI',
        '人件費予算管理'
      ],
      expectedSavings: 480000
    },
    {
      category: '通知システム',
      description: 'アラート機能で迅速な対応',
      priority: '低',
      timeframe: '2週間',
      actions: [
        '利益率悪化アラート',
        'LINE/Slack通知',
        '売上目標未達通知',
        'カスタムアラート設定'
      ],
      expectedSavings: 120000
    },
    {
      category: '競合分析',
      description: '市場ポジション把握と戦略立案',
      priority: '低',
      timeframe: '3ヶ月',
      actions: [
        '商圏分析ツール',
        '競合価格調査',
        'マーケットシェア分析',
        '顧客満足度調査'
      ],
      expectedSavings: 240000
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          追加実装推奨機能
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          実務レベル向上のための優先機能リスト
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {quickActionItems.map((item, index) => {
            const style = priorityStyle(item.priority)
            
            return (
              <div key={`${item.category}-${index}`} className={`p-4 rounded-lg border-2 ${style.card}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${style.title}`}>
                    {item.category}
                  </span>
                  <Badge variant={style.chipVariant} className="text-xs">
                    {item.priority}
                  </Badge>
                </div>
                
                <p className={`text-xs mb-3 ${style.desc}`}>
                  {item.description}
                </p>
                
                <div className="space-y-2">
                  {item.actions.map((action) => (
                    <div 
                      key={action}
                      className={`text-xs p-2 rounded border ${style.action}`}
                    >
                      • {action}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className={`text-xs ${style.effect}`}>
                    期待効果: 月間{formatCurrency(item.expectedSavings)}削減
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className={`w-3 h-3 ${style.effect.replace('text-', 'text-')}`} />
                    <span className={`text-xs ${style.effect}`}>
                      {item.timeframe}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">実装時の総合効果</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">年間削減効果:</span>
              <span className="font-bold text-blue-900 ml-2">
                {formatCurrency(quickActionItems.reduce((sum, item) => sum + item.expectedSavings * 12, 0))}
              </span>
            </div>
            <div>
              <span className="text-blue-700">投資回収期間:</span>
              <span className="font-bold text-blue-900 ml-2">3-6ヶ月</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}