import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render with default variant', () => {
    const { container } = render(<Button>Default</Button>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })

  it('should render with destructive variant', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('should render with outline variant', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    expect(container.firstChild).toHaveClass('border')
  })

  it('should render with ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).toHaveClass('hover:bg-accent')
  })

  it('should render with different sizes', () => {
    const { container: smallContainer } = render(<Button size="sm">Small</Button>)
    expect(smallContainer.firstChild).toHaveClass('h-8')

    const { container: largeContainer } = render(<Button size="lg">Large</Button>)
    expect(largeContainer.firstChild).toHaveClass('h-10')

    const { container: iconContainer } = render(<Button size="icon">Icon</Button>)
    expect(iconContainer.firstChild).toHaveClass('h-9', 'w-9')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick} disabled>Disabled</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('should accept custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
