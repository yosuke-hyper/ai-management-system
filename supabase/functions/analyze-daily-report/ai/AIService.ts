import { AIProvider } from './AIProvider.ts'
import { AIMessage, AICompletionOptions, AICompletionResult } from './types.ts'

export class AIService {
  private provider: AIProvider | null = null

  constructor(provider?: AIProvider) {
    if (provider) {
      this.provider = provider
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

    return await this.provider.complete(messages, options)
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

    return await this.provider.completeWithMetadata(messages, options)
  }
}