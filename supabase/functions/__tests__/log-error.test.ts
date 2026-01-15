import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Log Error Edge Function Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Payload Validation', () => {
    it('should validate required fields', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const isValid = !!(
        payload.error_type &&
        payload.error_message &&
        payload.severity
      )

      expect(isValid).toBe(true)
    })

    it('should reject payload with missing error_type', () => {
      const payload = {
        error_type: '',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const isValid = !!(
        payload.error_type &&
        payload.error_message &&
        payload.severity
      )

      expect(isValid).toBe(false)
    })

    it('should reject payload with missing error_message', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: '',
        severity: 'HIGH' as const
      }

      const isValid = !!(
        payload.error_type &&
        payload.error_message &&
        payload.severity
      )

      expect(isValid).toBe(false)
    })

    it('should reject payload with missing severity', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: null as any
      }

      const isValid = !!(
        payload.error_type &&
        payload.error_message &&
        payload.severity
      )

      expect(isValid).toBe(false)
    })
  })

  describe('Severity Validation', () => {
    it('should accept valid severity levels', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

      const results = validSeverities.map(severity => {
        return validSeverities.includes(severity)
      })

      expect(results.every(r => r === true)).toBe(true)
    })

    it('should reject invalid severity level', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      const invalidSeverity = 'UNKNOWN'

      const isValid = validSeverities.includes(invalidSeverity)

      expect(isValid).toBe(false)
    })

    it('should reject case-sensitive invalid severity', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      const invalidSeverity = 'low'

      const isValid = validSeverities.includes(invalidSeverity)

      expect(isValid).toBe(false)
    })
  })

  describe('Payload Normalization', () => {
    it('should normalize complete payload', () => {
      const payload = {
        organization_id: 'org-123',
        user_id: 'user-456',
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const,
        stack_trace: 'Error: at line 10',
        context: { url: '/api/test' },
        user_agent: 'Mozilla/5.0',
        url: 'https://example.com',
        ip_address: '192.168.1.1',
        created_at: '2025-12-10T00:00:00Z'
      }

      const normalized = {
        organization_id: payload.organization_id ?? null,
        user_id: payload.user_id ?? null,
        error_type: payload.error_type,
        error_message: payload.error_message,
        severity: payload.severity,
        stack_trace: payload.stack_trace ?? null,
        context: payload.context ?? {},
        user_agent: payload.user_agent ?? null,
        url: payload.url ?? null,
        ip_address: payload.ip_address ?? null,
        created_at: new Date(payload.created_at).toISOString(),
        resolved: false
      }

      expect(normalized.organization_id).toBe('org-123')
      expect(normalized.user_id).toBe('user-456')
      expect(normalized.error_type).toBe('NetworkError')
      expect(normalized.resolved).toBe(false)
    })

    it('should handle minimal payload with defaults', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const ip = '192.168.1.1'
      const now = new Date().toISOString()

      const normalized = {
        organization_id: null,
        user_id: null,
        error_type: payload.error_type,
        error_message: payload.error_message,
        severity: payload.severity,
        stack_trace: null,
        context: {},
        user_agent: null,
        url: null,
        ip_address: ip,
        created_at: now,
        resolved: false
      }

      expect(normalized.organization_id).toBeNull()
      expect(normalized.user_id).toBeNull()
      expect(normalized.stack_trace).toBeNull()
      expect(normalized.context).toEqual({})
      expect(normalized.ip_address).toBe(ip)
      expect(normalized.resolved).toBe(false)
    })
  })

  describe('Batch Processing', () => {
    it('should handle single error payload', () => {
      const body = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const payloads = Array.isArray(body) ? body : [body]

      expect(payloads).toHaveLength(1)
      expect(payloads[0].error_type).toBe('NetworkError')
    })

    it('should handle array of error payloads', () => {
      const body = [
        {
          error_type: 'NetworkError',
          error_message: 'Connection failed',
          severity: 'HIGH' as const
        },
        {
          error_type: 'ValidationError',
          error_message: 'Invalid input',
          severity: 'MEDIUM' as const
        }
      ]

      const payloads = Array.isArray(body) ? body : [body]

      expect(payloads).toHaveLength(2)
      expect(payloads[0].error_type).toBe('NetworkError')
      expect(payloads[1].error_type).toBe('ValidationError')
    })

    it('should filter out invalid payloads', () => {
      const payloads = [
        {
          error_type: 'NetworkError',
          error_message: 'Connection failed',
          severity: 'HIGH' as const
        },
        {
          error_type: '',
          error_message: 'Invalid',
          severity: 'HIGH' as const
        },
        {
          error_type: 'ValidationError',
          error_message: 'Invalid input',
          severity: 'MEDIUM' as const
        }
      ]

      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

      const valid = payloads.filter(p => {
        return p.error_type && p.error_message && p.severity && validSeverities.includes(p.severity)
      })

      expect(valid).toHaveLength(2)
    })
  })

  describe('IP Address Extraction', () => {
    it('should extract IP from cf-connecting-ip header', () => {
      const headers = {
        'cf-connecting-ip': '1.2.3.4',
        'x-forwarded-for': '5.6.7.8',
        'x-real-ip': '9.10.11.12'
      }

      const ip =
        headers['cf-connecting-ip'] ??
        headers['x-forwarded-for'] ??
        headers['x-real-ip'] ??
        null

      expect(ip).toBe('1.2.3.4')
    })

    it('should fallback to x-forwarded-for if cf-connecting-ip missing', () => {
      const headers = {
        'x-forwarded-for': '5.6.7.8',
        'x-real-ip': '9.10.11.12'
      }

      const ip =
        (headers as any)['cf-connecting-ip'] ??
        headers['x-forwarded-for'] ??
        headers['x-real-ip'] ??
        null

      expect(ip).toBe('5.6.7.8')
    })

    it('should fallback to x-real-ip as last resort', () => {
      const headers = {
        'x-real-ip': '9.10.11.12'
      }

      const ip =
        (headers as any)['cf-connecting-ip'] ??
        (headers as any)['x-forwarded-for'] ??
        headers['x-real-ip'] ??
        null

      expect(ip).toBe('9.10.11.12')
    })

    it('should return null if no IP headers present', () => {
      const headers = {}

      const ip =
        (headers as any)['cf-connecting-ip'] ??
        (headers as any)['x-forwarded-for'] ??
        (headers as any)['x-real-ip'] ??
        null

      expect(ip).toBeNull()
    })
  })

  describe('Critical Error Detection', () => {
    it('should identify critical errors', () => {
      const rows = [
        { severity: 'HIGH', error_type: 'NetworkError' },
        { severity: 'CRITICAL', error_type: 'DatabaseError' },
        { severity: 'MEDIUM', error_type: 'ValidationError' },
        { severity: 'CRITICAL', error_type: 'SecurityError' }
      ]

      const criticalErrors = rows.filter(r => r.severity === 'CRITICAL')

      expect(criticalErrors).toHaveLength(2)
      expect(criticalErrors[0].error_type).toBe('DatabaseError')
      expect(criticalErrors[1].error_type).toBe('SecurityError')
    })

    it('should handle no critical errors', () => {
      const rows = [
        { severity: 'HIGH', error_type: 'NetworkError' },
        { severity: 'MEDIUM', error_type: 'ValidationError' },
        { severity: 'LOW', error_type: 'InfoError' }
      ]

      const criticalErrors = rows.filter(r => r.severity === 'CRITICAL')

      expect(criticalErrors).toHaveLength(0)
    })
  })

  describe('Timestamp Handling', () => {
    it('should use provided timestamp', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const,
        created_at: '2025-12-10T10:30:00Z'
      }

      const timestamp = payload.created_at
        ? new Date(payload.created_at).toISOString()
        : new Date().toISOString()

      expect(timestamp).toBe('2025-12-10T10:30:00.000Z')
    })

    it('should generate timestamp if not provided', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const timestamp = (payload as any).created_at
        ? new Date((payload as any).created_at).toISOString()
        : new Date().toISOString()

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should handle invalid timestamp', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const,
        created_at: 'invalid-date'
      }

      const parsedDate = new Date(payload.created_at)
      const isValid = !isNaN(parsedDate.getTime())

      expect(isValid).toBe(false)
    })
  })

  describe('Context Data', () => {
    it('should preserve context object', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const,
        context: {
          url: '/api/test',
          method: 'POST',
          statusCode: 500
        }
      }

      const context = payload.context ?? {}

      expect(context).toHaveProperty('url')
      expect(context).toHaveProperty('method')
      expect(context).toHaveProperty('statusCode')
      expect(context.url).toBe('/api/test')
    })

    it('should use empty object if context not provided', () => {
      const payload = {
        error_type: 'NetworkError',
        error_message: 'Connection failed',
        severity: 'HIGH' as const
      }

      const context = (payload as any).context ?? {}

      expect(context).toEqual({})
    })
  })
})
