import React, { useMemo } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface MonthSelectorProps {
  selectedMonth?: string // Format: YYYY-MM
  onMonthChange: (month: string | undefined) => void
  availableMonths?: string[] // Optional: limit to specific months
  className?: string
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
  className = ''
}) => {
  const months = useMemo(() => {
    if (availableMonths && availableMonths.length > 0) {
      return availableMonths
    }

    const result: string[] = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      result.push(yearMonth)
    }

    return result
  }, [availableMonths])

  const formatMonth = (yyyymm: string) => {
    const [year, month] = yyyymm.split('-')
    return `${year}年${parseInt(month)}月`
  }

  const selectedLabel = selectedMonth ? formatMonth(selectedMonth) : '月を選択'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            {selectedLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
          {months.map((month) => (
            <DropdownMenuItem
              key={month}
              onClick={() => onMonthChange(month)}
              className={selectedMonth === month ? 'bg-accent' : ''}
            >
              {formatMonth(month)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(undefined)}
          className="h-8 px-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">クリア</span>
        </Button>
      )}

      {selectedMonth && (
        <Badge variant="secondary" className="text-xs">
          {formatMonth(selectedMonth)}のデータを表示中
        </Badge>
      )}
    </div>
  )
}
