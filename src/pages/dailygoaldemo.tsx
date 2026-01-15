import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DailyGoalAchievementCard,
  DailyGoalAchievementCardCompact
} from '@/components/dashboard/dailygoalachievementcard'
import { MonthlyGoalCalendar } from '@/components/dashboard/monthlygoalcalendar'
import {
  Sparkles,
  Settings,
  ArrowLeft,
  Target,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/format'

const generateMockDayStatuses = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const statuses = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayOfWeek = date.getDay()

    const isHoliday = dayOfWeek === 0
    const isOperatingDay = !isHoliday
    const isPast = date <= today

    const targetSales = 150000
    const targetCostRate = 30
    const targetLaborRate = 25

    let sales = 0
    let costRate = 0
    let laborRate = 0

    if (isPast && isOperatingDay) {
      const variance = Math.random() * 0.4 - 0.1
      sales = Math.round(targetSales * (1 + variance))
      costRate = Math.round((targetCostRate + (Math.random() * 10 - 5)) * 10) / 10
      laborRate = Math.round((targetLaborRate + (Math.random() * 8 - 4)) * 10) / 10
    }

    const salesAchieved = sales >= targetSales
    const costRateAchieved = costRate <= targetCostRate
    const laborRateAchieved = laborRate <= targetLaborRate
    const allGoalsAchieved = salesAchieved && costRateAchieved && laborRateAchieved

    statuses.push({
      date: dateStr,
      isOperatingDay,
      isHoliday,
      sales,
      targetSales,
      costRate,
      targetCostRate,
      laborRate,
      targetLaborRate,
      allGoalsAchieved: isPast ? allGoalsAchieved : false,
      salesAchieved: isPast ? salesAchieved : false,
      costRateAchieved: isPast ? costRateAchieved : false,
      laborRateAchieved: isPast ? laborRateAchieved : false
    })
  }

  return statuses
}

