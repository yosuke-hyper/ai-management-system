import React, { useState, useEffect } from 'react'
import { Save, Edit2, X, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DailyTargetInputProps {
  date: string
  storeId: string
  currentTarget: number | null
  onSave: (targetSales: number) => Promise<{ success: boolean; error: string | null }>
  isLoading?: boolean
  className?: string
}

export const DailyTargetInput: React.FC<DailyTargetInputProps> = ({
  date,
  storeId,
  currentTarget,
  onSave,
  isLoading = false,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (currentTarget !== null && currentTarget !== undefined) {
      setInputValue(currentTarget.toString())
    } else {
      setInputValue('')
    }
  }, [currentTarget])

  const handleEdit = () => {
    setIsEditing(true)
    setSaveSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setInputValue(currentTarget?.toString() || '')
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    const value = parseInt(inputValue.replace(/[^0-9]/g, ''), 10)
    if (isNaN(value) || value <= 0) {
      alert('有効な金額を入力してください')
      return
    }

    setSaving(true)
    setSaveSuccess(false)

    const result = await onSave(value)

    setSaving(false)

    if (result.success) {
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
      }, 2000)
    } else {
      alert(result.error || '目標の保存に失敗しました')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (storeId === 'all') {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-muted-foreground">本日の売上目標</span>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {currentTarget !== null && currentTarget !== undefined ? (
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(currentTarget)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                未設定
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={isLoading}
            className="min-h-[36px]"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {currentTarget !== null ? '変更' : '設定'}
          </Button>
          {saveSuccess && (
            <span className="text-xs text-green-600 font-medium animate-pulse">
              保存しました
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="例: 300000"
            autoFocus
            className="flex-1 px-3 py-2 rounded border border-input bg-background text-base font-mono min-h-[36px]"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[36px]"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="min-h-[36px]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
