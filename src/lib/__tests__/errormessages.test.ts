import { describe, it, expect } from 'vitest'
import { translateSupabaseError, translateOpenAIError, getErrorMessage } from '../errormessages'

describe('errorMessages', () => {
  describe('translateSupabaseError', () => {
    it('should translate Invalid login credentials', () => {
      const error = { message: 'Invalid login credentials' }
      const result = translateSupabaseError(error)

      expect(result).toBe('メールアドレスまたはパスワードが正しくありません')
    })

    it('should translate Email not confirmed', () => {
      const error = { message: 'Email not confirmed' }
      const result = translateSupabaseError(error)

      expect(result).toContain('確認')
    })

    it('should translate User already registered', () => {
      const error = { message: 'User already registered' }
      const result = translateSupabaseError(error)

      expect(result).toContain('既に登録')
    })

    it('should translate password length error', () => {
      const error = { message: 'Password should be at least 8 characters' }
      const result = translateSupabaseError(error)

      expect(result).toContain('8文字以上')
    })

    it('should translate email validation error', () => {
      const error = { message: 'Unable to validate email address' }
      const result = translateSupabaseError(error)

      expect(result).toContain('有効なメールアドレス')
    })

    it('should translate RLS error', () => {
      const error = { message: 'row-level security policy violation' }
      const result = translateSupabaseError(error)

      expect(result).toContain('権限')
      expect(result).toContain('管理者')
    })

    it('should translate network error', () => {
      const error = { message: 'Failed to fetch' }
      const result = translateSupabaseError(error)

      expect(result).toContain('ネットワークエラー')
    })

    it('should translate foreign key constraint error', () => {
      const error = { message: 'violates foreign key constraint' }
      const result = translateSupabaseError(error)

      expect(result).toContain('関連するデータ')
    })

    it('should translate unique constraint error', () => {
      const error = { message: 'duplicate key value violates unique constraint' }
      const result = translateSupabaseError(error)

      expect(result).toContain('既に登録')
    })

    it('should translate not null violation', () => {
      const error = { message: 'null value in column violates not-null constraint' }
      const result = translateSupabaseError(error)

      expect(result).toContain('必須項目')
    })

    it('should return default message for unknown errors', () => {
      const error = { message: 'Some unknown error' }
      const result = translateSupabaseError(error)

      expect(result).toBe('Some unknown error')
    })

    it('should handle null error', () => {
      const result = translateSupabaseError(null)

      expect(result).toContain('不明なエラー')
    })

    it('should handle undefined error', () => {
      const result = translateSupabaseError(undefined)

      expect(result).toContain('不明なエラー')
    })
  })

  describe('translateOpenAIError', () => {
    it('should translate 401 error', () => {
      const result = translateOpenAIError(401)

      expect(result).toContain('APIキー')
      expect(result).toContain('管理者')
    })

    it('should translate 429 error', () => {
      const result = translateOpenAIError(429)

      expect(result).toContain('制限')
      expect(result).toContain('しばらく')
    })

    it('should translate 500 error', () => {
      const result = translateOpenAIError(500)

      expect(result).toContain('サーバー')
      expect(result).toContain('時間をおいて')
    })

    it('should translate 502 error', () => {
      const result = translateOpenAIError(502)

      expect(result).toContain('サーバー')
    })

    it('should translate 503 error', () => {
      const result = translateOpenAIError(503)

      expect(result).toContain('サーバー')
    })

    it('should use custom message when provided', () => {
      const customMessage = 'カスタムエラー'
      const result = translateOpenAIError(400, customMessage)

      expect(result).toBe(customMessage)
    })

    it('should return default message for unknown status', () => {
      const result = translateOpenAIError(418)

      expect(result).toContain('ChatGPT API')
    })
  })

  describe('getErrorMessage', () => {
    it('should handle string errors', () => {
      const result = getErrorMessage('Simple error message')

      expect(result).toBe('Simple error message')
    })

    it('should handle Error objects with message', () => {
      const error = new Error('Invalid login credentials')
      const result = getErrorMessage(error)

      expect(result).toContain('メールアドレス')
    })

    it('should handle objects with message property', () => {
      const error = { message: 'Failed to fetch' }
      const result = getErrorMessage(error)

      expect(result).toContain('ネットワークエラー')
    })

    it('should handle PostgrestError format', () => {
      const error = {
        code: '23505',
        message: 'duplicate key',
        details: 'Key already exists'
      }
      const result = getErrorMessage(error)

      expect(result).toContain('既に登録')
    })

    it('should return default message for unknown error types', () => {
      const result = getErrorMessage(null)

      expect(result).toContain('予期しないエラー')
    })

    it('should handle undefined', () => {
      const result = getErrorMessage(undefined)

      expect(result).toContain('予期しないエラー')
    })

    it('should handle numbers', () => {
      const result = getErrorMessage(404)

      expect(result).toContain('予期しないエラー')
    })

    it('should handle boolean', () => {
      const result = getErrorMessage(false)

      expect(result).toContain('予期しないエラー')
    })
  })

  describe('message quality', () => {
    it('should return user-friendly Japanese messages', () => {
      const errors = [
        { message: 'Invalid login credentials' },
        { message: 'Email not confirmed' },
        { message: 'User already registered' }
      ]

      errors.forEach(error => {
        const result = translateSupabaseError(error)
        expect(result.length).toBeGreaterThan(5)
        expect(result).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)
      })
    })

    it('should provide actionable messages', () => {
      const error = { message: 'Password should be at least 8 characters' }
      const result = translateSupabaseError(error)

      expect(result).toContain('8文字以上')
    })

    it('should use polite Japanese language', () => {
      const error = { message: 'Unable to validate email address' }
      const result = translateSupabaseError(error)

      expect(result).toMatch(/ください|してください|お/)
    })
  })

  describe('consistency', () => {
    it('should consistently translate the same error', () => {
      const error = { message: 'Failed to fetch' }

      const result1 = translateSupabaseError(error)
      const result2 = translateSupabaseError(error)

      expect(result1).toBe(result2)
    })

    it('should not modify input error object', () => {
      const error = { message: 'Test error' }
      const originalMessage = error.message

      translateSupabaseError(error)

      expect(error.message).toBe(originalMessage)
    })
  })

  describe('edge cases', () => {
    it('should handle error with empty message', () => {
      const error = { message: '' }
      const result = translateSupabaseError(error)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle error without message property', () => {
      const error = { code: '500' }
      const result = translateSupabaseError(error)

      expect(typeof result).toBe('string')
    })

    it('should handle circular references gracefully', () => {
      const error: any = { message: 'Test' }
      error.self = error

      expect(() => translateSupabaseError(error)).not.toThrow()
    })
  })
})
