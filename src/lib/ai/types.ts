export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  temperature?: number
  maxTokens?: number
  model?: string
  stream?: boolean
}

export interface AIUsageStats {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AICompletionResult {
  content: string
  usage?: AIUsageStats
  model?: string
  finishReason?: string
}
