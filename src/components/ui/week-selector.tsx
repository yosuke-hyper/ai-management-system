import React from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface WeekOption {
  start: Date
  end: Date
  label: string
  value: string
}

interface WeekSelectorProps {
  selectedWeek?: string | null
  onWeekChange: (week: string | null) => void
  availableWeeks: WeekOption[]
  className?: string
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeek,
  onWeekChange,
  availableWeeks,
  className = ''
}) => {
  const selectedWeekOption = availableWeeks.find(w => w.value === selectedWeek) || availableWeeks[0]
  const selectedLabel = selectedWeekOption?.label || '週を選択'

  const formatWeekRange = (week: WeekOption) => {
    const startStr = week.start.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    const endStr = week.end.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    return `${startStr} 〜 ${endStr}`
  }

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
          {availableWeeks.map((week) => (
            <DropdownMenuItem
              key={week.value}
              onClick={() => onWeekChange(week.value)}
              className={selectedWeek === week.value ? 'bg-accent' : ''}
            >
              <div className="flex flex-col">
                <span className="font-medium">{week.label}</span>
                <span className="text-xs text-muted-foreground">{formatWeekRange(week)}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedWeekOption && (
        <Badge variant="secondary" className="text-xs">
          {formatWeekRange(selectedWeekOption)}
        </Badge>
      )}
    </div>
  )
}
