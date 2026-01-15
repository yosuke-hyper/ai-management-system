import { useEffect, useState, useCallback } from 'react'
import {
  createConversation,
  listConversations,
  fetchMessages,
  addMessage,
  updateConversation,
  searchConversations,
  deleteConversation,
  type Message,
  type Conversation
} from '../services/chatarchive'
import { getDemoSessionId } from './usedemoaiusage'

export function useChatArchive(
  userId: string,
  initialStoreId: string = 'all',
  initialConversationId?: string
) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const demoSessionId = getDemoSessionId()
      const { data, error } = await listConversations({ demoSessionId })
      if (error) {
        console.error('Failed to load conversations:', error)
        setConversations([])
        return
      }
      setConversations(data ?? [])
    } catch (err) {
      console.error('Error loading conversations:', err)
      setConversations([])
    }
  }, [])

  const startNewConversation = useCallback(
    async (storeId: string = initialStoreId, title?: string) => {
      const demoSessionId = getDemoSessionId()
      const { data, error } = await createConversation(userId, storeId, title, demoSessionId)
      if (!error && data) {
        setConversationId(data.id)
        localStorage.setItem('last_conv', data.id)
        await loadConversations()
        setMessages([])
      }
      return { data, error }
    },
    [userId, initialStoreId, loadConversations]
  )

  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true)
    setConversationId(convId)
    localStorage.setItem('last_conv', convId)
    const { data } = await fetchMessages(convId)
    setMessages(data ?? [])
    setLoading(false)
  }, [])

  const sendUserMessage = useCallback(
    async (content: string) => {
      let conv = conversationId
      if (!conv) {
        console.log('📝 No conversation ID, creating new conversation')
        const { data, error: convError } = await startNewConversation(initialStoreId, '新しいチャット')
        conv = data?.id ?? null
        if (!conv || convError) {
          return { data: null, error: convError || { message: '会話の作成に失敗しました' } }
        }
      }

      // Try to add message, but if conversation doesn't exist, create a new one
      let { data, error } = await addMessage(conv, 'user', content)

      // If RLS error (conversation doesn't exist or not accessible), create new conversation
      if (error && (error as any).code === '42501') {
        console.log('⚠️ Conversation not accessible, creating new one')
        const { data: newConv, error: convError } = await startNewConversation(initialStoreId, '新しいチャット')
        conv = newConv?.id ?? null
        if (!conv || convError) {
          return { data: null, error: convError || { message: '会話の作成に失敗しました' } }
        }
        // Retry adding message to new conversation
        const result = await addMessage(conv, 'user', content)
        data = result.data
        error = result.error
      }

      if (data) {
        setMessages(prev => [...prev, data])
      }
      return { data, error, conversationId: conv }
    },
    [conversationId, initialStoreId, startNewConversation]
  )

  const appendAssistantMessage = useCallback(
    async (content: string, meta?: any, explicitConvId?: string) => {
      const convId = explicitConvId || conversationId
      if (!convId) return { data: null, error: { message: '会話が選択されていません' } }
      const { data, error } = await addMessage(convId, 'assistant', content, meta)
      if (data) {
        setMessages(prev => [...prev, data])
      }
      return { data, error }
    },
    [conversationId]
  )

  const renameConversation = useCallback(
    async (title: string, convId?: string) => {
      const targetId = convId || conversationId
      if (!targetId) return
      await updateConversation(targetId, { title })
      await loadConversations()
    },
    [conversationId, loadConversations]
  )

  const archiveConversation = useCallback(
    async (convId: string) => {
      await updateConversation(convId, { archived: true })
      await loadConversations()
      if (conversationId === convId) {
        setConversationId(null)
        setMessages([])
        localStorage.removeItem('last_conv')
      }
    },
    [conversationId, loadConversations]
  )

  const removeConversation = useCallback(
    async (convId: string) => {
      await deleteConversation(convId)
      await loadConversations()
      if (conversationId === convId) {
        setConversationId(null)
        setMessages([])
        localStorage.removeItem('last_conv')
      }
    },
    [conversationId, loadConversations]
  )

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return []
    const demoSessionId = getDemoSessionId()
    const { data } = await searchConversations(q.trim(), demoSessionId)
    return data ?? []
  }, [])

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      if (!mounted) return

      try {
        await loadConversations()

        if (!mounted) return

        const last = initialConversationId || localStorage.getItem('last_conv')
        if (last) {
          await loadMessages(last)
        }
      } catch (err) {
        console.error('Failed to initialize chat:', err)
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [initialConversationId, loadConversations, loadMessages])

  return {
    conversationId,
    messages,
    conversations,
    loading,
    startNewConversation,
    loadMessages,
    sendUserMessage,
    appendAssistantMessage,
    renameConversation,
    archiveConversation,
    removeConversation,
    search
  }
}
