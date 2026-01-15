import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import {
  ShoppingBag,
  Sparkles,
  Check,
  Lock,
  Coins,
  User,
  Shirt,
  Hand
} from 'lucide-react'
import { useAvatarItems } from '@/hooks/useavataritems'
import { useAuth } from '@/contexts/authcontext'
import { AiAvatar } from './aiavatar'

export function AvatarCustomizer() {
  const { user } = useAuth()
  const {
    items,
    equippedItems,
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

  const [selectedCategory, setSelectedCategory] = useState<'head' | 'outfit' | 'hand'>('head')

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'head': return <User className="h-4 w-4" />
      case 'outfit': return <Shirt className="h-4 w-4" />
      case 'hand': return <Hand className="h-4 w-4" />
      default: return null
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'head': return '頭部'
      case 'outfit': return '服装'
      case 'hand': return '手持ち'
      default: return category
    }
  }

  const handlePurchase = async (itemId: string, cost: number) => {
    await purchaseItem(itemId, cost)
  }

  const handleEquip = async (itemId: string) => {
    await equipItem(itemId)
  }

  const handleUnequip = async (category: 'head' | 'outfit' | 'hand') => {
    await unequipItem(category)
  }

  const categoryItems = getItemsByCategory(selectedCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* プレビュー */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            プレビュー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-b from-blue-50 to-slate-50 rounded-lg p-8 flex items-center justify-center min-h-[200px]">
            <AiAvatar
              mood="happy"
              size={140}
              fixed={false}
              clickable={false}
              enableHelpChat={false}
              equippedItems={equippedItems}
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">所持ポイント:</span>
              <div className="flex items-center gap-1 font-semibold text-amber-700">
                <Coins className="h-4 w-4" />
                {user?.points?.toLocaleString() || 0}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">解除済み:</span>
              <span className="font-semibold">{items.filter(item => isItemUnlocked(item.id)).length} / {items.length}</span>
            </div>
          </div>

          {/* 現在の装備 */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">現在の装備</h4>
            <div className="space-y-1 text-xs">
              {(['head', 'outfit', 'hand'] as const).map(category => {
                const equippedImagePath = equippedItems[category]
                const equippedItem = items.find(item => item.image_path === equippedImagePath)
                return (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{getCategoryLabel(category)}:</span>
                    <span className="font-medium">
                      {equippedItem ? equippedItem.name : '未装備'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アイテムショップ */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            アイテムショップ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* カテゴリタブ */}
          <div className="flex gap-2 mb-6">
            {(['head', 'outfit', 'hand'] as const).map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(category)}
                {getCategoryLabel(category)}
              </Button>
            ))}
          </div>

          {/* アイテムリスト */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryItems.map(item => {
              const unlocked = isItemUnlocked(item.id)
              const equipped = isItemEquipped(item.id)
              const canAfford = (user?.points || 0) >= item.price

              return (
                <Card
                  key={item.id}
                  className={`relative ${equipped ? 'ring-2 ring-green-500' : ''} ${getRarityColor(item.rarity).includes('border') ? `border-2 ${getRarityColor(item.rarity).split(' ')[1]}` : ''}`}
                >
                  <CardContent className="p-4">
                    {equipped && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          装備中
                        </Badge>
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* アイテム画像 */}
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={`/images/avatar/${item.image_path}.png`}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3C/svg%3E'
                          }}
                        />
                      </div>

                      {/* アイテム情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRarityColor(item.rarity)}`}
                          >
                            {getRarityLabel(item.rarity)}
                          </Badge>
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                            <Coins className="h-4 w-4" />
                            {item.price === 0 ? '無料' : `${item.price.toLocaleString()}P`}
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex gap-2">
                          {!unlocked ? (
                            <Button
                              size="sm"
                              onClick={() => handlePurchase(item.id, item.price)}
                              disabled={!canAfford || purchasing}
                              className="flex-1"
                            >
                              {purchasing ? (
                                <>処理中...</>
                              ) : !canAfford ? (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  ポイント不足
                                </>
                              ) : (
                                <>購入する</>
                              )}
                            </Button>
                          ) : equipped ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnequip(item.category)}
                              disabled={equipping}
                              className="flex-1"
                            >
                              装備を外す
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleEquip(item.id)}
                              disabled={equipping}
                              className="flex-1"
                            >
                              装備する
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {categoryItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              このカテゴリにはまだアイテムがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
