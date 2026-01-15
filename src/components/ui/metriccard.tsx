import React from 'react'
import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  label: string
  value: string
  delta?: {
    value: number
    isPositive: boolean
    label?: string
  }
  icon: LucideIcon
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  hint?: string
  details?: Array<{ label: string; value: string }>
  loading?: boolean
  className?: string
  size?: 'default' | 'large' | 'hero'
}

const toneClasses = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  neutral: 'bg-muted text-muted-foreground border-border'
}

const iconToneClasses = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted-foreground'
}

export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'neutral',
  hint,
  details,
  loading = false,
  className,
  size = 'default'
}) => {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-8 w-8 bg-muted rounded-lg"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardContent className={cn(
        'p-4 sm:p-6',
        size === 'large' && 'p-5 sm:p-8',
        size === 'hero' && 'p-6 sm:p-10'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'font-bold text-muted-foreground',
            size === 'hero' ? 'text-xl' : size === 'large' ? 'text-base' : 'text-sm'
          )}>
            {label}
          </div>
          <div className={cn(
            'rounded-lg',
            size === 'hero' ? 'p-4' : size === 'large' ? 'p-3' : 'p-2',
            toneClasses[tone]
          )}>
            <Icon className={cn(
              iconToneClasses[tone],
              size === 'hero' ? 'h-8 w-8' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4'
            )} />
          </div>
        </div>

        <div className="space-y-2">
          <div className={cn(
            'font-bold text-foreground',
            size === 'hero' ? 'text-5xl lg:text-7xl' : size === 'large' ? 'text-4xl lg:text-5xl' : 'text-2xl'
          )}>
            {value}
          </div>

          {delta && (
            <div className="flex items-center gap-2">
              <Badge
                variant={delta.isPositive ? 'default' : 'destructive'}
                className={cn(
                  size === 'hero' ? 'text-sm' : 'text-xs'
                )}
              >
                {delta.isPositive ? '+' : ''}{delta.value.toFixed(1)}%
              </Badge>
              {delta.label && (
                <span className={cn(
                  'text-muted-foreground',
                  size === 'hero' ? 'text-sm' : 'text-xs'
                )}>
                  {delta.label}
                </span>
              )}
            </div>
          )}

          {details && details.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              {details.map((detail, idx) => (
                <div key={idx} className={cn(
                  'flex items-center justify-between',
                  size === 'hero' ? 'text-sm' : 'text-xs'
                )}>
                  <span className="text-muted-foreground">{detail.label}</span>
                  <span className="font-medium text-foreground">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {hint && (
          <div className={cn(
            'mt-3 text-muted-foreground',
            size === 'hero' ? 'text-base' : 'text-xs'
          )}>
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  )
})