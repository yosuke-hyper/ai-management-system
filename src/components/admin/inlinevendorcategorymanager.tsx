import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/organizationcontext'
import toast from 'react-hot-toast'

interface VendorCategory {
  id: string
  organization_id: string
  name: string
  color: string
  is_default: boolean
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CategoryForm {
  id: string
  name: string
  color: string
  editing: boolean
}

interface InlineVendorCategoryManagerProps {
  onCategoryChange?: () => void
}

export const InlineVendorCategoryManager: React.FC<InlineVendorCategoryManagerProps> = ({
  onCategoryChange
}) => {
  const { organization } = useOrganization()
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [formData, setFormData] = useState<CategoryForm>({
    id: '',
    name: '',
    color: '#3B82F6',
    editing: false
  })

  const colorOptions = [
    { value: '#10B981', label: '緑', preview: 'bg-emerald-500' },
    { value: '#3B82F6', label: '青', preview: 'bg-blue-500' },
    { value: '#8B5CF6', label: '紫', preview: 'bg-purple-500' },
    { value: '#F59E0B', label: '黄', preview: 'bg-amber-500' },
    { value: '#F97316', label: 'オレンジ', preview: 'bg-orange-500' },
    { value: '#06B6D4', label: 'シアン', preview: 'bg-cyan-500' },
    { value: '#EC4899', label: 'ピンク', preview: 'bg-pink-500' },
    { value: '#EF4444', label: '赤', preview: 'bg-red-500' },
    { value: '#6B7280', label: 'グレー', preview: 'bg-gray-500' }
  ]

  useEffect(() => {
    loadCategories()
  }, [organization?.id])

  const loadCategories = async () => {
    if (!organization?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order')

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('カテゴリの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const generateCategoryId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  }

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('カテゴリ名を入力してください')
      return
    }

    if (!organization?.id) {
      toast.error('組織情報が取得できません')
      return
    }

    try {
      const categoryId = generateCategoryId(formData.name)
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0)

      const { error } = await supabase
        .from('vendor_categories')
        .insert({
          id: categoryId,
          organization_id: organization.id,
          name: formData.name.trim(),
          color: formData.color,
          display_order: maxOrder + 1,
          is_default: false,
          is_active: true
        })

      if (error) throw error

      toast.success('カテゴリを追加しました')
      setShowAddForm(false)
      setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to add category:', error)
      toast.error('カテゴリの追加に失敗しました')
    }
  }

  const handleUpdateCategory = async (categoryId: string) => {
    if (!formData.name.trim()) {
      toast.error('カテゴリ名を入力してください')
      return
    }

    try {
      const { error } = await supabase
        .from('vendor_categories')
        .update({
          name: formData.name.trim(),
          color: formData.color
        })
        .eq('id', categoryId)

      if (error) throw error

      toast.success('カテゴリを更新しました')
      setEditingId(null)
      setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('カテゴリの更新に失敗しました')
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`カテゴリ「${categoryName}」を削除しますか？\nこのカテゴリを使用している業者は「その他」に変更されます。`)) {
      return
    }

    try {
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({ category: 'others' })
        .eq('category', categoryId)

      if (vendorError) throw vendorError

      const { error } = await supabase
        .from('vendor_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      toast.success('カテゴリを削除しました')
      await loadCategories()
      onCategoryChange?.()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('カテゴリの削除に失敗しました')
    }
  }

  const startEdit = (category: VendorCategory) => {
    setEditingId(category.id)
    setFormData({
      id: category.id,
      name: category.name,
      color: category.color,
      editing: true
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">業者カテゴリ管理</CardTitle>
            <Badge variant="outline" className="text-xs">
              {categories.length}カテゴリ
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                閉じる
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                編集する
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            業者を分類するためのカテゴリを管理します。業者登録時にカテゴリを選択できます。
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">読み込み中...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="border rounded-lg p-3 bg-white"
                  >
                    {editingId === category.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="カテゴリ名"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">色:</span>
                          <select
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="flex-1 px-2 py-1 border rounded-md text-sm"
                          >
                            {colorOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: formData.color }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCategory(category.id)}
                            className="flex-1"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-4 h-4 rounded flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium truncate">
                            {category.name}
                          </span>
                          {category.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              既定
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(category)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {!category.is_default && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showAddForm ? (
                <div className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    新しいカテゴリを追加
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="カテゴリ名を入力"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">色:</span>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-md"
                    >
                      {colorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCategory} className="flex-1">
                      <Plus className="w-4 h-4 mr-1" />
                      追加
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(true)
                    setEditingId(null)
                    setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
                  }}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  カテゴリを追加
                </Button>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
