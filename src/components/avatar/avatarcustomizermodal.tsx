import { useState, useEffect } from 'react'
import { X, ShoppingBag, Sparkles, Check, Lock, Coins, Crown, Shirt, Hand, Save, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAvatarItems, EquippedItems } from '@/hooks/useavataritems'
import { useAuth } from '@/contexts/authcontext'
import { AiAvatar } from './aiavatar'
import confetti from 'canvas-confetti'

interface AvatarCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'equipment' | 'shop'
type CategoryType = 'head' | 'outfit' | 'hand'

// ID-based equipped items for internal management
interface PreviewItems {
  head: string | null
  outfit: string | null
  hand: string | null
}

export function AvatarCustomizerModal({ isOpen, onClose }: AvatarCustomizerModalProps) {
  const { user } = useAuth()
  const {
    items,
    unlockedItems,
    equippedItems,
    equippedItemsById,
    loading,
    purchasing,
    equipping,
    purchaseItem,
    equipItem,
    unequipItem,
    isItemUnlocked,
    isItemEquipped,
    getItemsByCategory,
    getRarityColor,
    getRarityLabel
  } = useAvatarItems()

  const [activeTab, setActiveTab] = useState<TabType>('equipment')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('head')
  const [previewItemsById, setPreviewItemsById] = useState<PreviewItems>({ head: null, outfit: null, hand: null })
  const [hasChanges, setHasChanges] = useState(false)

  // IDから画像パスに変換したプレビュー用装備
  const previewItems: EquippedItems = {
    head: previewItemsById.head ? items.find(item => item.id === previewItemsById.head)?.image_path || null : null,
    outfit: previewItemsById.outfit ? items.find(item => item.id === previewItemsById.outfit)?.image_path || null : null,
    hand: previewItemsById.hand ? items.find(item => item.id === previewItemsById.hand)?.image_path || null : null
  }

  useEffect(() => {
    if (isOpen) {
      setPreviewItemsById({ ...equippedItemsById })
      setHasChanges(false)
    }
  }, [isOpen, equippedItemsById])

  if (!isOpen) return null

  const handlePurchase = async (itemId: string, cost: number) => {
    const success = await purchaseItem(itemId, cost)
    if (success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB']
      })
    }
  }

  const handlePreviewItem = (itemId: string, category: CategoryType) => {
    const newValue = itemId === '' ? null : itemId
    setPreviewItemsById(prev => ({
      ...prev,
      [category]: prev[category] === newValue ? prev[category] : newValue
    }))
    setHasChanges(true)
  }

  const handleSaveEquipment = async () => {
    for (const category of ['head', 'outfit', 'hand'] as CategoryType[]) {
      const previewId = previewItemsById[category]
      const currentId = equippedItemsById[category]

      if (previewId !== currentId) {
        if (previewId) {
          await equipItem(previewId)
        } else {
          await unequipItem(category)
        }
      }
    }
    setHasChanges(false)
  }

  const getCategoryIcon = (category: CategoryType) => {
    switch (category) {
      case 'head': return <Crown className="h-4 w-4" />
      case 'outfit': return <Shirt className="h-4 w-4" />
      case 'hand': return <Hand className="h-4 w-4" />
    }
  }

  const getCategoryLabel = (category: CategoryType) => {
    switch (category) {
      case 'head': return '頭'
      case 'outfit': return '服'
      case 'hand': return '手'
    }
  }

  const ownedItemsByCategory = (category: CategoryType) => {
    return items.filter(item => item.category === category && isItemUnlocked(item.id))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gradient-to-br from-amber-50 via-white to-sky-50 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden border-0 sm:border-4 border-amber-200">
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/80 hover:bg-white shadow-lg transition-all hover:scale-110"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full md:h-[80vh]">
          <div className="w-full md:w-1/3 bg-gradient-to-b from-sky-100/50 to-amber-100/50 p-3 sm:p-6 flex flex-row md:flex-col items-center gap-3 md:gap-0 border-b-2 md:border-b-0 md:border-r-2 border-amber-200/50 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg md:mb-6 flex-shrink-0">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-bold text-sm sm:text-lg whitespace-nowrap">{user?.points?.toLocaleString() || 0} P</span>
            </div>

            <div className="relative flex-shrink-0 md:mb-6">
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-amber-200/30 to-sky-200/30 rounded-full blur-xl" />
              <div className="relative transform scale-90 sm:scale-100 md:scale-125">
                <AiAvatar
                  mood="happy"
                  size={120}
                  fixed={false}
                  clickable={false}
                  enableHelpChat={false}
                  equippedItems={previewItems}
                />
              </div>
            </div>

            <div className="w-full space-y-1 sm:space-y-2 flex-1 flex flex-col min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 text-center mb-2 md:mb-3 hidden md:block">現在の装備</h4>
              {(['head', 'outfit', 'hand'] as CategoryType[]).map(category => {
                const itemId = previewItemsById[category]
                const item = items.find(i => i.id === itemId)
                return (
                  <div key={category} className="flex flex-col md:flex-row items-center justify-between bg-white/60 rounded-lg px-2 sm:px-3 py-1 sm:py-2 gap-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      {getCategoryIcon(category)}
                      <span className="hidden md:inline">{getCategoryLabel(category)}</span>
                    </span>
                    <span className={`text-xs font-medium truncate max-w-full ${item ? 'text-slate-700' : 'text-slate-400'}`}>
                      {item ? item.name : 'なし'}
                    </span>
                  </div>
                )
              })}
            </div>

            {hasChanges && (
              <Button
                onClick={handleSaveEquipment}
                disabled={equipping}
                className="mt-auto w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl shadow-lg py-2 sm:py-3 text-sm sm:text-base hidden md:flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {equipping ? '保存中...' : '保存する'}
              </Button>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="flex border-b-2 border-amber-200/50 bg-white/50">
              <button
                onClick={() => setActiveTab('equipment')}
                className={`flex-1 py-2 sm:py-4 px-2 sm:px-6 font-bold text-sm sm:text-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                  activeTab === 'equipment'
                    ? 'text-amber-600 border-b-4 border-amber-500 bg-amber-50/50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>着る</span>
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                className={`flex-1 py-2 sm:py-4 px-2 sm:px-6 font-bold text-sm sm:text-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                  activeTab === 'shop'
                    ? 'text-sky-600 border-b-4 border-sky-500 bg-sky-50/50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>ショップ</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
                </div>
              ) : activeTab === 'equipment' ? (
                <div className="space-y-3 sm:space-y-6">
                  <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
                    {(['head', 'outfit', 'hand'] as CategoryType[]).map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm sm:text-base transition-all flex items-center gap-1 sm:gap-2 ${
                          selectedCategory === category
                            ? 'bg-amber-500 text-white shadow-lg scale-105'
                            : 'bg-white text-slate-600 hover:bg-amber-100 border-2 border-amber-200'
                        }`}
                      >
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                    <button
                      onClick={() => handlePreviewItem('', selectedCategory)}
                      className={`relative p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                        previewItemsById[selectedCategory] === null
                          ? 'bg-gradient-to-br from-amber-100 to-amber-200 ring-2 sm:ring-4 ring-amber-400 scale-105 shadow-xl'
                          : 'bg-white hover:bg-amber-50 border-2 border-slate-200 hover:border-amber-300 hover:shadow-lg'
                      }`}
                    >
                      {previewItemsById[selectedCategory] === null && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-amber-500 text-white rounded-full p-0.5 sm:p-1 shadow-lg">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      )}
                      <div className="aspect-square bg-slate-100/50 rounded-lg sm:rounded-xl mb-1 sm:mb-2 flex items-center justify-center">
                        <X className="h-8 w-8 sm:h-12 sm:w-12 text-slate-300" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 text-center">
                        なし
                      </p>
                    </button>

                    {ownedItemsByCategory(selectedCategory).map(item => {
                      const isSelected = previewItemsById[selectedCategory] === item.id

                      return (
                        <div
                          key={item.id}
                          className={`relative p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                            isSelected
                              ? 'bg-gradient-to-br from-amber-100 to-amber-200 ring-2 sm:ring-4 ring-amber-400 shadow-xl'
                              : 'bg-white border-2 border-slate-200 hover:border-amber-300 hover:shadow-lg'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-amber-500 text-white rounded-full p-0.5 sm:p-1 shadow-lg z-10">
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            </div>
                          )}
                          <div className="aspect-square bg-slate-100/50 rounded-lg sm:rounded-xl mb-1 sm:mb-2 flex items-center justify-center overflow-hidden">
                            <img
                              src={`/images/avatar/${item.image_path}.png`}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-700 text-center truncate mb-1">
                            {item.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`w-full justify-center text-xs mb-1 sm:mb-2 ${getRarityColor(item.rarity)}`}
                          >
                            {getRarityLabel(item.rarity)}
                          </Badge>
                          <Button
                            onClick={() => handlePreviewItem(item.id, selectedCategory)}
                            className={`w-full py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-md ${
                              isSelected
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                            }`}
                          >
                            {isSelected ? (
                              <div className="flex items-center justify-center gap-1 sm:gap-2">
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>装備中</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 sm:gap-2">
                                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>装備する</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      )
                    })}

                    {ownedItemsByCategory(selectedCategory).length === 0 && (
                      <div className="col-span-2 md:col-span-3 text-center py-8 sm:py-12 text-slate-400">
                        <ShoppingBag className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                        <p className="text-sm sm:text-base">このカテゴリのアイテムを持っていません</p>
                        <p className="text-xs sm:text-sm mt-1">ショップで購入しましょう!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-6">
                  <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
                    {(['head', 'outfit', 'hand'] as CategoryType[]).map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm sm:text-base transition-all flex items-center gap-1 sm:gap-2 ${
                          selectedCategory === category
                            ? 'bg-sky-500 text-white shadow-lg scale-105'
                            : 'bg-white text-slate-600 hover:bg-sky-100 border-2 border-sky-200'
                        }`}
                      >
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {getItemsByCategory(selectedCategory).map(item => {
                      const unlocked = isItemUnlocked(item.id)
                      const canAfford = (user?.points || 0) >= item.price

                      return (
                        <div
                          key={item.id}
                          className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 transition-all ${
                            unlocked
                              ? 'border-green-300 bg-green-50/30'
                              : 'border-slate-200 hover:border-sky-300 hover:shadow-lg'
                          }`}
                        >
                          {unlocked && (
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-green-500 text-white rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold shadow-lg flex items-center gap-0.5 sm:gap-1">
                              <Check className="h-3 w-3" />
                              <span className="hidden sm:inline">購入済み</span>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 sm:gap-3">
                            <div className="flex gap-2 sm:gap-3">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <img
                                  src={`/images/avatar/${item.image_path}.png`}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
                                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{item.name}</h4>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs flex-shrink-0 ${getRarityColor(item.rarity)}`}
                                  >
                                    {getRarityLabel(item.rarity)}
                                  </Badge>
                                </div>

                                {item.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-1">
                                    {item.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-1 text-amber-600 font-bold mt-1 sm:mt-2">
                                  <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">{item.price === 0 ? '無料' : `${item.price.toLocaleString()}P`}</span>
                                </div>
                              </div>
                            </div>

                            {!unlocked ? (
                              <Button
                                onClick={() => handlePurchase(item.id, item.price)}
                                disabled={!canAfford || purchasing}
                                className={`w-full py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base shadow-lg ${
                                  canAfford
                                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white'
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {purchasing ? (
                                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>購入中...</span>
                                  </div>
                                ) : !canAfford ? (
                                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span>ポイント不足</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span>購入する</span>
                                  </div>
                                )}
                              </Button>
                            ) : (
                              <div className="py-2 sm:py-3 px-3 sm:px-4 bg-green-50 border-2 border-green-300 rounded-lg sm:rounded-xl text-center">
                                <div className="flex items-center justify-center gap-1 sm:gap-2 text-green-700 font-bold text-xs sm:text-base">
                                  <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                                  <span>購入済み</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1 hidden sm:block">装備タブで着せ替えできます</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {getItemsByCategory(selectedCategory).length === 0 && (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 sm:py-12 text-slate-400">
                        <ShoppingBag className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                        <p className="text-sm sm:text-base">このカテゴリにはまだアイテムがありません</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {hasChanges && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t-2 border-amber-200 shadow-lg z-20">
                <Button
                  onClick={handleSaveEquipment}
                  disabled={equipping}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl shadow-lg py-3 flex items-center justify-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {equipping ? '保存中...' : '保存する'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
