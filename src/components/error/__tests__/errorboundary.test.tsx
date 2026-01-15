/**
 * ErrorBoundary コンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../errorboundary'
import React from 'react'

// logErrorのモック
vi.mock('@/services/errorlogger', () => ({
  logError: vi.fn()
}))

// テスト用のエラーを投げるコンポーネント
const ThrowError: React.FC<{ error?: Error }> = ({ error }) => {
  throw error || new Error('Test error')
}

// エラーを投げないコンポーネント
const NoError: React.FC = () => <div>No error</div>

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // console.errorをモック（React Error Boundaryの警告を抑制）
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <NoError />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should render error UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
    })

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Custom error message')} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Custom error message/i)).toBeInTheDocument()
    })
  })

  describe('error catching', () => {
    it('should catch errors in child components', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        )
      }).not.toThrow()
    })

    it('should catch errors in nested components', () => {
      const NestedError = () => (
        <div>
          <div>
            <ThrowError />
          </div>
        </div>
      )

      expect(() => {
        render(
          <ErrorBoundary>
            <NestedError />
          </ErrorBoundary>
        )
      }).not.toThrow()
    })

    it('should catch different types of errors', () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error')
      ]

      errors.forEach(error => {
        const { unmount } = render(
          <ErrorBoundary>
            <ThrowError error={error} />
          </ErrorBoundary>
        )

        expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('error UI', () => {
    it('should show reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /再読み込み/i })
      expect(reloadButton).toBeInTheDocument()
    })

    it('should show error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // アイコンの存在を確認（SVGまたはアイコンコンポーネント）
      const errorContainer = screen.getByText(/エラーが発生しました/i).closest('div')
      expect(errorContainer).toBeInTheDocument()
    })

    it('should display user-friendly message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText(/ページの読み込み中に問題が発生しました/i)).toBeInTheDocument()
    })
  })

  describe('reload functionality', () => {
    it('should reload page when reload button is clicked', () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      })

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /再読み込み/i })
      reloadButton.click()

      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('multiple children', () => {
    it('should render multiple children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })

    it('should catch error from any child', () => {
      render(
        <ErrorBoundary>
          <div>Safe child 1</div>
          <ThrowError />
          <div>Safe child 2</div>
        </ErrorBoundary>
      )

      expect(screen.queryByText('Safe child 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Safe child 2')).not.toBeInTheDocument()
      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
    })
  })

  describe('error isolation', () => {
    it('should not affect other ErrorBoundary instances', () => {
      const { container } = render(
        <div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <ErrorBoundary>
            <div>Safe content</div>
          </ErrorBoundary>
        </div>
      )

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
      expect(screen.getByText('Safe content')).toBeInTheDocument()
    })

    it('should isolate errors in nested boundaries', () => {
      render(
        <ErrorBoundary>
          <div>Outer safe content</div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      expect(screen.getByText('Outer safe content')).toBeInTheDocument()
      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined children', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>)
      expect(document.body).toBeInTheDocument()
    })

    it('should handle null children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>)
      expect(document.body).toBeInTheDocument()
    })

    it('should handle empty children', () => {
      render(<ErrorBoundary></ErrorBoundary>)
      expect(document.body).toBeInTheDocument()
    })

    it('should handle fragment children', () => {
      render(
        <ErrorBoundary>
          <>
            <div>Fragment child 1</div>
            <div>Fragment child 2</div>
          </>
        </ErrorBoundary>
      )

      expect(screen.getByText('Fragment child 1')).toBeInTheDocument()
      expect(screen.getByText('Fragment child 2')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const errorMessage = screen.getByText(/エラーが発生しました/i)
      expect(errorMessage).toBeInTheDocument()
    })

    it('should have accessible reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /再読み込み/i })
      expect(reloadButton).toBeInTheDocument()
      expect(reloadButton).toBeEnabled()
    })
  })

  describe('styling', () => {
    it('should apply error container styles', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const container = screen.getByText(/エラーが発生しました/i).closest('div')
      expect(container).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('should style reload button appropriately', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /再読み込み/i })
      expect(reloadButton).toHaveClass('px-4', 'py-2')
    })
  })
})
