import { AIProvider } from './AIProvider.ts'
import { AIMessage, AICompletionOptions, AICompletionResult } from './types.ts'

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
        const errorText = await response.text().catch(() => '')
        let errorData: any = {}

        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || response.statusText }
        }

        const errorMessage = errorData.error?.message || errorData.message || response.statusText

        if (response.status === 401) {
          throw new Error('OpenAI APIキーが無効です。設定を確認してください。')
        } else if (response.status === 429) {
          throw new Error('API利用制限に達しました。しばらく待ってから再試行してください。')
        } else if (response.status === 500) {
          throw new Error('OpenAI APIサーバーでエラーが発生しました。')
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`)
      }

      const data = await response.json()

      const content = data.choices?.[0]?.message?.content || ''

      if (!content) {
        throw new Error('OpenAIからの応答が空です。')
      }

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
        throw error
      }
      throw new Error(`OpenAI API request failed: ${String(error)}`)
    }
  }
}