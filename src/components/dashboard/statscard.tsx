import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-yellow-50 text-yellow-700'
};

export const StatsCard: React.FC<StatsCardProps> = React.memo(({
  title,
  value,
  icon: IconComponent,
  trend,
  color = 'blue'
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 mr-3">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{value}</p>
          {trend && (
            <p className={`text-xs sm:text-sm mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
});