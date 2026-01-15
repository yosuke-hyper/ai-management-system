import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, getDailyReports, createDailyReport, getSummaryData } from '../api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('healthCheck', () => {
    it('should make health check request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'healthy' })
      })

      const result = await apiClient.healthCheck()

      expect(result).toEqual({ status: 'healthy' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      )
    })

    it('should handle 404 gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await apiClient.healthCheck()

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await apiClient.healthCheck()

      expect(result).toBeNull()
    })
  })

  describe('getReports', () => {
    it('should fetch reports without date parameters', async () => {
      const mockReports = [
        { id: '1', date: '2025-12-01', sales: 100000 },
        { id: '2', date: '2025-12-02', sales: 150000 }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockReports
      })

      const result = await apiClient.getReports()

      expect(result).toEqual(mockReports)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports'),
        expect.any(Object)
      )
    })

    it('should fetch reports with date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })

      await apiClient.getReports('2025-12-01', '2025-12-31')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2025-12-01'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('end_date=2025-12-31'),
        expect.any(Object)
      )
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await apiClient.getReports()

      expect(result).toBeNull()
    })
  })

  describe('createReport', () => {
    const mockReportData = {
      date: '2025-12-01',
      storeName: 'Test Store',
      staffName: 'Test Staff',
      sales: 100000,
      purchase: 30000,
      laborCost: 20000,
      utilities: 5000,
      promotion: 1000,
      cleaning: 500,
      misc: 500,
      communication: 500,
      others: 500,
      reportText: 'Test report',
      lineUserId: 'user123'
    }

    it('should create a new report', async () => {
      const mockResponse = {
        id: 'report-1',
        ...mockReportData,
        createdAt: '2025-12-01T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await apiClient.createReport(mockReportData)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reports'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      )
    })

    it('should transform data correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      await apiClient.createReport(mockReportData)

      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body)

      expect(requestBody).toHaveProperty('store_name', 'Test Store')
      expect(requestBody).toHaveProperty('staff_name', 'Test Staff')
      expect(requestBody).toHaveProperty('labor_cost', 20000)
      expect(requestBody).toHaveProperty('report_text', 'Test report')
      expect(requestBody).toHaveProperty('line_user_id', 'user123')
    })

    it('should handle creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      const result = await apiClient.createReport(mockReportData)

      expect(result).toBeNull()
    })
  })

  describe('getSummary', () => {
    it('should fetch daily summary', async () => {
      const mockSummary = {
        totalSales: 1000000,
        totalExpenses: 600000,
        profit: 400000
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary
      })

      const result = await apiClient.getSummary('daily')

      expect(result).toEqual(mockSummary)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('period_type=daily'),
        expect.any(Object)
      )
    })

    it('should fetch weekly summary with date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      await apiClient.getSummary('weekly', '2025-12-01', '2025-12-07')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/period_type=weekly.*start_date=2025-12-01.*end_date=2025-12-07/),
        expect.any(Object)
      )
    })

    it('should fetch monthly summary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      await apiClient.getSummary('monthly')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('period_type=monthly'),
        expect.any(Object)
      )
    })
  })

  describe('Wrapper functions', () => {
    it('getDailyReports should call getReports', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })

      await getDailyReports('2025-12-01', '2025-12-31')

      expect(mockFetch).toHaveBeenCalled()
    })

    it('createDailyReport should call createReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      const reportData = {
        date: '2025-12-01',
        storeName: 'Test',
        staffName: 'Staff',
        sales: 100000,
        purchase: 30000,
        laborCost: 20000,
        utilities: 5000,
        promotion: 1000,
        cleaning: 500,
        misc: 500,
        communication: 500,
        others: 500,
        reportText: 'Test',
        lineUserId: 'user'
      }

      await createDailyReport(reportData)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('getSummaryData should call getSummary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      await getSummaryData('daily', '2025-12-01', '2025-12-31')

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Content-Type headers', () => {
    it('should set Content-Type to application/json', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      })

      await apiClient.healthCheck()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })
  })

  describe('Error handling and fallback', () => {
    it('should log warning and return null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await apiClient.healthCheck()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API request failed'),
        expect.any(Error)
      )
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })
  })
})
