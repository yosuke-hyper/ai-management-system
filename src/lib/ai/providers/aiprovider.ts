import { AIMessage, AICompletionOptions, AICompletionResult } from '../types'

export interface AIProvider {
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string>

  completeWithMetadata(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>

  getName(): string

  isConfigured(): boolean
}
