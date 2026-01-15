import React from 'react';
import { Badge } from './badge';
import { type OperationType } from '@/types';

interface OperationTypeBadgeProps {
  operationType: OperationType;
  className?: string;
}

export const OperationTypeBadge: React.FC<OperationTypeBadgeProps> = ({ operationType, className }) => {
  const config = {
    lunch: {
      label: 'ランチ',
      icon: '🌤️',
      className: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    dinner: {
      label: 'ディナー',
      icon: '🌙',
      className: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    },
    full_day: {
      label: '終日',
      icon: '📅',
      className: 'bg-gray-100 text-gray-800 border-gray-300'
    }
  };

  const { label, icon, className: typeClassName } = config[operationType];

  return (
    <Badge className={`${typeClassName} ${className || ''}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </Badge>
  );
};

export const OperationTypeFilter: React.FC<{
  value: OperationType | 'all';
  onChange: (type: OperationType | 'all') => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          value === 'all'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        すべて
      </button>
      <button
        onClick={() => onChange('lunch')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          value === 'lunch'
            ? 'bg-amber-500 text-white'
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        }`}
      >
        🌤️ ランチ
      </button>
      <button
        onClick={() => onChange('dinner')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          value === 'dinner'
            ? 'bg-indigo-500 text-white'
            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
        }`}
      >
        🌙 ディナー
      </button>
    </div>
  );
};
