import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../metriccard'
import { TrendingUp } from 'lucide-react'

describe('MetricCard component', () => {
  it('should render with label and value', () => {
    render(<MetricCard label="Total Sales" value="¥1,000,000" icon={TrendingUp} />)
    expect(screen.getByText('Total Sales')).toBeInTheDocument()
    expect(screen.getByText('¥1,000,000')).toBeInTheDocument()
  })

  it('should render with hint', () => {
    render(
      <MetricCard
        label="Total Sales"
        value="¥1,000,000"
        icon={TrendingUp}
        hint="This month"
      />
    )
    expect(screen.getByText('This month')).toBeInTheDocument()
  })

  it('should render with delta indicator', () => {
    render(
      <MetricCard
        label="Total Sales"
        value="¥1,000,000"
        icon={TrendingUp}
        delta={{ value: 10, isPositive: true, label: 'vs last month' }}
      />
    )
    expect(screen.getByText('+10.0%')).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('should render negative delta correctly', () => {
    render(
      <MetricCard
        label="Total Sales"
        value="¥1,000,000"
        icon={TrendingUp}
        delta={{ value: 5, isPositive: false }}
      />
    )
    // When isPositive is false, no minus sign is added (just shows the value)
    expect(screen.getByText('5.0%')).toBeInTheDocument()
  })

  it('should render with details', () => {
    render(
      <MetricCard
        label="Total Sales"
        value="¥1,000,000"
        icon={TrendingUp}
        details={[
          { label: 'Lunch', value: '¥400,000' },
          { label: 'Dinner', value: '¥600,000' },
        ]}
      />
    )
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('¥400,000')).toBeInTheDocument()
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('¥600,000')).toBeInTheDocument()
  })

  it('should render with different tones', () => {
    const { container: successContainer } = render(
      <MetricCard label="Success" value="100" icon={TrendingUp} tone="success" />
    )
    expect(successContainer.querySelector('.text-success')).toBeInTheDocument()

    const { container: warningContainer } = render(
      <MetricCard label="Warning" value="100" icon={TrendingUp} tone="warning" />
    )
    expect(warningContainer.querySelector('.text-warning')).toBeInTheDocument()

    const { container: dangerContainer } = render(
      <MetricCard label="Danger" value="100" icon={TrendingUp} tone="danger" />
    )
    expect(dangerContainer.querySelector('.text-danger')).toBeInTheDocument()
  })

  it('should render icon', () => {
    const { container } = render(
      <MetricCard label="Test" value="100" icon={TrendingUp} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    const { container } = render(
      <MetricCard label="Test" value="100" icon={TrendingUp} loading />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