export const DailyGoalDemo: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const mockMonthlyTarget = {
    targetSales: 4500000,
    targetCostRate: 30,
    targetLaborRate: 25,
    targetProfitMargin: 45
  }

  const mockTodayMetrics = {
    sales: 142000,
    costRate: 28.5,
    laborRate: 23.2,
    profitMargin: 48.3
  }

  const dayStatuses = useMemo(() => generateMockDayStatuses(year, month), [year, month])

  const stats = useMemo(() => {
    const operatingDays = dayStatuses.filter(d => d.isOperatingDay && !d.isHoliday)
    const passedDays = dayStatuses.filter(d => {
      const date = new Date(d.date)
      return date <= today && d.isOperatingDay && !d.isHoliday
    })
    const achievedDays = passedDays.filter(d => d.allGoalsAchieved)
    const totalSales = passedDays.reduce((sum, d) => sum + d.sales, 0)

    return {
      operatingDays: operatingDays.length,
      passedDays: passedDays.length,
      achievedDays: achievedDays.length,
      totalSales
    }
  }, [dayStatuses])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  日次必達目標システム
                  <Badge variant="outline" className="ml-2">UI検証版</Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  月次目標から自動計算された日次指標の達成管理
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              設定
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              今日の目標
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              月間カレンダー
            </TabsTrigger>
            <TabsTrigger value="variants" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              UIバリエーション
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{month}月の月次目標</h2>
                  <p className="text-blue-100 mt-1">
                    毎日の目標をクリアすれば、自然と月次目標を達成できます
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {formatCurrency(mockMonthlyTarget.targetSales)}
                  </div>
                  <div className="text-blue-100 text-sm">売上目標</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">{stats.operatingDays}日</div>
                  <div className="text-blue-100 text-sm">営業日数</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {formatCurrency(Math.ceil(mockMonthlyTarget.targetSales / stats.operatingDays))}
                  </div>
                  <div className="text-blue-100 text-sm">日次売上目標</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">{mockMonthlyTarget.targetCostRate}%</div>
                  <div className="text-blue-100 text-sm">原価率目標</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">{mockMonthlyTarget.targetLaborRate}%</div>
                  <div className="text-blue-100 text-sm">人件費率目標</div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <DailyGoalAchievementCard
                monthlyTarget={mockMonthlyTarget}
                todayMetrics={mockTodayMetrics}
                operatingDaysInMonth={stats.operatingDays}
                currentDayOfMonth={stats.passedDays}
                daysAchievedThisMonth={stats.achievedDays}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    AIからのアドバイス
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>売上があと{formatCurrency(150000 - mockTodayMetrics.sales)}必要です。</strong>
                    </p>
                    <p className="text-sm text-amber-700 mt-2">
                      ディナータイムの客単価アップを狙いましょう。
                      おすすめメニューの声がけを強化すると、
                      平均+500円の効果が期待できます。
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-800">
                      <strong>原価率は目標内です!</strong>
                    </p>
                    <p className="text-sm text-emerald-700 mt-2">
                      現在28.5%で、目標30%を下回っています。
                      この調子で仕入れ管理を続けてください。
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>今月の達成率: {Math.round((stats.achievedDays / stats.passedDays) * 100)}%</strong>
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      {stats.achievedDays}日/{stats.passedDays}日で目標を達成しています。
                      残り{stats.operatingDays - stats.passedDays}営業日も頑張りましょう!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <MonthlyGoalCalendar
              year={year}
              month={month}
              dayStatuses={dayStatuses}
              monthlyTargetSales={mockMonthlyTarget.targetSales}
              currentMonthlySales={stats.totalSales}
              operatingDaysInMonth={stats.operatingDays}
            />
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>UIバリエーション比較</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Badge>パターン A</Badge>
                    詳細表示カード（推奨）
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    各指標の詳細と達成状況を一覧表示。ダッシュボードのメインエリアに配置。
                  </p>
                  <div className="max-w-md">
                    <DailyGoalAchievementCard
                      monthlyTarget={mockMonthlyTarget}
                      todayMetrics={mockTodayMetrics}
                      operatingDaysInMonth={stats.operatingDays}
                      currentDayOfMonth={stats.passedDays}
                      daysAchievedThisMonth={stats.achievedDays}
                    />
                  </div>
                </div>

                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Badge variant="secondary">パターン B</Badge>
                    コンパクトカード
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    シンプルな達成状況表示。サイドバーやヘッダー下に配置可能。
                  </p>
                  <div className="max-w-md">
                    <DailyGoalAchievementCardCompact
                      monthlyTarget={mockMonthlyTarget}
                      todayMetrics={mockTodayMetrics}
                      operatingDaysInMonth={stats.operatingDays}
                      currentDayOfMonth={stats.passedDays}
                      daysAchievedThisMonth={stats.achievedDays}
                    />
                  </div>
                </div>

                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Badge variant="outline">パターン C</Badge>
                    インライン表示
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    既存のKPIカードに統合するパターン。最小限のスペースで表示。
                  </p>
                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg max-w-md">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">今日の必達目標:</span>
                    <div className="flex gap-1">
                      <Badge className="bg-emerald-500">売上</Badge>
                      <Badge className="bg-emerald-500">原価率</Badge>
                      <Badge variant="secondary">人件費率</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground ml-auto">2/3達成</span>
                  </div>
                </div>

                <div className="border-t pt-8">
                  <h3 className="text-lg font-semibold mb-4">設置場所の提案</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">案1: ダッシュボード上部</h4>
                      <p className="text-sm text-muted-foreground">
                        日次ダッシュボードのKPIカードの上に配置。
                        ページを開いてすぐに達成状況が確認できる。
                      </p>
                      <Badge className="mt-2" variant="outline">推奨</Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">案2: サイドパネル</h4>
                      <p className="text-sm text-muted-foreground">
                        右サイドバーに常時表示。
                        どのページからでも確認可能。
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">案3: 専用タブ</h4>
                      <p className="text-sm text-muted-foreground">
                        目標管理ページに新規タブとして追加。
                        月間カレンダーと合わせて表示。
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">案4: モバイル最適化</h4>
                      <p className="text-sm text-muted-foreground">
                        コンパクトカードをモバイルファーストで表示。
                        タップで詳細展開。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default DailyGoalDemo
