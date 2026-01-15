import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge component', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    expect(screen.getByText('Default Badge')).toBeInTheDocument()
  })

  it('should render with secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })

  it('should render with destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('should render with outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    expect(container.firstChild).toHaveClass('border')
  })

  it('should accept custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render children correctly', () => {
    render(
      <Badge>
        <span>Complex</span> Badge
      </Badge>
    )
    expect(screen.getByText('Complex')).toBeInTheDocument()
    expect(screen.getByText(/Badge/)).toBeInTheDocument()
  })
})
