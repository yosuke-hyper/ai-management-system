import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Save, X, AlertTriangle } from 'lucide-react'
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

export const VendorCategoryManager: React.FC = () => {
  const { organization } = useOrganization()
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CategoryForm>({
    id: '',
    name: '',
    color: '#3B82F6',
    editing: false
  })

  const colorOptions = [
    { value: '#10B981', label: '緑' },
    { value: '#3B82F6', label: '青' },
    { value: '#8B5CF6', label: '紫' },
    { value: '#F59E0B', label: '黄' },
    { value: '#F97316', label: 'オレンジ' },
    { value: '#06B6D4', label: 'シアン' },
    { value: '#EC4899', label: 'ピンク' },
    { value: '#EF4444', label: '赤' },
    { value: '#6B7280', label: 'グレー' }
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

      const existingCategory = categories.find(c => c.id === categoryId)
      if (existingCategory) {
        toast.error('同じIDのカテゴリが既に存在します')
        return
      }

      const maxOrder = Math.max(...categories.map(c => c.display_order), 0)

      const { error } = await supabase
        .from('vendor_categories')
        .insert({
          id: categoryId,
          organization_id: organization.id,
          name: formData.name.trim(),
          color: formData.color,
          is_default: false,
          display_order: maxOrder + 1,
          is_active: true
        })

      if (error) throw error

      toast.success('カテゴリを追加しました')
      setShowAddForm(false)
      setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
      loadCategories()
    } catch (error: any) {
      console.error('Failed to add category:', error)
      toast.error('カテゴリの追加に失敗しました')
    }
  }

  const handleUpdateCategory = async (categoryId: string, updates: Partial<VendorCategory>) => {
    if (!organization?.id) return

    try {
      const { error } = await supabase
        .from('vendor_categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .eq('organization_id', organization.id)

      if (error) throw error

      toast.success('カテゴリを更新しました')
      setEditingId(null)
      setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
      loadCategories()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('カテゴリの更新に失敗しました')
    }
  }

  const handleDeleteCategory = async (categoryId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('デフォルトカテゴリは削除できません')
      return
    }

    const { data: vendorsUsingCategory } = await supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('category', categoryId)

    if (vendorsUsingCategory && (vendorsUsingCategory as any).count > 0) {
      if (!confirm(`このカテゴリを使用している業者が存在します。カテゴリを無効化しますか？\n（削除ではなく無効化されます）`)) {
        return
      }

      await handleUpdateCategory(categoryId, { is_active: false })
      return
    }

    if (!confirm('このカテゴリを削除してもよろしいですか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('vendor_categories')
        .delete()
        .eq('id', categoryId)
        .eq('organization_id', organization!.id)

      if (error) throw error

      toast.success('カテゴリを削除しました')
      loadCategories()
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
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
  }

  const saveEdit = () => {
    if (!formData.name.trim()) {
      toast.error('カテゴリ名を入力してください')
      return
    }

    handleUpdateCategory(editingId!, {
      name: formData.name.trim(),
      color: formData.color
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          読み込み中...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>業者カテゴリ管理</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              業者の分類に使用するカテゴリを管理します
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            カテゴリ追加
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm text-blue-900">新しいカテゴリ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  カテゴリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：飲料類"
                  className="w-full border border-input rounded-md px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">色</label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2 bg-white"
                >
                  {colorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} size="sm">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ id: '', name: '', color: '#3B82F6', editing: false })
                }}
              >
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {categories.filter(c => c.is_active).map(category => (
            <div
              key={category.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {editingId === category.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        カテゴリ名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-input rounded-md px-3 py-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">色</label>
                      <select
                        value={formData.color}
                        onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                        className="w-full border border-input rounded-md px-3 py-2 bg-white"
                      >
                        {colorOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-gray-500">
                        ID: {category.id}
                        {category.is_default && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            デフォルト
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(category)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    {!category.is_default && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.is_default)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {categories.filter(c => !c.is_active).length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              無効化されたカテゴリ
            </h4>
            <div className="space-y-2">
              {categories.filter(c => !c.is_active).map(category => (
                <div
                  key={category.id}
                  className="p-3 border border-gray-200 rounded-lg bg-gray-50 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="text-sm">
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          無効
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateCategory(category.id, { is_active: true })}
                    >
                      再有効化
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            カテゴリが登録されていません
          </div>
        )}
      </CardContent>
    </Card>
  )
}
