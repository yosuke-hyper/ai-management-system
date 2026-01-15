import React from 'react'
import { AvatarCustomizer } from '@/components/avatar/avatarcustomizer'

export default function AvatarCustomizerPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">アバターカスタマイズ</h1>
        <p className="text-muted-foreground">
          ポイントを使ってアイテムを購入し、アバターをカスタマイズしましょう
        </p>
      </div>
      <AvatarCustomizer />
    </div>
  )
}
