import React, { useState, useEffect } from 'react'
import { Calendar, Plus, X, Save, Trash2, AlertCircle, List, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getStoreRegularClosedDays,
  setStoreRegularClosedDays,
  getStoreHolidays,
  addStoreHoliday,
  deleteStoreHoliday,
  calculateOpenDays,
  type StoreHoliday
} from '@/services/storeholidays'
import { HolidayCalendar } from './holidaycalendar'

interface StoreHolidayManagementProps {
  storeId: string
  storeName: string
  organizationId: string
  onClose?: () => void
  inline?: boolean
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export const StoreHolidayManagement: React.FC<StoreHolidayManagementProps> = ({
  storeId,
  storeName,
  organizationId,
  onClose,
  inline = false
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [holidays, setHolidays] = useState<StoreHoliday[]>([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayType, setNewHolidayType] = useState<'national_holiday' | 'temporary_closure' | 'special_event'>('temporary_closure')
  const [newHolidayReason, setNewHolidayReason] = useState('')

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [openDays, setOpenDays] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [storeId])

  useEffect(() => {
    updateOpenDays()
  }, [currentMonth, selectedDays, holidays])

  const loadData = async () => {
    setLoading(true)

    const { data: closedDays } = await getStoreRegularClosedDays(storeId)
    if (closedDays) {
      setSelectedDays(closedDays.map(day => day.dayOfWeek))
    }

    const { data: holidayData } = await getStoreHolidays(storeId)
    if (holidayData) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const filteredHolidays = holidayData.filter(h => new Date(h.date) >= today)
      setHolidays(filteredHolidays)
    }

    setLoading(false)
  }

  const updateOpenDays = async () => {
    const { data } = await calculateOpenDays(storeId, currentMonth)
    setOpenDays(data)
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }

  const handleSaveRegularClosedDays = async () => {
    setLoading(true)
    const { error } = await setStoreRegularClosedDays(storeId, organizationId, selectedDays)
    setLoading(false)

    if (error) {
      showNotification('error', '定休日の保存に失敗しました')
    } else {
      showNotification('success', '定休日を保存しました')
      await updateOpenDays()
    }
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate) {
      showNotification('error', '日付を選択してください')
      return
    }

    setLoading(true)
    const { error } = await addStoreHoliday(
      storeId,
      organizationId,
      newHolidayDate,
      newHolidayType,
      newHolidayReason || undefined
    )
    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        showNotification('error', 'この日付は既に登録されています')
      } else {
        showNotification('error', '休日の追加に失敗しました')
      }
    } else {
      showNotification('success', '休日を追加しました')
      setNewHolidayDate('')
      setNewHolidayReason('')
      await loadData()
      await updateOpenDays()
    }
  }

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('この休日を削除しますか？')) {
      return
    }

    setLoading(true)
    const { error } = await deleteStoreHoliday(holidayId)
    setLoading(false)

    if (error) {
      showNotification('error', '休日の削除に失敗しました')
    } else {
      showNotification('success', '休日を削除しました')
      await loadData()
      await updateOpenDays()
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'national_holiday':
        return '祝日'
      case 'temporary_closure':
        return '臨時休業'
      case 'special_event':
        return 'イベント休業'
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national_holiday':
        return 'bg-red-100 text-red-800'
      case 'temporary_closure':
        return 'bg-orange-100 text-orange-800'
      case 'special_event':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const content = (
    <>
      {notification && (
        <div className={`p-4 rounded-lg mb-4 ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => setViewMode('calendar')}
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          className={viewMode === 'calendar' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          カレンダー表示
        </Button>
        <Button
          onClick={() => setViewMode('list')}
          variant={viewMode === 'list' ? 'default' : 'outline'}
          className={viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <List className="w-4 h-4 mr-2" />
          リスト表示
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">営業日数（参考）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <div className="text-2xl font-bold text-emerald-600">
                {openDays !== null ? `${openDays}日` : '計算中...'}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              定休日と特定日の休日を考慮した営業日数です
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">定休日（曜日指定）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {DAY_NAMES.map((name, index) => (
                <button
                  key={index}
                  onClick={() => toggleDay(index)}
                  className={`py-3 px-2 rounded-lg font-medium transition-colors ${
                    selectedDays.includes(index)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveRegularClosedDays}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                定休日を保存
              </Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'calendar' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">カレンダーで休日を管理</CardTitle>
            </CardHeader>
            <CardContent>
              <HolidayCalendar
                storeId={storeId}
                organizationId={organizationId}
                onUpdate={async () => {
                  await loadData()
                  await updateOpenDays()
                }}
                onNotification={showNotification}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">特定日の休日</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-gray-900">新しい休日を追加</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日付
                    </label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      種類
                    </label>
                    <select
                      value={newHolidayType}
                      onChange={(e) => setNewHolidayType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="temporary_closure">臨時休業</option>
                      <option value="national_holiday">祝日</option>
                      <option value="special_event">イベント休業</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    理由・メモ（任意）
                  </label>
                  <input
                    type="text"
                    value={newHolidayReason}
                    onChange={(e) => setNewHolidayReason(e.target.value)}
                    placeholder="例：年末年始、設備点検など"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddHoliday}
                    disabled={loading || !newHolidayDate}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    追加
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">登録済みの休日</h3>
                {holidays.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    登録された休日はありません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {holidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(holiday.date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(holiday.type)}`}>
                            {getTypeLabel(holiday.type)}
                          </span>
                          {holiday.reason && (
                            <span className="text-sm text-gray-600">
                              {holiday.reason}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )

  if (inline) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <div>
              <CardTitle className="text-xl">休日設定</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{storeName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">休日設定</h2>
              <p className="text-sm text-gray-600">{storeName}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6">
          {content}
        </div>

        {onClose && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
            >
              閉じる
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
