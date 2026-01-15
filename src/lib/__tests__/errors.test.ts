import { describe, it, expect } from 'vitest'
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  BusinessLogicError,
  QuotaExceededError,
  NetworkError,
  ExternalServiceError,
  isAppError,
  toAppError,
  shouldLogError,
  shouldShowToUser,
  isRetryable
} from '../errors'

describe('ErrorType enum', () => {
  it('should have all defined error types', () => {
    expect(ErrorType.AUTHENTICATION).toBe('AUTHENTICATION')
    expect(ErrorType.AUTHORIZATION).toBe('AUTHORIZATION')
    expect(ErrorType.DATABASE).toBe('DATABASE')
    expect(ErrorType.VALIDATION).toBe('VALIDATION')
    expect(ErrorType.NETWORK).toBe('NETWORK')
    expect(ErrorType.UNKNOWN).toBe('UNKNOWN')
  })
})

describe('ErrorSeverity enum', () => {
  it('should have all severity levels', () => {
    expect(ErrorSeverity.LOW).toBe('LOW')
    expect(ErrorSeverity.MEDIUM).toBe('MEDIUM')
    expect(ErrorSeverity.HIGH).toBe('HIGH')
    expect(ErrorSeverity.CRITICAL).toBe('CRITICAL')
  })
})

describe('AppError', () => {
  describe('constructor', () => {
    it('should create AppError with required parameters', () => {
      const error = new AppError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ErrorType.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.name).toBe('AppError')
      expect(error instanceof Error).toBe(true)
      expect(error.isOperational).toBe(true)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create AppError with type and severity', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.LOW)

      expect(error.message).toBe('Test error')
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.severity).toBe(ErrorSeverity.LOW)
    })

    it('should accept options', () => {
      const context = { field: 'email' }
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.LOW, {
        isOperational: false,
        context,
        userMessage: 'カスタムメッセージ'
      })

      expect(error.isOperational).toBe(false)
      expect(error.context).toEqual(context)
      expect(error.userMessage).toBe('カスタムメッセージ')
    })

    it('should generate default user message', () => {
      const validationError = new AppError('Test', ErrorType.VALIDATION)
      expect(validationError.userMessage).toContain('入力内容')

      const authError = new AppError('Test', ErrorType.AUTHENTICATION)
      expect(authError.userMessage).toContain('ログイン')

      const networkError = new AppError('Test', ErrorType.NETWORK)
      expect(networkError.userMessage).toContain('ネットワーク')
    })

    it('should have stack trace', () => {
      const error = new AppError('Test error')
      expect(error.stack).toBeDefined()
    })
  })

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.LOW, {
        context: { field: 'email' }
      })

      const json = error.toJSON()

      expect(json).toHaveProperty('name')
      expect(json).toHaveProperty('message')
      expect(json).toHaveProperty('type')
      expect(json).toHaveProperty('severity')
      expect(json).toHaveProperty('userMessage')
      expect(json).toHaveProperty('timestamp')
      expect(json).toHaveProperty('context')
      expect(json).toHaveProperty('stack')
      expect(json.context).toEqual({ field: 'email' })
    })
  })
})

describe('AuthenticationError', () => {
  it('should create authentication error with defaults', () => {
    const error = new AuthenticationError()

    expect(error.type).toBe(ErrorType.AUTHENTICATION)
    expect(error.severity).toBe(ErrorSeverity.HIGH)
    expect(error.isOperational).toBe(true)
    expect(error.userMessage).toContain('ログイン')
  })

  it('should accept custom message and context', () => {
    const error = new AuthenticationError('Token expired', { token: 'abc' })

    expect(error.message).toBe('Token expired')
    expect(error.context).toEqual({ token: 'abc' })
  })
})

describe('AuthorizationError', () => {
  it('should create authorization error with defaults', () => {
    const error = new AuthorizationError()

    expect(error.type).toBe(ErrorType.AUTHORIZATION)
    expect(error.severity).toBe(ErrorSeverity.MEDIUM)
    expect(error.isOperational).toBe(true)
    expect(error.userMessage).toContain('権限')
  })
})

describe('ValidationError', () => {
  it('should create validation error', () => {
    const fields = { email: 'invalid', age: 'too young' }
    const error = new ValidationError('Validation failed', fields)

    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.fields).toEqual(fields)
    expect(error.context).toHaveProperty('fields')
    expect(error.userMessage).toContain('入力内容')
  })
})

describe('DatabaseError', () => {
  it('should create database error', () => {
    const error = new DatabaseError('Connection failed')

    expect(error.type).toBe(ErrorType.DATABASE)
    expect(error.severity).toBe(ErrorSeverity.HIGH)
    expect(error.isOperational).toBe(false)
    expect(error.userMessage).toContain('データベース')
    expect(error.userMessage).toContain('しばらく')
  })
})

describe('NotFoundError', () => {
  it('should create not found error', () => {
    const error = new NotFoundError('User', '123')

    expect(error.type).toBe(ErrorType.NOT_FOUND)
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.message).toContain('User')
    expect(error.message).toContain('123')
    expect(error.context).toHaveProperty('resource')
    expect(error.context).toHaveProperty('id')
  })

  it('should create not found error without ID', () => {
    const error = new NotFoundError('User')

    expect(error.message).toContain('User')
    expect(error.message).not.toContain('ID')
  })
})

