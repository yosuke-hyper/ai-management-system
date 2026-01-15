import { AIProvider } from './providers/aiprovider'
import { OpenAIProvider } from './providers/openaiprovider'
import { AIMessage, AICompletionOptions, AICompletionResult } from './types'

export class AIService {
  private static instance: AIService | null = null
  private provider: AIProvider | null = null
  private usageCache: Map<string, number> = new Map()
  private requestCache: Map<string, { result: string; timestamp: number }> = new Map()
  private cacheTTL: number = 5 * 60 * 1000

  private constructor() {
    this.initializeProvider()
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  private initializeProvider(): void {
    const openAIKey = import.meta.env.VITE_OPENAI_API_KEY

    if (openAIKey) {
      this.provider = new OpenAIProvider(openAIKey)
    }
  }

  public setProvider(provider: AIProvider): void {
    this.provider = provider
  }

  public getProvider(): AIProvider | null {
    return this.provider
  }

  public isConfigured(): boolean {
    return this.provider !== null && this.provider.isConfigured()
  }

  public getProviderName(): string {
    return this.provider?.getName() || 'None'
  }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    if (!this.provider) {
      throw new Error('No AI provider configured')
    }

    if (!this.provider.isConfigured()) {
      throw new Error(`${this.provider.getName()} provider is not properly configured`)
    }

    const cacheKey = this.getCacheKey(messages, options)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    const result = await this.provider.complete(messages, options)

    this.setCache(cacheKey, result)

    return result
  }

  async completeWithMetadata(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    if (!this.provider) {
      throw new Error('No AI provider configured')
    }

    if (!this.provider.isConfigured()) {
      throw new Error(`${this.provider.getName()} provider is not properly configured`)
    }

    const result = await this.provider.completeWithMetadata(messages, options)

    if (result.usage) {
      this.trackUsage(result.usage.totalTokens)
    }

    return result
  }

  private getCacheKey(messages: AIMessage[], options?: AICompletionOptions): string {
    return JSON.stringify({ messages, options })
  }

  private getFromCache(key: string): string | null {
    const cached = this.requestCache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > this.cacheTTL) {
      this.requestCache.delete(key)
      return null
    }

    return cached.result
  }

  private setCache(key: string, result: string): void {
    this.requestCache.set(key, {
      result,
      timestamp: Date.now()
    })

    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value
      this.requestCache.delete(oldestKey)
    }
  }

  private trackUsage(tokens: number): void {
    const today = new Date().toISOString().split('T')[0]
    const currentUsage = this.usageCache.get(today) || 0
    this.usageCache.set(today, currentUsage + tokens)
  }

  public getUsageForDate(date: string): number {
    return this.usageCache.get(date) || 0
  }

  public getTodayUsage(): number {
    const today = new Date().toISOString().split('T')[0]
    return this.getUsageForDate(today)
  }

  public clearCache(): void {
    this.requestCache.clear()
  }

  public setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl
  }
}

export const aiService = AIService.getInstance()
