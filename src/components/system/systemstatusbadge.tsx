import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { SystemStatus } from '../../types/systemhealth';

interface SystemStatusBadgeProps {
  status: SystemStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SystemStatusBadge({
  status,
  showIcon = true,
  size = 'md'
}: SystemStatusBadgeProps) {
  const config = {
    healthy: {
      icon: CheckCircle,
      label: '正常稼働',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    warning: {
      icon: AlertTriangle,
      label: '警告',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    },
    critical: {
      icon: XCircle,
      label: '障害発生',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const { icon: Icon, label, bgColor, textColor, borderColor } = config[status];

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border
      ${bgColor} ${textColor} ${borderColor} ${sizeClasses[size]}
      font-medium
    `}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{label}</span>
    </div>
  );
}
