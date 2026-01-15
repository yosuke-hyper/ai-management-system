import { Card } from '../ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { HealthMetricCardProps } from '../../types/systemhealth';

export function HealthMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  status = 'healthy',
  subtitle
}: HealthMetricCardProps) {
  const statusColors = {
    healthy: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };

  const statusIconColors = {
    healthy: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  return (
    <Card className={`p-6 border-2 ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-5 w-5 ${statusIconColors[status]}`} />
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>

            {trend && (
              <div className={`flex items-center text-sm ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                <span className="ml-1">{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>

          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
