import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logError } from '../errorlogger'
import { AppError, ErrorType, ErrorSeverity } from '@/lib/errors'

// Mock global fetch
global.fetch = vi.fn()

describe('errorLogger', () => {
  let mockConsoleError: any
  let mockConsoleWarn: any
  let mockConsoleLog: any

  beforeEach(() => {
    // Set up console mocks fresh for each test
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Reset fetch mock
    ;(global.fetch as any).mockReset()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    // Mock navigator.sendBeacon to return false (force fetch fallback)
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn(() => false),
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logError', () => {
    it('should log AppError with HIGH severity to console.error', async () => {
      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH)

      await logError(error, { userId: 'user-123', organizationId: 'org-123' })

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', expect.any(Object))
    })

    it('should log AppError with CRITICAL severity to console.error', async () => {
      const error = new AppError('Critical error', ErrorType.DATABASE, ErrorSeverity.CRITICAL)

      await logError(error)

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR]', expect.any(Object))
    })

    it('should log AppError with MEDIUM severity to console.warn', async () => {
      const error = new AppError('Medium error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)

      await logError(error)

      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARNING]', expect.any(Object))
    })

    it('should not log LOW severity operational errors', async () => {
      const error = new AppError('Low error', ErrorType.VALIDATION, ErrorSeverity.LOW, {
        isOperational: true
      })

      // Clear previous mock calls
      mockConsoleError.mockClear()
      mockConsoleWarn.mockClear()
      ;(global.fetch as any).mockClear()

      await logError(error)

      expect(mockConsoleError).not.toHaveBeenCalled()
      expect(mockConsoleWarn).not.toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should send error to Edge Function', async () => {
      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH)

      await logError(error, { userId: 'user-123', organizationId: 'org-123' })

      expect(global.fetch).toHaveBeenCalled()
      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toContain('/functions/v1/log-error')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
    })

    it('should include error context in payload', async () => {
      const error = new AppError('Validation error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM, {
        context: { field: 'email', value: 'invalid' }
      })

      await logError(error, { userId: 'user-123' })

      expect(global.fetch).toHaveBeenCalled()
      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.context).toBeDefined()
      // Context contains the original context plus userMessage and isOperational
      expect(payload.context.field).toBe('email')
      expect(payload.context.value).toBe('invalid')
      expect(payload.context.userMessage).toBeDefined()
      expect(payload.context.isOperational).toBeDefined()
    })

    it('should include userId when provided', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)

      await logError(error, { userId: 'user-123' })

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.user_id).toBe('user-123')
    })

    it('should include organizationId when provided', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)

      await logError(error, { organizationId: 'org-123' })

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.organization_id).toBe('org-123')
    })

    it('should handle fetch errors gracefully', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(logError(error)).resolves.not.toThrow()
    })

    it('should include timestamp in payload', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
      await logError(error)

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.created_at).toBeDefined()
      expect(typeof payload.created_at).toBe('string')
    })

    it('should include error type and message', async () => {
      const error = new AppError('Test error message', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
      await logError(error)

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.error_type).toBe(ErrorType.VALIDATION)
      expect(payload.error_message).toBe('Test error message')
    })
  })

  describe('error types', () => {
    it('should log AUTHENTICATION errors', async () => {
      const error = new AppError('Auth error', ErrorType.AUTHENTICATION, ErrorSeverity.HIGH)

      await logError(error)

      expect(mockConsoleError).toHaveBeenCalled()
      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.error_type).toBe(ErrorType.AUTHENTICATION)
    })

    it('should log NETWORK errors', async () => {
      const error = new AppError('Network error', ErrorType.NETWORK, ErrorSeverity.MEDIUM)

      await logError(error)

      expect(mockConsoleWarn).toHaveBeenCalled()
      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.error_type).toBe(ErrorType.NETWORK)
    })

    it('should log DATABASE errors', async () => {
      const error = new AppError('DB error', ErrorType.DATABASE, ErrorSeverity.CRITICAL)

      await logError(error)

      expect(mockConsoleError).toHaveBeenCalled()
      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.error_type).toBe(ErrorType.DATABASE)
    })

    it('should log VALIDATION errors', async () => {
      const error = new AppError('Validation error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)

      await logError(error)

      expect(mockConsoleWarn).toHaveBeenCalled()
      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.error_type).toBe(ErrorType.VALIDATION)
    })
  })

  describe('payload structure', () => {
    it('should include all required fields in payload', async () => {
      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH, {
        context: { key: 'value' }
      })

      await logError(error, { userId: 'user-123', organizationId: 'org-123' })

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)

      // Required fields
      expect(payload).toHaveProperty('error_type')
      expect(payload).toHaveProperty('error_message')
      expect(payload).toHaveProperty('severity')
      expect(payload).toHaveProperty('created_at')

      // Optional but included fields
      expect(payload).toHaveProperty('user_id')
      expect(payload).toHaveProperty('organization_id')
      expect(payload).toHaveProperty('context')
      expect(payload).toHaveProperty('stack_trace')
    })

    it('should include severity in payload', async () => {
      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH)

      await logError(error)

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.severity).toBe(ErrorSeverity.HIGH)
    })

    it('should include user agent when available', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
      await logError(error)

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(payload.user_agent).toBeDefined()
    })

    it('should include URL when available', async () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
      await logError(error)

      const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      // In test environment, window.location.href exists
      expect(payload.url).toBeDefined()
      expect(typeof payload.url).toBe('string')
    })
  })

  describe('sendBeacon fallback', () => {
    it('should use fetch when sendBeacon is not available', async () => {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: undefined,
        writable: true,
        configurable: true
      })

      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH)
      await logError(error)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should use fetch when sendBeacon fails', async () => {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: vi.fn(() => false),
        writable: true,
        configurable: true
      })

      const error = new AppError('Test error', ErrorType.DATABASE, ErrorSeverity.HIGH)
      await logError(error)

      expect(global.fetch).toHaveBeenCalled()
    })
  })
})
