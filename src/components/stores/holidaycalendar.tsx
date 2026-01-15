import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStoreRegularClosedDays,
  getStoreHolidays,
  addStoreHolidaysBulk,
  deleteStoreHolidaysBulk,
  type StoreHoliday
} from '@/services/storeholidays'

interface HolidayCalendarProps {
  storeId: string
  organizationId: string
  onUpdate?: () => void
  onNotification?: (type: 'success' | 'error', message: string) => void
}

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  storeId,
  organizationId,
  onUpdate,
  onNotification
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [regularClosedDays, setRegularClosedDays] = useState<number[]>([])
  const [holidays, setHolidays] = useState<StoreHoliday[]>([])
  const [loading, setLoading] = useState(false)

  const [bulkType, setBulkType] = useState<'national_holiday' | 'temporary_closure' | 'special_event'>('temporary_closure')
  const [bulkReason, setBulkReason] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    loadData()
  }, [storeId, currentDate])

  const loadData = async () => {
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`

    const { data: closedDays } = await getStoreRegularClosedDays(storeId)
    if (closedDays) {
      setRegularClosedDays(closedDays.map(day => day.dayOfWeek))
    }

    const { data: holidayData } = await getStoreHolidays(storeId, yearMonth)
    if (holidayData) {
      setHolidays(holidayData)
    }
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDates(new Set())
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDates(new Set())
  }

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const toggleDateSelection = (dateString: string) => {
    const newSelection = new Set(selectedDates)
    if (newSelection.has(dateString)) {
      newSelection.delete(dateString)
    } else {
      newSelection.add(dateString)
    }
    setSelectedDates(newSelection)
  }

  const isRegularClosedDay = (dayOfWeek: number) => {
    return regularClosedDays.includes(dayOfWeek)
  }

  const isHolidayDate = (dateString: string) => {
    return holidays.some(h => h.date === dateString)
  }

  const getHolidayForDate = (dateString: string) => {
    return holidays.find(h => h.date === dateString)
  }

  const isPastDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleAddSelectedHolidays = async () => {
    if (selectedDates.size === 0) {
      onNotification?.('error', '日付を選択してください')
      return
    }

    const datesToAdd = Array.from(selectedDates).filter(date => !isHolidayDate(date))

    if (datesToAdd.length === 0) {
      onNotification?.('error', '選択した日付は全て既に休日として登録されています')
      return
    }

    setLoading(true)
    const { error } = await addStoreHolidaysBulk(
      storeId,
      organizationId,
      datesToAdd,
      bulkType,
      bulkReason || undefined
    )
    setLoading(false)

    if (error) {
      onNotification?.('error', '休日の追加に失敗しました')
    } else {
      onNotification?.('success', `${datesToAdd.length}件の休日を追加しました`)
      setSelectedDates(new Set())
      setBulkReason('')
      await loadData()
      onUpdate?.()
    }
  }

  const handleDeleteSelectedHolidays = async () => {
    const holidaysToDelete = Array.from(selectedDates)
      .map(date => getHolidayForDate(date))
      .filter((h): h is StoreHoliday => h !== undefined)

    if (holidaysToDelete.length === 0) {
      onNotification?.('error', '削除する休日を選択してください')
      return
    }

    if (!confirm(`選択した${holidaysToDelete.length}件の休日を削除しますか？`)) {
      return
    }

    setLoading(true)
    const { error } = await deleteStoreHolidaysBulk(holidaysToDelete.map(h => h.id))
    setLoading(false)

    if (error) {
      onNotification?.('error', '休日の削除に失敗しました')
    } else {
      onNotification?.('success', `${holidaysToDelete.length}件の休日を削除しました`)
      setSelectedDates(new Set())
      await loadData()
      onUpdate?.()
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: JSX.Element[] = []

    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    dayNames.forEach((name, index) => {
      days.push(
        <div
          key={`header-${index}`}
          className={`text-center text-sm font-semibold py-2 ${
            index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
          }`}
        >
          {name}
        </div>
      )
    })

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(year, month, day)
      const dayOfWeek = new Date(year, month, day).getDay()
      const isRegularClosed = isRegularClosedDay(dayOfWeek)
      const isHoliday = isHolidayDate(dateString)
      const isSelected = selectedDates.has(dateString)
      const isPast = isPastDate(year, month, day)
      const holiday = getHolidayForDate(dateString)

      let bgColor = 'bg-white hover:bg-gray-50'
      let textColor = 'text-gray-900'
      let borderColor = 'border-gray-200'

      // 選択状態を最優先で表示
      if (isSelected) {
        bgColor = isPast ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-emerald-100 hover:bg-emerald-200'
        borderColor = 'border-emerald-500'
        textColor = isPast ? 'text-emerald-700' : 'text-emerald-900'
      } else if (isHoliday) {
        bgColor = 'bg-red-100 hover:bg-red-200'
        borderColor = 'border-red-300'
        textColor = 'text-red-900'
      } else if (isRegularClosed) {
        bgColor = 'bg-gray-100'
        textColor = 'text-gray-500'
      } else if (isPast) {
        bgColor = 'bg-gray-50'
        textColor = 'text-gray-400'
      }

      // 曜日の色（選択されていない通常の日付のみ）
      if (!isSelected && !isHoliday && !isRegularClosed) {
        if (dayOfWeek === 0 && !isPast) {
          textColor = 'text-red-600'
        } else if (dayOfWeek === 6 && !isPast) {
          textColor = 'text-blue-600'
        }
      }

      days.push(
        <button
          key={day}
          onClick={() => toggleDateSelection(dateString)}
          disabled={loading}
          className={`aspect-square border ${borderColor} ${bgColor} ${textColor} rounded-lg p-1 transition-colors relative cursor-pointer`}
        >
          <div className="text-sm font-medium">{day}</div>
          {isRegularClosed && !isHoliday && (
            <div className="text-xs text-gray-400 mt-0.5">定休</div>
          )}
          {isHoliday && holiday && (
            <div className="text-xs mt-0.5 truncate" title={holiday.reason || ''}>
              {holiday.reason || '休日'}
            </div>
          )}
        </button>
      )
    }

    return days
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          onClick={handlePrevMonth}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {year}年 {month + 1}月
        </h3>
        <Button
          onClick={handleNextMonth}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>休日</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
          <span>定休日</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 border border-emerald-500 rounded"></div>
          <span>選択中</span>
        </div>
      </div>

      {selectedDates.size > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {selectedDates.size}件の日付を選択中
            </h4>
            <Button
              onClick={() => setSelectedDates(new Set())}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              選択解除
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                種類
              </label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              >
                <option value="temporary_closure">臨時休業</option>
                <option value="national_holiday">祝日</option>
                <option value="special_event">イベント休業</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                理由・メモ（任意）
              </label>
              <input
                type="text"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="例：年末年始、設備点検など"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddSelectedHolidays}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              選択日を休日に追加
            </Button>
            <Button
              onClick={handleDeleteSelectedHolidays}
              disabled={loading}
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              選択日の休日を削除
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
