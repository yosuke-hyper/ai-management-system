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
} from '../services/chatArchive'

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
    const { data } = await listConversations()
    setConversations(data ?? [])
  }, [])

  const startNewConversation = useCallback(
    async (storeId: string = initialStoreId, title?: string) => {
      const { data, error } = await createConversation(userId, storeId, title)
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
        const { data, error: convError } = await startNewConversation(initialStoreId, '新しいチャット')
        conv = data?.id ?? null
        if (!conv || convError) {
          return { data: null, error: convError || { message: '会話の作成に失敗しました' } }
        }
      }

      const { data, error } = await addMessage(conv, 'user', content)
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
    async (title: string) => {
      if (!conversationId) return
      await updateConversation(conversationId, { title })
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
    const { data } = await searchConversations(q.trim())
    return data ?? []
  }, [])

  useEffect(() => {
    (async () => {
      await loadConversations()
      const last = initialConversationId || localStorage.getItem('last_conv')
      if (last) {
        await loadMessages(last)
      } else {
        await startNewConversation(initialStoreId, '新しいチャット')
      }
    })()
  }, [])

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
