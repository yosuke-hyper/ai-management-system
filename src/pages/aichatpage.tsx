import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, MessageSquare, Archive, Search, Plus, Store, ArrowLeft, History, User, Shield, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReports } from '@/hooks/usereports'
import { useKpis } from '@/hooks/usekpis'
import { useAuth } from '@/contexts/authcontext'
import { useChatArchive } from '@/hooks/usechatarchive'
import { useAIUsageLimit } from '@/hooks/useaiusagelimit'
import { AIUsageIndicator } from '@/components/chat/aiusageindicator'
import { useDemoAIUsage, isDemoSession, getDemoSessionId } from '@/hooks/usedemoaiusage'
import { DemoAIUsageIndicator } from '@/components/demo/demoaiusageindicator'
import { AiAvatar } from '@/components/avatar/aiavatar'
import { useAvatar } from '@/contexts/avatarcontext'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  suggestions?: string[]
}

export const AIChatPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const sp = new URLSearchParams(location.search)
  const { user, getAccessibleStores } = useAuth()
  const { emotion, setEmotionWithTimeout, equippedItems } = useAvatar()

  const accessibleStores = useMemo(() => getAccessibleStores(), [getAccessibleStores])

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
    startNewConversation,
    loadMessages,
    sendUserMessage,
    appendAssistantMessage,
    renameConversation,
    archiveConversation,
    search
  } = useChatArchive(user?.id || 'guest', currentStoreId, initialConvId)

  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `こんにちは！\n\n${user?.name}さん、今日も一緒に頑張りましょう！\n何でも聞いてくださいね。`,
      suggestions: [
        user?.role === 'admin' ? '全店舗の業績サマリー' : '今月の業績サマリー',
        '来月の売上予測',
        '経費最適化のアドバイス',
      ],
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isHelpChatOpen, setIsHelpChatOpen] = useState(false)
  const [isReadyToSend, setIsReadyToSend] = useState(false)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const { status: usageStatus, loading: usageLoading, refresh: refreshUsage } = useAIUsageLimit(user?.id, currentStoreId)

  const isDemo = isDemoSession()
  const demoSessionId = getDemoSessionId()
  const { status: demoUsageStatus, loading: demoUsageLoading, checkUsage: checkDemoUsage, incrementUsage: incrementDemoUsage } = useDemoAIUsage(demoSessionId)

  useEffect(() => {
    const convertedMessages: Message[] = archivedMessages.map(m => ({
      id: m.id,
      type: m.role === 'user' ? 'user' : 'ai',
      content: m.content,
      timestamp: new Date(m.created_at),
      suggestions: m.role === 'assistant' && m.meta?.suggestions ? m.meta.suggestions : undefined
    }))

    if (convertedMessages.length === 0) {
      setDisplayMessages([{
        id: '1',
        type: 'ai',
        content: `こんにちは！\n\n${user?.name}さん、今日も一緒に頑張りましょう！\n何でも聞いてくださいね。`,
        suggestions: [
          user?.role === 'admin' ? '全店舗の業績サマリー' : '今月の業績サマリー',
          '来月の売上予測',
          '経費最適化のアドバイス',
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

  const currentStoreFilteredReports = currentStoreId === 'all'
    ? reports
    : reports.filter(r => r.storeId === currentStoreId)
  const currentStoreKpis = useKpis(currentStoreFilteredReports)

  const getStoreDisplayName = (storeId: string) => {
    const store = accessibleStores.find(s => s.id === storeId)
    return store ? store.name : '店舗を選択'
  }

  const analyzeEmotion = (message: string): 'normal' | 'happy' | 'sad' | 'thinking' => {
    return 'normal'
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages])

  const handleStoreChange = (storeId: string) => {
    setCurrentStoreId(storeId)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const results = await search(searchQuery)
      setSearchResults(results || [])
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    }
  }

  const handleLoadConversation = async (convId: string) => {
    try {
      navigate(`/dashboard/chat?conv=${convId}`)
      await loadMessages(convId)
      setSearchResults([])
      setSearchQuery('')
      setShowSidebar(false)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  const clearChat = async () => {
    try {
      await startNewConversation(currentStoreId, '新しいチャット')
      setDisplayMessages([{
        id: '1',
        type: 'ai',
        content: `こんにちは！\n\n${user?.name}さん、今日も一緒に頑張りましょう！\n何でも聞いてくださいね。`,
        suggestions: [
          user?.role === 'admin' ? '全店舗の業績サマリー' : '今月の業績サマリー',
          '来月の売上予測',
          '経費最適化のアドバイス',
        ],
        timestamp: new Date()
      }])
      navigate('/dashboard/chat')
    } catch (err) {
      console.error('Failed to create new conversation:', err)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
    setIsReadyToSend(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)
    setIsReadyToSend(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      if (!inputMessage.trim()) return

      if (isReadyToSend) {
        handleSendMessage()
        setIsReadyToSend(false)
      } else {
        setIsReadyToSend(true)
      }
    }
  }

  const startEditing = (convId: string, currentTitle: string) => {
    setEditingConvId(convId)
    setEditingTitle(currentTitle || '新しいチャット')
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const cancelEditing = () => {
    setEditingConvId(null)
    setEditingTitle('')
  }

  const saveTitle = async () => {
    if (!editingConvId || !editingTitle.trim()) {
      cancelEditing()
      return
    }
    try {
      await renameConversation(editingTitle.trim(), editingConvId)
      cancelEditing()
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const generateSuggestions = (aiResponse: string): string[] => {
    return ['詳しく教えて', '他にアドバイスある？', '改善策を提案して']
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setDisplayMessages(prev => [...prev, userMessage])
    const userText = inputMessage
    setInputMessage('')
    setIsLoading(true)

    setEmotionWithTimeout('thinking', 30000)

    const { error: userMsgError, conversationId: msgConvId } = await sendUserMessage(userText)

    if (userMsgError) {
      console.error('Failed to send user message:', userMsgError)
      setEmotionWithTimeout('sad', 5000)
      setIsLoading(false)
      return
    }

    let assistantContent = ''
    const finalConvId = msgConvId || conversationId

    try {
      if (isDemo && demoSessionId) {
        const { demoAIService } = await import('@/services/demoai')
        const demoResponse = await demoAIService.generateResponse(userText)
        assistantContent = demoResponse.message

        const emotion = analyzeEmotion(assistantContent)
        setEmotionWithTimeout(emotion, 5000)

        try {
          const usage = await checkDemoUsage()
          if (usage && usage.chat.remaining > 0) {
            await incrementDemoUsage('chat')
          }
        } catch (err) {
          console.error('Failed to track demo usage:', err)
        }
      } else {
        const storeKpis = currentStoreKpis
        const contextData = {
          storeName: getStoreDisplayName(currentStoreId),
          reportCount: currentStoreFilteredReports.length,
          totalSales: storeKpis.totalSales,
          avgCostRate: storeKpis.avgCostRate,
          avgLaborCostRate: storeKpis.avgLaborCostRate,
          avgProfit: storeKpis.avgProfit,
          avgProfitRate: storeKpis.avgProfitRate,
          thisMonthSales: thisMonthKpis.totalSales,
          thisMonthAvgCostRate: thisMonthKpis.avgCostRate,
          role: user?.role,
          allStoresCount: accessibleStores.length
        }

        const chatGptUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gpt`

        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          throw new Error('認証セッションが見つかりません。再度ログインしてください。')
        }

        console.log('🚀 Sending request to:', chatGptUrl)
        console.log('📦 Request payload:', {
          messages: [{ role: 'user', content: userText }],
          businessData: contextData,
          storeId: currentStoreId
        })

        const response = await fetch(chatGptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: userText
              }
            ],
            businessData: contextData,
            storeId: currentStoreId
          })
        })

        console.log('✅ Response status:', response.status)

        const result = await response.json()
        console.log('📨 Response data:', result)

        if (response.status === 429) {
          assistantContent = result.message || result.error || '本日の利用上限に達しました。'
          setEmotionWithTimeout('sad', 5000)
        } else if (!response.ok) {
          throw new Error(result.error || `API Error: ${response.status}`)
        } else if (result.success && result.response) {
          assistantContent = result.response
          const emotion = analyzeEmotion(assistantContent)
          setEmotionWithTimeout(emotion, 5000)
          refreshUsage()
        } else if (result.error) {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      console.error('❌ ChatGPT API error:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      setEmotionWithTimeout('sad', 5000)

      let errorMessage = '不明なエラー'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'ネットワークエラー: サーバーに接続できません。インターネット接続を確認してください。'
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'ネットワークエラー: リクエストがブロックされました。'
        } else {
          errorMessage = error.message
        }
      }

      assistantContent = `エラーが発生しました: ${errorMessage}`
    }

    const suggestions = generateSuggestions(assistantContent)

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: assistantContent,
      suggestions,
      timestamp: new Date()
    }

    setDisplayMessages(prev => [...prev, aiMessage])
    setIsLoading(false)

    if (finalConvId) {
      await appendAssistantMessage(assistantContent, { suggestions }, finalConvId)

      if (archivedMessages.length <= 1) {
        const title = userText.length > 30 ? `${userText.substring(0, 30)}...` : userText
        await renameConversation(title)
      }
    }
  }

  const getTimeSuggestions = (): string[] => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 11) {
      return ['今日の目標確認', '昨日の売上は？', 'ランチ準備のコツ']
    } else if (hour >= 11 && hour < 17) {
      return ['今の売上状況', '仕入れアドバイス', '客数予測']
    } else {
      return ['今日の振り返り', '明日の準備', '週次レポート']
    }
  }

  const handleSuggestionSend = async (suggestion: string) => {
    if (isLoading) return
    setInputMessage(suggestion)
    setTimeout(() => {
      handleSendMessage()
    }, 300)
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#FFF8F0' }}>
      <style>{`
        .ai-speech-bubble {
          position: relative;
          background: #FFFFFF;
          border-radius: 24px;
          padding: 16px 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-left: 20px;
        }
        .ai-speech-bubble::before {
          content: '';
          position: absolute;
          bottom: 12px;
          left: -16px;
          width: 0;
          height: 0;
          border: 12px solid transparent;
          border-right-color: #FFFFFF;
          border-left: 0;
          filter: drop-shadow(-2px 2px 2px rgba(0, 0, 0, 0.05));
        }
        .user-speech-bubble {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 24px;
          padding: 14px 18px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        @keyframes avatar-idle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes avatar-talking {
          0%, 100% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.02) translateY(-4px); }
          50% { transform: scale(1) translateY(0); }
          75% { transform: scale(1.02) translateY(-2px); }
        }
        .avatar-idle {
          animation: avatar-idle 3s ease-in-out infinite;
        }
        .avatar-talking {
          animation: avatar-talking 0.5s ease-in-out infinite;
        }
      `}</style>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
          <div className="relative w-80 bg-white/95 backdrop-blur-md shadow-2xl h-full overflow-hidden flex flex-col z-50 border-r border-orange-100">
            <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                会話履歴
              </h2>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 text-sm border border-orange-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="rounded-xl border-orange-200">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 px-2">検索結果: {searchResults.length}件</p>
                  {searchResults.map((result: any) => (
                    <button
                      key={result.conversation_id}
                      onClick={() => handleLoadConversation(result.conversation_id)}
                      className="w-full text-left p-3 rounded-xl hover:bg-orange-50 text-sm border border-orange-100 transition-all hover:shadow-sm"
                    >
                      <div className="font-medium truncate text-gray-700">{result.title}</div>
                      <div className="text-gray-400 line-clamp-2 text-xs mt-1">{result.snippet}</div>
                    </button>
                  ))}
                </div>
              ) : (
                conversations.slice(0, 20).map((conv: any) => (
                  <div key={conv.id} className="relative group">
                    {editingConvId === conv.id ? (
                      <div className={`p-3 rounded-xl text-sm border-2 border-orange-400 bg-orange-50`}>
                        <div className="flex items-center gap-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={() => setTimeout(saveTitle, 150)}
                            className="flex-1 px-2 py-1 text-sm border border-orange-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveTitle}
                            className="h-7 w-7 p-0 rounded-lg text-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="h-7 w-7 p-0 rounded-lg text-gray-500 hover:bg-gray-100"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-gray-400 text-xs mt-2">
                          {new Date(conv.updated_at).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLoadConversation(conv.id)}
                          className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                            conversationId === conv.id
                              ? 'bg-orange-100 border-2 border-orange-300 shadow-sm'
                              : 'hover:bg-orange-50 border border-orange-100'
                          }`}
                        >
                          <div className="font-medium truncate text-gray-700 pr-16">{conv.title || '新しいチャット'}</div>
                          <div className="text-gray-400 text-xs mt-1">
                            {new Date(conv.updated_at).toLocaleDateString('ja-JP')}
                          </div>
                        </button>
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(conv.id, conv.title)
                            }}
                            className="h-7 w-7 p-0 rounded-lg hover:bg-orange-100"
                            title="名前を編集"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              archiveConversation(conv.id)
                            }}
                            className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                            title="アーカイブ"
                          >
                            <Archive className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-80 z-50 border border-orange-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-500" />
              分析対象店舗
            </h3>
            <div className="space-y-2">
              {accessibleStores.map(store => (
                <button
                  key={store.id}
                  onClick={() => {
                    handleStoreChange(store.id)
                    setShowSettings(false)
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    currentStoreId === store.id
                      ? 'bg-orange-100 border-2 border-orange-400 text-orange-800 shadow-sm'
                      : 'bg-gray-50 hover:bg-orange-50 border-2 border-transparent'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 rounded-xl border-orange-200"
              onClick={() => setShowSettings(false)}
            >
              閉じる
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-orange-100 shadow-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left Side - Back & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/daily')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">戻る</span>
            </Button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <span className="hidden sm:inline">AIチャット分析</span>
              <span className="sm:hidden">AI分析</span>
            </h1>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 font-medium">{user?.name || 'ゲスト'}</span>
              <div className="h-4 w-px bg-gray-200" />
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-orange-600 font-medium">
                {user?.role === 'super_admin' ? 'スーパー管理者' :
                 user?.role === 'admin' ? '管理者' :
                 user?.role === 'owner' ? 'オーナー' :
                 user?.role === 'manager' ? 'マネージャー' :
                 user?.role === 'staff' ? 'スタッフ' : 'ゲスト'}
              </span>
            </div>

            {/* Store Selector with Current Store Name */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-gray-700 border-orange-200 hover:bg-orange-50 hover:border-orange-300 rounded-xl px-3 gap-2"
            >
              <Store className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium max-w-[120px] truncate">
                {getStoreDisplayName(currentStoreId)}
              </span>
            </Button>

            {/* Chat History */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="text-gray-700 border-orange-200 hover:bg-orange-50 hover:border-orange-300 rounded-xl gap-2"
            >
              <History className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline text-sm">履歴</span>
            </Button>

            {/* New Chat */}
            <Button
              variant="default"
              size="sm"
              onClick={clearChat}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">新規</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="flex-1" />
        <div className={`p-4 pb-44 md:pb-48 pl-6 md:pl-[180px] space-y-5 transition-all duration-300 ${isHelpChatOpen ? 'pr-4 md:pr-[420px]' : ''}`}>
          {displayMessages.map((message) => (
            <div key={message.id}>
              {message.type === 'ai' ? (
                <div className="max-w-[85%] md:max-w-[70%]">
                  <div className="ai-speech-bubble">
                    <div className="text-sm md:text-base leading-relaxed whitespace-pre-line text-gray-700">
                      {message.content}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 ml-6">
                    {message.timestamp.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 ml-6 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-4 py-2 text-xs md:text-sm bg-white/80 text-orange-700 rounded-full border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all shadow-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[75%] md:max-w-[60%]">
                    <div className="user-speech-bubble">
                      <div className="text-sm md:text-base leading-relaxed whitespace-pre-line text-white">
                        {message.content}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 mr-2 text-right">
                      {message.timestamp.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="max-w-[85%] md:max-w-[70%]">
              <div className="ai-speech-bubble">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" />
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Avatar - Bottom Left */}
      <div
        className={`fixed bottom-32 md:bottom-36 left-4 z-40 ${isLoading ? 'avatar-talking' : 'avatar-idle'}`}
      >
        <AiAvatar
          emotion={isLoading ? 'thinking' : emotion}
          size={120}
          fixed={false}
          helpChatPosition="right"
          onHelpChatToggle={setIsHelpChatOpen}
          equippedItems={equippedItems}
        />
      </div>

      {/* Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        {/* Quick Suggestions */}
        <div className={`px-4 py-2 overflow-x-auto transition-all duration-300 ${isHelpChatOpen ? 'pr-4 md:pr-[420px]' : ''}`} style={{ backgroundColor: 'rgba(255, 248, 240, 0.95)' }}>
          <div className="flex gap-2 pl-[100px] md:pl-[140px]">
            {getTimeSuggestions().map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionSend(suggestion)}
                disabled={isLoading}
                className="flex-shrink-0 px-4 py-2 text-sm bg-white text-orange-700 rounded-full border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 whitespace-nowrap shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className={`px-4 py-3 bg-white/90 backdrop-blur-md border-t border-orange-100 transition-all duration-300 ${isHelpChatOpen ? 'pr-4 md:pr-[420px]' : ''}`}>
          <div className="flex flex-col gap-1 pl-[100px] md:pl-[140px]">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                  className={`w-full px-5 py-3 text-sm md:text-base border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all ${
                    isReadyToSend
                      ? 'border-orange-500 bg-orange-100/50'
                      : 'border-orange-200 focus:border-orange-300 bg-white'
                  }`}
                  disabled={isLoading}
                />
                {isReadyToSend && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-orange-600 font-medium">
                    Enterで送信
                  </span>
                )}
              </div>
              <Button
                onClick={() => {
                  handleSendMessage()
                  setIsReadyToSend(false)
                }}
                disabled={
                  isLoading ||
                  !inputMessage.trim() ||
                  (isDemo && demoUsageStatus?.chat.remaining === 0) ||
                  (!isDemo && usageStatus?.isLimited)
                }
                className="px-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-2xl h-12 min-w-[48px] shadow-lg"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 ml-1">
              {isReadyToSend ? 'もう一度Enterで送信、または内容を編集' : 'Enterキーで確定'}
            </p>
          </div>

          {/* Usage Indicator */}
          <div className={`mt-2 pl-[100px] md:pl-[140px] transition-all duration-300 ${isHelpChatOpen ? 'pr-4 md:pr-[420px]' : ''}`}>
            {isDemo ? (
              <DemoAIUsageIndicator
                status={demoUsageStatus}
                loading={demoUsageLoading}
                compact
                featureType="chat"
                onUpgradeClick={() => navigate('/signup')}
              />
            ) : (
              <AIUsageIndicator status={usageStatus} loading={usageLoading} compact />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
