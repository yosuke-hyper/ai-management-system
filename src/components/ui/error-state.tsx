import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from './card'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'エラーが発生しました',
  message,
  onRetry,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-3 rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </Button>
        )}
      </CardContent>
    </Card>
  )
}