describe('BusinessLogicError', () => {
  it('should create business logic error', () => {
    const error = new BusinessLogicError('Cannot process', 'カスタムメッセージ')

    expect(error.type).toBe(ErrorType.BUSINESS_LOGIC)
    expect(error.severity).toBe(ErrorSeverity.MEDIUM)
    expect(error.userMessage).toBe('カスタムメッセージ')
  })
})

describe('QuotaExceededError', () => {
  it('should create quota exceeded error', () => {
    const error = new QuotaExceededError('API calls', 100, 100)

    expect(error.type).toBe(ErrorType.QUOTA_EXCEEDED)
    expect(error.severity).toBe(ErrorSeverity.MEDIUM)
    expect(error.message).toContain('100')
    expect(error.userMessage).toContain('上限')
    expect(error.context?.limit).toBe(100)
    expect(error.context?.current).toBe(100)
  })
})

describe('NetworkError', () => {
  it('should create network error', () => {
    const error = new NetworkError()

    expect(error.type).toBe(ErrorType.NETWORK)
    expect(error.severity).toBe(ErrorSeverity.MEDIUM)
    expect(error.userMessage).toContain('ネットワーク')
  })
})

describe('ExternalServiceError', () => {
  it('should create external service error', () => {
    const error = new ExternalServiceError('OpenAI', 'API timeout')

    expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE)
    expect(error.severity).toBe(ErrorSeverity.HIGH)
    expect(error.message).toContain('OpenAI')
    expect(error.message).toContain('API timeout')
    expect(error.context?.service).toBe('OpenAI')
  })
})

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError('Test')
    expect(isAppError(error)).toBe(true)

    const authError = new AuthenticationError()
    expect(isAppError(authError)).toBe(true)
  })

  it('should return false for non-AppError', () => {
    expect(isAppError(new Error('Test'))).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
  })
})

describe('toAppError', () => {
  it('should return AppError as is', () => {
    const error = new AppError('Test')
    const result = toAppError(error)

    expect(result).toBe(error)
  })

  it('should convert standard Error to AppError', () => {
    const error = new Error('Test error')
    const result = toAppError(error)

    expect(result).toBeInstanceOf(AppError)
    expect(result.type).toBe(ErrorType.UNKNOWN)
    expect(result.message).toBe('Test error')
  })

  it('should convert string to AppError', () => {
    const result = toAppError('Error message')

    expect(result).toBeInstanceOf(AppError)
    expect(result.type).toBe(ErrorType.UNKNOWN)
    expect(result.message).toBe('Error message')
  })

  it('should handle Supabase errors with code', () => {
    const error = {
      name: 'Error',
      message: 'Auth error',
      code: '401',
      stack: ''
    }
    const result = toAppError(error)

    expect(result).toBeInstanceOf(AppError)
  })

  it('should handle null and undefined', () => {
    const nullResult = toAppError(null)
    expect(nullResult).toBeInstanceOf(AppError)

    const undefinedResult = toAppError(undefined)
    expect(undefinedResult).toBeInstanceOf(AppError)
  })
})

describe('shouldLogError', () => {
  it('should log high severity errors', () => {
    const error = new AppError('Test', ErrorType.UNKNOWN, ErrorSeverity.HIGH)
    expect(shouldLogError(error)).toBe(true)
  })

  it('should log critical errors', () => {
    const error = new AppError('Test', ErrorType.DATABASE, ErrorSeverity.CRITICAL)
    expect(shouldLogError(error)).toBe(true)
  })

  it('should not log operational low severity errors', () => {
    const error = new AppError('Test', ErrorType.VALIDATION, ErrorSeverity.LOW, {
      isOperational: true
    })
    expect(shouldLogError(error)).toBe(false)
  })

  it('should log non-operational low severity errors', () => {
    const error = new AppError('Test', ErrorType.UNKNOWN, ErrorSeverity.LOW, {
      isOperational: false
    })
    expect(shouldLogError(error)).toBe(true)
  })
})

describe('shouldShowToUser', () => {
  it('should show operational errors to user', () => {
    const error = new AppError('Test', ErrorType.VALIDATION, ErrorSeverity.LOW, {
      isOperational: true
    })
    expect(shouldShowToUser(error)).toBe(true)
  })

  it('should not show non-operational errors to user', () => {
    const error = new AppError('Test', ErrorType.INTERNAL, ErrorSeverity.CRITICAL, {
      isOperational: false
    })
    expect(shouldShowToUser(error)).toBe(false)
  })
})

describe('isRetryable', () => {
  it('should return true for network errors', () => {
    const error = new NetworkError()
    expect(isRetryable(error)).toBe(true)
  })

  it('should return true for timeout errors', () => {
    const error = new AppError('Timeout', ErrorType.TIMEOUT)
    expect(isRetryable(error)).toBe(true)
  })

  it('should return true for service unavailable', () => {
    const error = new AppError('Service down', ErrorType.SERVICE_UNAVAILABLE)
    expect(isRetryable(error)).toBe(true)
  })

  it('should return true for external service errors', () => {
    const error = new ExternalServiceError('API', 'Failed')
    expect(isRetryable(error)).toBe(true)
  })

  it('should return false for validation errors', () => {
    const error = new ValidationError()
    expect(isRetryable(error)).toBe(false)
  })

  it('should return false for authentication errors', () => {
    const error = new AuthenticationError()
    expect(isRetryable(error)).toBe(false)
  })
})
