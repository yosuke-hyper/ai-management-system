import { supabase, isSupabaseReady } from '../lib/supabase'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface Conversation {
  id: string
  user_id: string
  demo_session_id?: string | null
  store_id?: string | null
  title?: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: ChatRole
  content: string
  tokens?: number | null
  meta?: any
  created_at: string
}

const LS_CONV = 'ai_conversations'
const LS_MSG = 'ai_messages'
const useMock = () => !isSupabaseReady()

const readLS = <T>(k: string, def: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? def
  } catch {
    return def
  }
}

const writeLS = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v))

export async function createConversation(
  userId: string,
  storeId?: string,
  title?: string,
  demoSessionId?: string | null
) {
  if (useMock()) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const conv: Conversation = {
      id,
      user_id: userId,
      store_id: storeId ?? 'all',
      title: title ?? '新しいチャット',
      archived: false,
      created_at: now,
      updated_at: now
    }
    const list = readLS<Conversation[]>(LS_CONV, [])
    list.unshift(conv)
    writeLS(LS_CONV, list)
    return { data: conv, error: null }
  }

  console.log('🆕 Creating conversation:', { userId, storeId, title, demoSessionId })

  // For demo users, set demo_session_id and leave user_id null
  // For authenticated users, set user_id and leave demo_session_id null
  const insertData: any = {
    store_id: storeId ?? 'all',
    title: title ?? '新しいチャット'
  }

  if (demoSessionId) {
    insertData.demo_session_id = demoSessionId
    insertData.user_id = null
  } else {
    insertData.user_id = userId
    insertData.demo_session_id = null
  }

  console.log('📝 Insert data:', insertData)

  try {
    const { data, error } = await supabase!
      .from('ai_conversations')
      .insert(insertData)
      .select()
      .single()

    console.log('✅ Conversation result:', { data, error })

    if (error) {
      console.error('Error creating conversation:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception in createConversation:', err)
    return { data: null, error: err as any }
  }
}

export async function listConversations({ archived = false, demoSessionId }: { archived?: boolean; demoSessionId?: string | null } = {}) {
  if (useMock()) {
    const all = readLS<Conversation[]>(LS_CONV, [])
    return {
      data: all
        .filter(c => c.archived === archived)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      error: null
    }
  }

  try {
    let query = supabase!
      .from('ai_conversations')
      .select('*')
      .eq('archived', archived)

    if (demoSessionId) {
      query = query.eq('demo_session_id', demoSessionId)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error listing conversations:', error)
      return { data: [], error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception in listConversations:', err)
    return { data: [], error: err as any }
  }
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<Conversation, 'title' | 'archived'>>
) {
  if (useMock()) {
    const all = readLS<Conversation[]>(LS_CONV, [])
    const idx = all.findIndex(c => c.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() }
      writeLS(LS_CONV, all)
      return { data: all[idx], error: null }
    }
    return { data: null, error: { message: 'not found' } as any }
  }

  const { data, error } = await supabase!
    .from('ai_conversations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function fetchMessages(conversationId: string) {
  if (useMock()) {
    const all = readLS<Message[]>(LS_MSG, [])
    return {
      data: all
        .filter(m => m.conversation_id === conversationId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      error: null
    }
  }

  try {
    const { data, error } = await supabase!
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return { data: [], error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception in fetchMessages:', err)
    return { data: [], error: err as any }
  }
}

export async function addMessage(
  conversationId: string,
  role: ChatRole,
  content: string,
  meta?: any
) {
  if (useMock()) {
    const now = new Date().toISOString()
    const msg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role,
      content,
      meta,
      created_at: now
    }
    const msgs = readLS<Message[]>(LS_MSG, [])
    msgs.push(msg)
    writeLS(LS_MSG, msgs)

    const convs = readLS<Conversation[]>(LS_CONV, [])
    const i = convs.findIndex(c => c.id === conversationId)
    if (i >= 0) {
      convs[i].updated_at = now
      writeLS(LS_CONV, convs)
    }
    return { data: msg, error: null }
  }

  console.log('💬 Adding message:', { conversationId, role, contentLength: content.length })

  // First verify the conversation exists and check its demo_session_id
  const { data: conv, error: convError } = await supabase!
    .from('ai_conversations')
    .select('id, demo_session_id, user_id')
    .eq('id', conversationId)
    .maybeSingle()

  console.log('🔍 Conversation check:', { conv, convError })

  const { data, error } = await supabase!
    .from('ai_messages')
    .insert({ conversation_id: conversationId, role, content, meta })
    .select()
    .single()

  console.log('📝 Message insert result:', { data, error })

  if (!error) {
    await supabase!
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  return { data, error }
}

export async function searchConversations(q: string, demoSessionId?: string | null) {
  if (useMock()) {
    const msgs = readLS<Message[]>(LS_MSG, [])
    const convs = readLS<Conversation[]>(LS_CONV, [])
    const hits = msgs
      .filter(m => m.content.toLowerCase().includes(q.toLowerCase()))
      .map(m => ({
        conversation_id: m.conversation_id,
        snippet: m.content.slice(0, 160),
        created_at: m.created_at
      }))

    return {
      data: hits.map(h => ({
        ...h,
        title: convs.find(c => c.id === h.conversation_id)?.title ?? '（無題）'
      })),
      error: null
    }
  }

  try {
    const { data, error } = await supabase!.rpc('ai_search_messages', {
      q,
      p_demo_session_id: demoSessionId
    })

    if (error) {
      console.error('Error searching conversations:', error)
      return { data: [], error }
    }

    const convIds = [...new Set(data?.map((d: any) => d.conversation_id) ?? [])]

    if (convIds.length === 0) {
      return { data: [], error: null }
    }

    const { data: convs } = await supabase!
      .from('ai_conversations')
      .select('id, title')
      .in('id', convIds)

    const results = data?.map((d: any) => ({
      ...d,
      title: convs?.find((c: any) => c.id === d.conversation_id)?.title ?? '（無題）'
    }))

    return { data: results || [], error: null }
  } catch (err) {
    console.error('Exception in searchConversations:', err)
    return { data: [], error: err as any }
  }
}

export async function deleteConversation(id: string) {
  if (useMock()) {
    const all = readLS<Conversation[]>(LS_CONV, [])
    const filtered = all.filter(c => c.id !== id)
    writeLS(LS_CONV, filtered)

    const msgs = readLS<Message[]>(LS_MSG, [])
    const filteredMsgs = msgs.filter(m => m.conversation_id !== id)
    writeLS(LS_MSG, filteredMsgs)

    return { error: null }
  }

  const { error } = await supabase!
    .from('ai_conversations')
    .delete()
    .eq('id', id)

  return { error }
}
