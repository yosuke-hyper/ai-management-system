import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Bot, User, Brain, Sparkles, Lightbulb, Trash2, Store, MessageSquare, Archive, Search, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReports } from '@/hooks/useReports'
import { useKpis } from '@/hooks/useKpis'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatPercent } from '@/lib/format'
import { useChatArchive } from '@/hooks/useChatArchive'
import { supabase } from '@/lib/supabase'
import { useAIUsageLimit } from '@/hooks/useAIUsageLimit'
import { AIUsageIndicator } from '@/components/Chat/AIUsageIndicator'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  suggestions?: string[]
}

interface DisplayMessage extends Message {
  role: 'user' | 'assistant'
}

export const AIChatPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const { user, getAccessibleStores } = useAuth()
  
  // Get accessible stores for current user
  const accessibleStores = getAccessibleStores()
  
  // Set initial store based on user permissions
  const getInitialStoreId = () => {
    const urlStore = sp.get('store')
    if (urlStore && accessibleStores.some(store => store.id === urlStore)) {
      return urlStore
    }
    return accessibleStores.length > 0 ? accessibleStores[0].id : 'all'
  }

  const [currentStoreId, setCurrentStoreId] = useState(getInitialStoreId())
  const initialConvId = sp.get('conv') || undefined

  const {
    conversationId,
    messages: archivedMessages,
    conversations,
    loading: archiveLoading,
    startNewConversation,
    loadMessages,
    sendUserMessage,
    appendAssistantMessage,
    renameConversation,
    archiveConversation,
    removeConversation,
    search
  } = useChatArchive(user?.id || 'guest', currentStoreId, initialConvId)

  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `こんにちは！🤖 AI経営アナリストです。\n\n${user?.name}さん（${user?.role === 'admin' ? '統括' : user?.role === 'manager' ? '店長' : 'スタッフ'}権限）として、${user?.role === 'admin' ? '全店舗の' : user?.role === 'manager' ? '担当店舗の' : '勤務店舗の'}業務データを分析して具体的な洞察をお届けします。\n\n何についてお聞きになりたいですか？`,
      suggestions: [
        user?.role === 'admin' ? '全店舗の業績サマリーを表示' : '今月の業績サマリーを表示',
        user?.role === 'admin' ? '店舗別パフォーマンス分析' : user?.role === 'manager' ? '担当店舗比較分析' : '店舗業績分析',
        '来月の売上予測',
        '経費最適化提案',
        '目標達成ロードマップ'
      ],
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { status: usageStatus, loading: usageLoading, refresh: refreshUsage } = useAIUsageLimit(user?.id)

  useEffect(() => {
    const convertedMessages: Message[] = archivedMessages.map(m => ({
      id: m.id,
      type: m.role === 'user' ? 'user' : 'ai',
      content: m.content,
      timestamp: new Date(m.created_at),
      suggestions: undefined
    }))

    if (convertedMessages.length === 0) {
      setDisplayMessages([{
        id: '1',
        type: 'ai',
        content: `こんにちは！🤖 AI経営アナリストです。\n\n${user?.name}さん（${user?.role === 'admin' ? '統括' : user?.role === 'manager' ? '店長' : 'スタッフ'}権限）として、${user?.role === 'admin' ? '全店舗の' : user?.role === 'manager' ? '担当店舗の' : '勤務店舗の'}業務データを分析して具体的な洞察をお届けします。\n\n何についてお聞きになりたいですか？`,
        suggestions: [
          user?.role === 'admin' ? '全店舗の業績サマリーを表示' : '今月の業績サマリーを表示',
          user?.role === 'admin' ? '店舗別パフォーマンス分析' : user?.role === 'manager' ? '担当店舗比較分析' : '店舗業績分析',
          '来月の売上予測',
          '経費最適化提案',
          '目標達成ロードマップ'
        ],
        timestamp: new Date()
      }])
    } else {
      setDisplayMessages(convertedMessages)
    }
  }, [archivedMessages, user])

  const { data: reports } = useReports({ storeId: currentStoreId })
  const kpis = useKpis(reports)
  const mKey = new Date().toISOString().slice(0,7)
  const thisMonthReports = reports.filter(r => r.date.startsWith(mKey))
  const thisMonthKpis = useKpis(thisMonthReports)
  
  // Pre-calculate store-filtered KPIs for current selection
  const currentStoreFilteredReports = currentStoreId === 'all' 
    ? reports 
    : reports.filter(r => r.storeId === currentStoreId)
  const currentStoreKpis = useKpis(currentStoreFilteredReports)

  const getStoreDisplayName = (storeId: string) => {
    const store = accessibleStores.find(s => s.id === storeId)
    return store ? store.label : '選択店舗'
  }

  const handleStoreChange = (newStoreId: string) => {
    // Check if user has access to the selected store
    if (!accessibleStores.some(store => store.id === newStoreId)) {
      console.warn('Access denied to store:', newStoreId)
      return
    }
    
    setCurrentStoreId(newStoreId)
    // Update URL
    const newSearchParams = new URLSearchParams(location.search)
    newSearchParams.set('store', newStoreId)
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true })
  }

  // Permission-based analysis context
  const getAnalysisContext = () => {
    if (!user) return '権限なし'
    
    switch (user.role) {
      case 'admin':
        return '統括権限：全店舗の経営データ分析・戦略立案が可能'
      case 'manager':
        return `店長権限：担当店舗（${user.assignedStores?.length || 0}店舗）の詳細分析・管理が可能`
      case 'staff':
        return `スタッフ権限：勤務店舗の基本分析・業績確認が可能`
      default:
        return '基本権限'
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages])

  const generateAIResponse = (
    question: string,
    context: { kpisAll: typeof kpis; kpisThisMonth: typeof thisMonthKpis; reports: typeof reports; storeId: string }
  ): { content: string; suggestions?: string[] } => {
    const q = question.toLowerCase()
    
    // Filter reports to selected store only (unless 'all' is explicitly selected by admin)
    const filteredReports = context.storeId === 'all' 
      ? context.reports 
      : context.reports.filter(r => r.storeId === context.storeId)
    
    if (filteredReports.length === 0) {
      return {
        content: `📊 ${context.storeId === 'all' ? '全店舗の' : '選択店舗の'}分析可能なデータがまだありません。\n\n「新規報告」から日次報告を作成してください。`,
        suggestions: ['デモデータを生成', 'サンプル分析を表示']
      }
    }

    // Get selected store name for personalized responses
    const selectedStore = accessibleStores.find(s => s.id === context.storeId)
    const storeDisplayName = selectedStore ? selectedStore.name.replace('🏪 ', '').replace('🏢 ', '') : '選択店舗'

    const thisMonthKpis = context.kpisThisMonth

    // 特別な売上実績の分析（9月18日の豊洲店）
    const specialEvent = filteredReports.find(r => 
      r.date === '2024-09-18' && r.storeId === 'store-toyosu'
    )
    
    if (q.includes('9月18日') || q.includes('918') || q.includes('特別') || q.includes('イベント') || q.includes('豊洲') && q.includes('最高')) {
      if (specialEvent) {
        const eventExpenses = specialEvent.purchase + specialEvent.laborCost + specialEvent.utilities + 
                             specialEvent.promotion + specialEvent.cleaning + specialEvent.misc + 
                             specialEvent.communication + specialEvent.others
        const eventProfit = specialEvent.sales - eventExpenses
        const eventMargin = (eventProfit / specialEvent.sales) * 100
        
        return {
          content: `🎉 **2024年9月18日 豊洲店 特別実績分析**\n\n💰 **売上実績:** ${formatCurrency(specialEvent.sales)}\n📊 **営業利益:** ${formatCurrency(eventProfit)}\n📈 **利益率:** ${formatPercent(eventMargin)}\n\n🏆 **特別要因:**\n• 豊洲市場見学ツアーとのタイアップ効果\n• イベント開催による大幅売上向上\n• 通常日商の約5.5倍の実績\n\n💡 **成功要因分析:**\n• 地域特性を活かしたコラボレーション\n• 観光客の取り込み成功\n• 効果的なマーケティング施策`,
          suggestions: ['他店舗でも同様イベント開催可能？', 'イベント時の経費効率分析', '今後の特別企画提案']
        }
      }
    }

    // 最高売上日の分析
    if (q.includes('最高') && (q.includes('売上') || q.includes('日商'))) {
      const maxSalesReport = filteredReports.reduce((max, r) => 
        r.sales > max.sales ? r : max, context.reports[0] || { sales: 0 }
      )
      
      if (maxSalesReport && maxSalesReport.sales > 0) {
        const isSpecialDay = maxSalesReport.date === '2024-09-18' && maxSalesReport.storeId === 'store-toyosu'
        return {
          content: `🏆 **最高売上日分析**\n\n📅 **日付:** ${maxSalesReport.date}\n🏪 **店舗:** ${maxSalesReport.storeName}\n💰 **売上:** ${formatCurrency(maxSalesReport.sales)}\n\n${isSpecialDay ? '🎊 **豊洲市場見学ツアーとのタイアップイベント**\n• 特別企画による記録的売上\n• 地域連携の成功事例\n• 観光客流入の効果を実証' : '📈 **優秀な営業実績**\n通常営業での高い売上を記録'}`,
          suggestions: ['この成功を他店舗に展開', '成功要因の詳細分析', '今後の企画提案']
        }
      }
    }
    if (q.includes('業績') || q.includes('サマリー') || q.includes('今月')) {
      const scopeLabel = context.storeId === 'all' ? '全店舗' : storeDisplayName
      
      return {
        content: `📊 **${scopeLabel}の今月業績サマリー**\n\n🏢 **実績:**\n• 売上: ${formatCurrency(context.kpisAll.totalSales)}\n• 営業利益: ${formatCurrency(context.kpisAll.operatingProfit)}\n• 利益率: ${formatPercent(context.kpisAll.profitMargin)}\n• 報告数: ${context.kpisAll.reportCount}件\n\n${context.storeId === 'all' ? '📊 全店舗統合分析' : `🏪 ${storeDisplayName}専用分析`}\n\n${context.kpisAll.profitMargin >= 20 ? '🎉 優秀な業績です！' : context.kpisAll.profitMargin >= 15 ? '👍 良好な業績です' : '⚠️ 改善の余地があります'}`,
        suggestions: ['詳細な店舗別分析', '来月の売上予測', '経営改善提案']
      }
    }

    // 店舗比較
    if (q.includes('店舗') && (q.includes('比較') || q.includes('分析'))) {
      // Permission check for store comparison
      if (user?.role === 'staff') {
        const staffStore = user.assignedStores?.[0]?.name || '勤務店舗'
        return {
          content: `📊 **${staffStore}の業績分析**\n\n💰 **売上実績:** ${formatCurrency(context.kpisAll.totalSales)}\n📈 **利益率:** ${formatPercent(context.kpisAll.profitMargin)}\n📊 **報告数:** ${context.kpisAll.reportCount}件\n\n💡 **スタッフ権限では単一店舗の分析のみ表示されます。**`,
          suggestions: ['今月の売上傾向', '経費構造分析', '目標達成度確認']
        }
      }
      
      // If specific store is selected, show only that store's analysis
      if (context.storeId !== 'all') {
        return {
          content: `📊 **${storeDisplayName}の業績分析**\n\n💰 **売上実績:** ${formatCurrency(context.kpisAll.totalSales)}\n📈 **利益率:** ${formatPercent(context.kpisAll.profitMargin)}\n📊 **報告数:** ${context.kpisAll.reportCount}件\n\n🏪 **選択店舗専用分析を実行しました。**`,
          suggestions: ['この店舗の売上傾向', '経費構造詳細分析', '改善提案']
        }
      }
      
      // Only admin can see multi-store comparison when 'all' is selected
      if (user?.role !== 'admin') {
        return {
          content: `📊 **権限制限により比較分析は利用できません**\n\n💡 **${user?.role === 'manager' ? '店長' : 'スタッフ'}権限では個別店舗の分析のみ可能です。**\n\n🏪 **現在の分析対象:** ${storeDisplayName}`,
          suggestions: ['個別店舗の詳細分析', '売上向上施策', '経費最適化']
        }
      }
      
      const storeAnalysis = filteredReports.reduce((acc, report) => {
        if (!acc[report.storeName]) {
          acc[report.storeName] = { sales: 0, profit: 0, count: 0 }
        }
        const expenses = report.purchase + report.laborCost + report.utilities + 
                        report.promotion + report.cleaning + report.misc + 
                        report.communication + report.others
        acc[report.storeName].sales += report.sales
        acc[report.storeName].profit += (report.sales - expenses)
        acc[report.storeName].count += 1
        return acc
      }, {} as Record<string, { sales: number; profit: number; count: number }>)

      const ranking = Object.entries(storeAnalysis)
        .map(([name, data]) => ({
          name: name.replace('居酒屋いっき', ''),
          sales: data.sales,
          profit: data.profit,
          profitMargin: data.sales > 0 ? (data.profit / data.sales) * 100 : 0
        }))
        .sort((a, b) => b.sales - a.sales)

      // 豊洲店の特別実績を強調
      const toyosuRanking = ranking.find(r => r.name.includes('豊洲'))
      const hasSpecialEvent = filteredReports.some(r => 
        r.date === '2024-09-18' && r.storeId === 'store-toyosu'
      )
      return {
        content: `🏆 **${context.storeId === 'all' ? '全店舗' : storeDisplayName}パフォーマンス分析**\n\n${ranking.map((store, i) => {
          const isTop = i === 0
          const isToyosu = store.name.includes('豊洲')
          return `${isTop ? '👑' : `${i + 1}位.`} ${store.name}店\n• 売上: ${formatCurrency(store.sales)}\n• 利益率: ${formatPercent(store.profitMargin)}${isToyosu && hasSpecialEvent ? '\n⭐ 特別イベント実績含む' : ''}`
        }).join('\n\n')}${hasSpecialEvent ? '\n\n💡 **注目ポイント:**\n豊洲店は9/18に市場見学ツアーコラボで記録的売上を達成' : ''}`,
        suggestions: ['トップ店舗の成功要因', '改善が必要な店舗の対策', '全店舗共通の課題']
      }
    }

    // 経費分析
    if (q.includes('経費') || q.includes('コスト')) {
      const expenseTotal = filteredReports.reduce((sum, r) => 
        sum + r.purchase + r.laborCost + r.utilities + r.promotion + 
        r.cleaning + r.misc + r.communication + r.others, 0)
      const purchaseTotal = filteredReports.reduce((sum, r) => sum + r.purchase, 0)
      const purchaseRatio = (purchaseTotal / expenseTotal) * 100

      return {
        content: `💸 **${storeDisplayName}の経費構造分析**\n\n💰 **総経費:** ${formatCurrency(expenseTotal)}\n🥇 **最大項目:** 仕入 (${purchaseRatio.toFixed(1)}%)\n\n📊 選択店舗の経費比率分析が完了しました。`,
        suggestions: ['経費削減戦略', '最適な経費比率', 'コスト管理のベストプラクティス']
      }
    }

    // デフォルト応答
    return {
      content: `🤖 **AI分析システム稼働中**\n\n🏪 **分析対象:** ${storeDisplayName}\n📊 **データ件数:** ${filteredReports.length}件\n\n利用可能な分析:\n📊 業績分析\n🏆 ${context.storeId === 'all' && user?.role === 'admin' ? '店舗比較' : '店舗分析'}\n💸 経費分析\n🎯 目標進捗\n\n具体的な質問をお聞かせください。`,
      suggestions: [
        '今月の業績サマリーを表示',
        context.storeId === 'all' && user?.role === 'admin' ? '店舗別パフォーマンス分析' : '店舗詳細分析', 
        '経費構造を分析',
        '目標達成状況を確認'
      ]
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    if (usageStatus?.isLimited) {
      alert(`本日の利用上限（${usageStatus.dailyLimit}回）に達しました。\n明日午前0時（日本時間）にリセットされます。`)
      return
    }

    const userText = inputMessage
    setInputMessage('')
    setIsLoading(true)

    const { error: userMsgError, conversationId: msgConvId } = await sendUserMessage(userText)

    if (userMsgError) {
      console.error('Failed to send user message:', userMsgError)
      setIsLoading(false)
      return
    }

    try {
      // Prepare business data for ChatGPT context
      // Filter data to selected store only for security
      const selectedStoreName = accessibleStores.find(s => s.id === currentStoreId)?.name || '選択店舗'
      
      const businessData = {
        totalSales: currentStoreKpis.totalSales,
        totalExpenses: currentStoreKpis.totalExpenses,
        profitMargin: currentStoreKpis.profitMargin,
        reportCount: currentStoreKpis.reportCount,
        analysisScope: currentStoreId === 'all' ? '全店舗' : selectedStoreName.replace('🏪 ', '').replace('🏢 ', ''),
        stores: currentStoreId === 'all' 
          ? accessibleStores.map(s => s.name.replace('🏪 ', '').replace('🏢 ', ''))
          : [selectedStoreName.replace('🏪 ', '').replace('🏢 ', '')],
        recentEvents: currentStoreFilteredReports.some(r => r.date === '2024-09-18' && r.storeId === 'store-toyosu') 
          ? ['豊洲店2024年9月18日: 売上1,534,220円の記録的実績（豊洲市場見学ツアーコラボ）'] 
          : [],
        currentMonth: {
          sales: currentStoreKpis.totalSales,
          profit: currentStoreKpis.operatingProfit,
          margin: currentStoreKpis.profitMargin
        }
      }

      // Get user session for Edge Function authentication
      const { data: { session } } = await supabase!.auth.getSession()

      // Call ChatGPT via Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gpt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...displayMessages.slice(-6).map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            { role: 'user', content: userText }
          ],
          businessData,
          storeId: currentStoreId
        })
      })

      const result = await response.json()

      let assistantContent: string

      if (response.status === 429) {
        assistantContent = result.message || result.error || '本日の利用上限に達しました。'
        await appendAssistantMessage(assistantContent, undefined, msgConvId)
        await refreshUsage()
        setIsLoading(false)
        return
      }

      if (result.success && result.response) {
        assistantContent = result.response

        if (result.usageInfo) {
          await refreshUsage()
        }
      } else {
        console.warn('ChatGPT API failed, using local fallback:', result.error)
        const fallbackResponse = generateAIResponse(userText, {
          kpisAll: currentStoreKpis,
          kpisThisMonth: thisMonthKpis,
          reports: currentStoreFilteredReports,
          storeId: currentStoreId
        })
        assistantContent = `${fallbackResponse.content}\n\n💡 ローカル分析で対応中`
      }

      await appendAssistantMessage(assistantContent, { usage: result?.usage }, msgConvId)

      if (archivedMessages.length < 2 && (conversationId || msgConvId)) {
        await renameConversation(userText.slice(0, 30))
      }
    } catch (error) {
      console.error('ChatGPT API error:', error)
      await appendAssistantMessage('⚠️ AI応答に失敗しました。しばらくしてからお試しください。', undefined, msgConvId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
  }

  const clearChat = async () => {
    await startNewConversation(currentStoreId, '新しいチャット')
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const results = await search(searchQuery)
    setSearchResults(results)
  }

  const handleLoadConversation = async (convId: string) => {
    await loadMessages(convId)
    setShowSidebar(false)
    const newSearchParams = new URLSearchParams(location.search)
    newSearchParams.set('conv', convId)
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true })
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-6 px-2 sm:px-4 lg:px-0">
      <div className="flex gap-4">
        {showSidebar && (
          <Card className="w-80 flex-shrink-0 h-[85vh] overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                会話履歴
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <Button size="sm" variant="outline" onClick={handleSearch}>
                  <Search className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[calc(100%-100px)] space-y-2">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">検索結果: {searchResults.length}件</p>
                  {searchResults.map((result: any) => (
                    <button
                      key={result.conversation_id}
                      onClick={() => handleLoadConversation(result.conversation_id)}
                      className="w-full text-left p-2 rounded hover:bg-accent text-xs border"
                    >
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="text-muted-foreground line-clamp-2">{result.snippet}</div>
                    </button>
                  ))}
                </div>
              ) : (
                conversations.slice(0, 20).map((conv: any) => (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => handleLoadConversation(conv.id)}
                      className={`w-full text-left p-2 rounded hover:bg-accent text-xs transition-colors ${
                        conversationId === conv.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="font-medium truncate">{conv.title || '新しいチャット'}</div>
                      <div className="text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString('ja-JP')}
                      </div>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archiveConversation(conv.id)}
                      className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    >
                      <Archive className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
        <div className="flex-1 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-base sm:text-xl font-bold">AI経営アナリスト</h1>
              <p className="text-xs text-blue-100">
                <span className="hidden sm:inline">OpenAI GPT-4o-mini連携 - </span>
                {user?.role === 'admin' ? '統括専用' : user?.role === 'manager' ? '店長専用' : 'スタッフ専用'}分析AI
              </p>
            </div>
            <div className="hidden sm:block">
              <AIUsageIndicator status={usageStatus} loading={usageLoading} compact />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-100 text-xs">
              <Sparkles className="w-3 h-3" />
              <span>
                {getAnalysisContext().split('：')[0]}データ: {reports.length}件
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="sm:hidden">
                <AIUsageIndicator status={usageStatus} loading={usageLoading} compact />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <Badge className="bg-green-500/20 text-green-100 border-green-300/30 text-xs px-2 py-0">
                  <span className="hidden sm:inline">ChatGPT</span>連携中
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Store Selector */}
      <div className="md:hidden mb-4">
        <Card>
          <CardHeader className="pb-2 px-4 py-3">
            <CardTitle className="text-sm flex items-center gap-2 truncate">
              <Store className="w-4 h-4 text-blue-600" />
              分析対象店舗 ({user?.role === 'admin' ? '全権限' : user?.role === 'manager' ? '担当店舗' : '勤務店舗'})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <select
              value={currentStoreId}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="w-full px-3 py-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] truncate"
            >
              {accessibleStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              💡 {getAnalysisContext()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Store Tabs */}
      <div className="hidden md:block mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {accessibleStores.map(option => (
            <Button
              key={option.id}
              onClick={() => handleStoreChange(option.id)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                currentStoreId === option.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {option.name}
            </Button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          🔒 **{user?.role === 'admin' ? '統括権限' : user?.role === 'manager' ? '店長権限' : 'スタッフ権限'}**: {getAnalysisContext()}
        </div>
      </div>

      {/* API Status Indicator */}

      {/* Chat Interface */}
      <Card className="h-[75vh] md:h-[600px] flex flex-col">
        <CardHeader className="pb-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base truncate flex-1">
              <Bot className="w-5 h-5 text-blue-600" />
              <span className="hidden sm:inline">AIアナリスト会話</span>
              <span className="sm:hidden">AI会話</span>
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                {getStoreDisplayName(currentStoreId)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {user?.role === 'admin' ? '統括' : user?.role === 'manager' ? '店長' : 'スタッフ'}権限
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-muted-foreground px-2 sm:px-3"
              >
                <MessageSquare className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">履歴</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground px-2 sm:px-3"
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">新規</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
          {displayMessages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className={`flex gap-2 sm:gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'ai' && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    <div className="whitespace-pre-line break-words">{message.content}</div>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  
                  {/* Suggestion buttons */}
                  {message.type === 'ai' && message.suggestions && (
                    <div className="mt-2 sm:mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        <span className="hidden sm:inline">おすすめの分析:</span>
                        <span className="sm:hidden">おすすめ:</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs h-auto py-1.5 px-2 sm:px-3 hover:bg-accent transition-colors break-words text-left"
                          >
                            {suggestion.length > 15 ? `${suggestion.substring(0, 15)}...` : suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 sm:gap-4 justify-start">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="bg-muted px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-md max-w-[85%] sm:max-w-[80%]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    <span className="hidden sm:inline">高度分析処理中...</span>
                    <span className="sm:hidden">分析中...</span>
                  </span>
                  <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        
        {/* Input Area */}
        <div className="p-3 sm:p-4 border-t border-border">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="例: 今月の売上は？"
                className="w-full px-3 sm:px-4 py-3 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background min-h-[44px]"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || usageStatus?.isLimited}
              className="px-3 sm:px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 min-h-[44px] min-w-[44px]"
              title={usageStatus?.isLimited ? '本日の利用上限に達しました' : ''}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
            <Sparkles className="w-3 h-3" />
            <span>
              <span className="hidden sm:inline">Enter送信 | </span>
              {user?.role === 'admin' ? '統括専用' : user?.role === 'manager' ? '店長専用' : 'スタッフ専用'}AI
            </span>
          </p>
        </div>
      </Card>
      
      {/* Side Panel */}
      <div className="mt-4 md:mt-6">
        <div className="md:hidden">
          <Card>
            <CardHeader className="pb-2 px-4 py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                分析状況 ({user?.role === 'admin' ? '統括' : user?.role === 'manager' ? '店長' : 'スタッフ'}権限)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-3">
                <AIUsageIndicator status={usageStatus} loading={usageLoading} />
                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">アクセス可能データ</span>
                    <span className="font-medium text-blue-600">{reports.length}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">対象店舗数</span>
                    <span className="font-medium text-green-600">{accessibleStores.length}店舗</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  🔒 権限範囲: {user?.role === 'admin' ? '全店舗管理' : user?.role === 'manager' ? '担当店舗管理' : '勤務店舗のみ'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                分析権限・状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-800 font-medium mb-1">
                  {user?.name}さん ({user?.role === 'admin' ? '統括責任者' : user?.role === 'manager' ? '店長' : 'スタッフ'})
                </div>
                <div className="text-xs text-blue-700">
                  {getAnalysisContext()}
                </div>
              </div>

              <div className="pt-2 border-t">
                <AIUsageIndicator status={usageStatus} loading={usageLoading} />
              </div>

              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">アクセス可能データ</span>
                <span className="font-medium text-blue-600">{reports.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">対象店舗数</span>
                <span className="font-medium text-green-600">{accessibleStores.length}店舗</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最終分析</span>
                <span className="font-medium text-muted-foreground">
                  {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {user?.assignedStores && user.assignedStores.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">担当店舗:</div>
                  {user.assignedStores.slice(0, 3).map(store => (
                    <div key={store.id} className="text-xs">
                      🏪 {store.name.replace('居酒屋いっき', '').replace('バールアフロマージュスーヴォワル', 'アフロ')}
                    </div>
                  ))}
                  {user.assignedStores.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      他{user.assignedStores.length - 3}店舗...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}