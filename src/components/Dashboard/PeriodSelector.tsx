import React from 'react';
import { PeriodType } from '../../types';

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  selectedRange?: 'week' | 'month' | 'quarter' | 'year';
  onRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

const periodOptions: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: '日次' },
  { value: 'weekly', label: '週次' },
  { value: 'monthly', label: '月次' }
];

const rangeOptions = [
  { value: 'week' as const, label: '過去1週間' },
  { value: 'month' as const, label: '過去1ヶ月' },
  { value: 'quarter' as const, label: '過去3ヶ月' },
  { value: 'year' as const, label: '過去1年' }
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  selectedRange = 'month',
  onRangeChange
}) => {
  return (
    <div className="space-y-4">
      {/* 分析単位選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">分析単位</label>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
                ${selectedPeriod === option.value
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 期間範囲選択 */}
      {onRangeChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分析期間</label>
          <div className="grid grid-cols-2 gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onRangeChange(option.value)}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 border
                  ${selectedRange === option.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};