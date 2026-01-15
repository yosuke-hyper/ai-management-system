import { AIProvider } from './aiprovider'
import { AIMessage, AICompletionOptions, AICompletionResult } from '../types'

export class OpenAIProvider implements AIProvider {
  private apiKey: string
  private baseURL: string = 'https://api.openai.com/v1'
  private defaultModel: string = 'gpt-4o-mini'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  getName(): string {
    return 'OpenAI'
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    const result = await this.completeWithMetadata(messages, options)
    return result.content
  }

  async completeWithMetadata(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured')
    }

    const model = options?.model || this.defaultModel
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens

    const requestBody: any = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature
    }

    if (maxTokens) {
      requestBody.max_tokens = maxTokens
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        )
      }

      const data = await response.json()

      const content = data.choices?.[0]?.message?.content || ''
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          }
        : undefined

      return {
        content,
        usage,
        model: data.model,
        finishReason: data.choices?.[0]?.finish_reason
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API request failed: ${error.message}`)
      }
      throw error
    }
  }
}
