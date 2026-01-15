import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Search, Copy, ChevronDown, ChevronUp, Check, X, Filter, Save, Layers } from 'lucide-react'
import { type Vendor, type Store } from '@/types'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/organizationcontext'
import toast from 'react-hot-toast'

interface VendorTemplate {
  id: string
  name: string
  description: string
  brand_type: string | null
  vendor_count: number
}

interface VendorCategory {
  id: string
  name: string
  color: string
  is_active: boolean
}

interface VendorAssignmentManagerProps {
  stores: Store[]
  vendors: Vendor[]
  selectedStoreId: string
  onStoreChange: (storeId: string) => void
  getStoreVendors: (storeId: string) => Vendor[]
  assignVendorToStore: (storeId: string, vendorId: string) => Promise<void>
  unassignVendorFromStore: (storeId: string, vendorId: string) => Promise<void>
}

export const VendorAssignmentManager: React.FC<VendorAssignmentManagerProps> = ({
  stores,
  vendors,
  selectedStoreId,
  onStoreChange,
  getStoreVendors,
  assignVendorToStore,
  unassignVendorFromStore
}) => {
  const { organization } = useOrganization()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyFromStoreId, setCopyFromStoreId] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<VendorTemplate[]>([])
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [categories, setCategories] = useState<VendorCategory[]>([])

  const categoryLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    categories.forEach(cat => {
      labels[cat.id] = cat.name
    })
    return labels
  }, [categories])

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-300'

    const colorMap: Record<string, string> = {
      '#10B981': 'bg-green-100 text-green-800 border-green-300',
      '#3B82F6': 'bg-blue-100 text-blue-800 border-blue-300',
      '#8B5CF6': 'bg-purple-100 text-purple-800 border-purple-300',
      '#F59E0B': 'bg-amber-100 text-amber-800 border-amber-300',
      '#F97316': 'bg-orange-100 text-orange-800 border-orange-300',
      '#06B6D4': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      '#EC4899': 'bg-pink-100 text-pink-800 border-pink-300',
      '#EF4444': 'bg-red-100 text-red-800 border-red-300',
      '#6B7280': 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return colorMap[category.color] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const assignedVendorIds = useMemo(() => {
    if (!selectedStoreId) return new Set<string>()
    return new Set(getStoreVendors(selectedStoreId).map(v => v.id))
  }, [selectedStoreId, getStoreVendors])

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      if (!vendor.isActive) return false

      const matchesSearch = searchTerm === '' ||
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.contactInfo || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory

      const isAssigned = assignedVendorIds.has(vendor.id)
      const matchesAssignmentFilter =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && isAssigned) ||
        (assignmentFilter === 'unassigned' && !isAssigned)

      return matchesSearch && matchesCategory && matchesAssignmentFilter
    })
  }, [vendors, searchTerm, selectedCategory, assignmentFilter, assignedVendorIds])

  const vendorsByCategory = useMemo(() => {
    const grouped: Record<string, Vendor[]> = {}
    filteredVendors.forEach(vendor => {
      const category = vendor.category || 'others'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(vendor)
    })
    return grouped
  }, [filteredVendors])

  const selectedStore = stores.find(s => s.id === selectedStoreId)
  const assignedCount = assignedVendorIds.size
  const totalActiveVendors = vendors.filter(v => v.isActive).length

  const handleToggle = async (vendorId: string) => {
    if (!selectedStoreId) {
      toast.error('店舗を選択してください')
      return
    }

    const isAssigned = assignedVendorIds.has(vendorId)

    try {
      if (isAssigned) {
        await unassignVendorFromStore(selectedStoreId, vendorId)
        toast.success('業者の割り当てを解除しました')
      } else {
        await assignVendorToStore(selectedStoreId, vendorId)
        toast.success('業者を割り当てました')
      }
    } catch (error) {
      toast.error('操作に失敗しました')
      console.error('Toggle error:', error)
    }
  }

  const handleCategoryToggle = async (category: string) => {
    if (!selectedStoreId) {
      toast.error('店舗を選択してください')
      return
    }

    const categoryVendors = vendorsByCategory[category] || []
    const allAssigned = categoryVendors.every(v => assignedVendorIds.has(v.id))

    try {
      if (allAssigned) {
        for (const vendor of categoryVendors) {
          await unassignVendorFromStore(selectedStoreId, vendor.id)
        }
        toast.success(`${categoryLabels[category]}の全業者を解除しました`)
      } else {
        for (const vendor of categoryVendors) {
          if (!assignedVendorIds.has(vendor.id)) {
            await assignVendorToStore(selectedStoreId, vendor.id)
          }
        }
        toast.success(`${categoryLabels[category]}の全業者を割り当てました`)
      }
    } catch (error) {
      toast.error('一括操作に失敗しました')
      console.error('Category toggle error:', error)
    }
  }

  const handleCopyFromStore = async () => {
    if (!copyFromStoreId || !selectedStoreId) {
      toast.error('コピー元の店舗を選択してください')
      return
    }

    if (copyFromStoreId === selectedStoreId) {
      toast.error('同じ店舗はコピーできません')
      return
    }

    try {
      const sourceVendors = getStoreVendors(copyFromStoreId)

      for (const vendor of sourceVendors) {
        if (!assignedVendorIds.has(vendor.id)) {
          await assignVendorToStore(selectedStoreId, vendor.id)
        }
      }

      const sourceStoreName = stores.find(s => s.id === copyFromStoreId)?.name
      toast.success(`${sourceStoreName}から${sourceVendors.length}件の業者をコピーしました`)
      setShowCopyModal(false)
      setCopyFromStoreId('')
    } catch (error) {
      toast.error('コピーに失敗しました')
      console.error('Copy error:', error)
    }
  }

  useEffect(() => {
    loadTemplates()
    loadCategories()
  }, [organization?.id])

  const loadCategories = async () => {
    if (!organization?.id) return

    try {
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('id, name, color, is_active')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const { data: templatesData, error } = await supabase
        .from('vendor_assignment_templates')
        .select('id, name, description, brand_type')
        .order('name')

      if (error) throw error

      if (templatesData) {
        const templatesWithCounts = await Promise.all(
          templatesData.map(async (template) => {
            const { count } = await supabase
              .from('vendor_assignment_template_items')
              .select('*', { count: 'exact', head: true })
              .eq('template_id', template.id)

            return {
              ...template,
              vendor_count: count || 0
            }
          })
        )
        setTemplates(templatesWithCounts)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('テンプレート名を入力してください')
      return
    }

    if (!selectedStoreId) {
      toast.error('店舗を選択してください')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ユーザー情報が取得できません')

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) throw new Error('組織情報が取得できません')

      const { data: template, error: templateError } = await supabase
        .from('vendor_assignment_templates')
        .insert({
          organization_id: profile.organization_id,
          name: templateName.trim(),
          description: templateDescription.trim(),
          brand_type: selectedStore?.brand_id || null,
          created_by: user.id
        })
        .select()
        .single()

      if (templateError) throw templateError

      const assignedVendors = getStoreVendors(selectedStoreId)
      if (assignedVendors.length > 0) {
        const items = assignedVendors.map((vendor, index) => ({
          template_id: template.id,
          vendor_id: vendor.id,
          display_order: index
        }))

        const { error: itemsError } = await supabase
          .from('vendor_assignment_template_items')
          .insert(items)

        if (itemsError) throw itemsError
      }

      toast.success(`テンプレート「${templateName}」を保存しました`)
      setShowSaveTemplateModal(false)
      setTemplateName('')
      setTemplateDescription('')
      loadTemplates()
    } catch (error: any) {
      toast.error('テンプレートの保存に失敗しました')
      console.error('Save template error:', error)
    }
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || !selectedStoreId) {
      toast.error('テンプレートを選択してください')
      return
    }

    try {
      const { data: items, error } = await supabase
        .from('vendor_assignment_template_items')
        .select('vendor_id')
        .eq('template_id', selectedTemplateId)

      if (error) throw error

      if (!items || items.length === 0) {
        toast.error('テンプレートに業者が登録されていません')
        return
      }

      let addedCount = 0
      for (const item of items) {
        if (!assignedVendorIds.has(item.vendor_id)) {
          await assignVendorToStore(selectedStoreId, item.vendor_id)
          addedCount++
        }
      }

      const templateName = templates.find(t => t.id === selectedTemplateId)?.name
      toast.success(`テンプレート「${templateName}」から${addedCount}件の業者を追加しました`)
      setShowTemplateModal(false)
      setSelectedTemplateId('')
    } catch (error) {
      toast.error('テンプレートの適用に失敗しました')
      console.error('Apply template error:', error)
    }
  }

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const renderVendorCard = (vendor: Vendor) => {
    const isAssigned = assignedVendorIds.has(vendor.id)

    return (
      <div
        key={vendor.id}
        className={`group relative p-4 rounded-lg border-2 transition-all duration-200 ${
          isAssigned
            ? 'bg-green-50 border-green-300 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">
                {vendor.name}
              </h4>
              {isAssigned && (
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
            </div>

            <Badge
              variant="outline"
              className={`text-xs ${getCategoryColor(vendor.category)}`}
            >
              {categoryLabels[vendor.category] || vendor.category}
            </Badge>

            {vendor.contactInfo && (
              <p className="text-xs text-gray-600 mt-2 truncate">
                📞 {vendor.contactInfo}
              </p>
            )}
          </div>

          <Switch
            checked={isAssigned}
            onCheckedChange={() => handleToggle(vendor.id)}
            disabled={!selectedStoreId}
            className="flex-shrink-0"
          />
        </div>
      </div>
    )
  }

  const renderCategorySection = (category: string, vendors: Vendor[]) => {
    const isExpanded = expandedCategories[category] !== false
    const assignedInCategory = vendors.filter(v => assignedVendorIds.has(v.id)).length
    const allAssigned = assignedInCategory === vendors.length && vendors.length > 0

    return (
      <div key={category} className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <button
            onClick={() => toggleCategoryExpand(category)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
            <h3 className="font-semibold text-gray-900">
              {categoryLabels[category]}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {assignedInCategory} / {vendors.length}
            </Badge>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 mr-2">
              {allAssigned ? '全て割当済' : '一括割当'}
            </span>
            <Switch
              checked={allAssigned}
              onCheckedChange={() => handleCategoryToggle(category)}
              disabled={!selectedStoreId || vendors.length === 0}
            />
          </div>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
            {vendors.map(renderVendorCard)}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span>店舗別業者割り当て</span>
          {selectedStoreId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateModal(true)}
              >
                <Layers className="w-4 h-4 mr-2" />
                テンプレートから適用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveTemplateModal(true)}
                disabled={assignedVendorIds.size === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                テンプレートとして保存
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCopyModal(true)}
              >
                <Copy className="w-4 h-4 mr-2" />
                他店舗からコピー
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">店舗選択</label>
          <select
            value={selectedStoreId}
            onChange={(e) => onStoreChange(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background"
          >
            <option value="">店舗を選択してください</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStoreId && selectedStore && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">
                  {selectedStore.name}
                </h3>
                <Badge className="bg-blue-600 text-white">
                  {assignedCount} / {totalActiveVendors} 業者
                </Badge>
              </div>

              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(assignedCount / totalActiveVendors) * 100}%` }}
                />
              </div>

              <p className="text-xs text-blue-700 mt-2">
                {Math.round((assignedCount / totalActiveVendors) * 100)}% 完了
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="業者名・連絡先で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-input rounded-md px-3 py-2 bg-background"
              >
                <option value="all">全カテゴリ</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as any)}
                className="border border-input rounded-md px-3 py-2 bg-background"
              >
                <option value="all">全て表示</option>
                <option value="assigned">割当済のみ</option>
                <option value="unassigned">未割当のみ</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <Filter className="w-4 h-4" />
                カテゴリー別表示: {groupByCategory ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-4">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">該当する業者が見つかりません</p>
                  <p className="text-sm">検索条件を変更してください</p>
                </div>
              ) : groupByCategory ? (
                Object.entries(vendorsByCategory).map(([category, vendors]) =>
                  renderCategorySection(category, vendors)
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredVendors.map(renderVendorCard)}
                </div>
              )}
            </div>
          </>
        )}

        {!selectedStoreId && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">店舗を選択してください</p>
            <p className="text-sm">上のドロップダウンから店舗を選択すると、業者の割り当てを管理できます</p>
          </div>
        )}
      </CardContent>

      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">他店舗からコピー</h3>
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyFromStoreId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              選択した店舗の業者割り当てを、現在の店舗（{selectedStore?.name}）にコピーします。
              既に割り当て済みの業者は除外されます。
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  コピー元の店舗
                </label>
                <select
                  value={copyFromStoreId}
                  onChange={(e) => setCopyFromStoreId(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                >
                  <option value="">選択してください</option>
                  {stores
                    .filter(s => s.id !== selectedStoreId)
                    .map(store => {
                      const vendorCount = getStoreVendors(store.id).length
                      return (
                        <option key={store.id} value={store.id}>
                          {store.name} ({vendorCount}業者)
                        </option>
                      )
                    })}
                </select>
              </div>

              {copyFromStoreId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    {getStoreVendors(copyFromStoreId).length}件の業者がコピーされます
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyFromStore}
                  disabled={!copyFromStoreId}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  コピー実行
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCopyModal(false)
                    setCopyFromStoreId('')
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">テンプレートから適用</h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setSelectedTemplateId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              保存されたテンプレートから業者を一括で割り当てます。
              既に割り当て済みの業者は除外されます。
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  テンプレート選択
                </label>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm">保存されたテンプレートがありません</p>
                    <p className="text-xs mt-1">まず業者を割り当ててテンプレートとして保存してください</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {template.vendor_count}業者
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {templates.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={!selectedTemplateId}
                    className="flex-1"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    テンプレート適用
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTemplateModal(false)
                      setSelectedTemplateId('')
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">テンプレートとして保存</h3>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false)
                  setTemplateName('')
                  setTemplateDescription('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              現在の業者割り当て（{assignedVendorIds.size}件）をテンプレートとして保存します。
              他の店舗にも同じ設定を素早く適用できます。
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  テンプレート名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例：居酒屋標準セット"
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  説明（任意）
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="このテンプレートの用途や特徴を入力..."
                  rows={3}
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  {assignedVendorIds.size}件の業者がテンプレートに保存されます
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim()}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveTemplateModal(false)
                    setTemplateName('')
                    setTemplateDescription('')
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
