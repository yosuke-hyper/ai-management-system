/**
 * ErrorContext のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { ErrorProvider, useError } from '../errorcontext'
import { AppError, ErrorType, ErrorSeverity } from '@/lib/errors'
import React from 'react'

// Use vi.hoisted to avoid hoisting issues
const { mockLogError } = vi.hoisted(() => ({
  mockLogError: vi.fn()
}))

// logErrorのモック
vi.mock('@/services/errorlogger', () => ({
  logError: mockLogError
}))

// OrganizationContextのモック
vi.mock('../OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'test-org-id', name: 'Test Org' }
  })
}))

// AuthContextのモック
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}))

// テスト用コンポーネント
const TestComponent: React.FC = () => {
  const { errors, addError, clearError, clearAllErrors } = useError()

  return (
    <div>
      <div data-testid="error-count">{errors.length}</div>
      {errors.map((error, index) => (
        <div key={index} data-testid={`error-${index}`}>
          {error.userMessage}
        </div>
      ))}
      <button onClick={() => addError(new AppError('Test error', ErrorType.VALIDATION, ErrorSeverity.MEDIUM))}>
        Add Error
      </button>
      <button onClick={() => addError('String error')}>Add String Error</button>
      <button onClick={() => clearError(0)}>Clear First Error</button>
      <button onClick={() => clearAllErrors()}>Clear All</button>
    </div>
  )
}

describe('ErrorContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogError.mockResolvedValue(undefined)
  })

  describe('ErrorProvider', () => {
    it('should provide error context to children', () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
    })

    it('should render children without error', () => {
      render(
        <ErrorProvider>
          <div>Test content</div>
        </ErrorProvider>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })
  })

  describe('addError', () => {
    it('should add AppError to errors array', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      const addButton = screen.getByText('Add Error')
      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      }, { timeout: 2000 })
    })

    it('should display error message', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      const addButton = screen.getByText('Add Error')
      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-0')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should not display non-operational errors', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      // String errors are converted with isOperational: false and should not be displayed
      const addButton = screen.getByText('Add String Error')
      addButton.click()

      // Wait a bit to ensure the error was processed
      await new Promise(resolve => setTimeout(resolve, 100))

      // Error should NOT be displayed (count stays at 0)
      expect(screen.getByTestId('error-count')).toHaveTextContent('0')

      // But it should still be logged
      await waitFor(() => {
        expect(mockLogError).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should log error when added', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      const addButton = screen.getByText('Add Error')
      addButton.click()

      await waitFor(() => {
        expect(mockLogError).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should support multiple errors', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      const addButton = screen.getByText('Add Error')

      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      }, { timeout: 2000 })

      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('2')
      }, { timeout: 2000 })
    })
  })

  describe('clearError', () => {
    it('should clear specific error', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      // Add error first
      const addButton = screen.getByText('Add Error')
      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      }, { timeout: 2000 })

      // Clear error
      const clearButton = screen.getByText('Clear First Error')
      clearButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('0')
      }, { timeout: 2000 })
    })
  })

  describe('clearAllErrors', () => {
    it('should clear all errors', async () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      // Add multiple errors
      const addButton = screen.getByText('Add Error')
      addButton.click()
      addButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('2')
      }, { timeout: 2000 })

      // Clear all
      const clearAllButton = screen.getByText('Clear All')
      clearAllButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('0')
      }, { timeout: 2000 })
    })
  })

  describe('useError hook', () => {
    it('should throw error when used outside ErrorProvider', () => {
      const TestComponentWithoutProvider: React.FC = () => {
        useError()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow('useError must be used within an ErrorProvider')

      consoleError.mockRestore()
    })
  })
})
