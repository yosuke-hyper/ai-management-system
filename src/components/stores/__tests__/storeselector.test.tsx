import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoreSelector } from '../storeselector'

describe('StoreSelector', () => {
  const mockStores = [
    { id: 'store-1', name: 'Store 1', address: 'Address 1', isActive: true },
    { id: 'store-2', name: 'Store 2', address: 'Address 2', isActive: true },
    { id: 'store-3', name: 'Store 3', address: 'Address 3', isActive: true }
  ]

  const mockOnStoreSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
        />
      )
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should display all stores as options', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      const options = select.querySelectorAll('option')

      // +2 for placeholder and "All Stores" option
      expect(options.length).toBe(mockStores.length + 2)
    })

    it('should display "All Stores" option', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId={null}
          onStoreSelect={mockOnStoreSelect}
        />
      )
      expect(screen.getByText(/全店舗/)).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should show selected store', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-2"
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('store-2')
    })

    it('should call onChange when selection changes', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'store-2' } })

      expect(mockOnStoreSelect).toHaveBeenCalledWith('store-2')
    })

    it('should call onChange with null for all stores', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: '' } })

      expect(mockOnStoreSelect).toHaveBeenCalledWith(null)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty stores array', () => {
      render(
        <StoreSelector
          stores={[]}
          selectedStoreId={null}
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      const options = select.querySelectorAll('option')

      // Placeholder + "All Stores" options
      expect(options.length).toBe(2)
    })

    it('should handle null selectedStoreId', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId={null}
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('')
    })

    it('should handle undefined selectedStoreId', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId={undefined}
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('')
    })
  })

  describe('Loading/Disabled state', () => {
    it('should be disabled when loading prop is true', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
          loading={true}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
    })

    it('should be disabled when stores array is empty', () => {
      render(
        <StoreSelector
          stores={[]}
          selectedStoreId="store-1"
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
    })
  })

  describe('Store names', () => {
    it('should display store names correctly in options', () => {
      render(
        <StoreSelector
          stores={mockStores}
          selectedStoreId={null}
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toHaveTextContent('Store 1')
      expect(select).toHaveTextContent('Store 2')
      expect(select).toHaveTextContent('Store 3')
    })

    it('should handle stores with special characters in names', () => {
      const specialStores = [
        { id: 'store-1', name: 'Store & Restaurant', address: 'Address 1', isActive: true },
        { id: 'store-2', name: 'Cafe Le Bon', address: 'Address 2', isActive: true },
        { id: 'store-3', name: '居酒屋勝', address: 'Address 3', isActive: true }
      ]

      render(
        <StoreSelector
          stores={specialStores}
          selectedStoreId={null}
          onStoreSelect={mockOnStoreSelect}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toHaveTextContent('Store & Restaurant')
      expect(select).toHaveTextContent('Cafe Le Bon')
      expect(select).toHaveTextContent('居酒屋勝')
    })
  })
})
