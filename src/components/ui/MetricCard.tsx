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

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'neutral',
  hint,
  details,
  loading = false,
  className
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">
            {label}
          </div>
          <div className={cn('p-2 rounded-lg', toneClasses[tone])}>
            <Icon className={cn('h-4 w-4', iconToneClasses[tone])} />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {value}
          </div>
          
          {delta && (
            <div className="flex items-center gap-2">
              <Badge 
                variant={delta.isPositive ? 'default' : 'destructive'}
                className="text-xs"
              >
                {delta.isPositive ? '+' : ''}{delta.value.toFixed(1)}%
              </Badge>
              {delta.label && (
                <span className="text-xs text-muted-foreground">
                  {delta.label}
                </span>
              )}
            </div>
          )}
          
          {hint && (
            <p className="text-xs text-muted-foreground">
              {hint}
            </p>
          )}

          {details && details.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{detail.label}</span>
                  <span className="font-medium text-foreground">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}