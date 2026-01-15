import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

interface DailyReportSuccessModalProps {
  isOpen: boolean
  message: string
  emotion: 'happy' | 'surprised' | 'love' | 'sparkle'
  onClose: () => void
}

export const DailyReportSuccessModal: React.FC<DailyReportSuccessModalProps> = ({
  isOpen,
  message,
  emotion,
  onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      // 紙吹雪エフェクト
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  if (!isOpen) return null

  // 表情に応じた背景色
  const emotionColors = {
    happy: 'from-yellow-50 via-orange-50 to-amber-50',
    surprised: 'from-blue-50 via-cyan-50 to-teal-50',
    love: 'from-pink-50 via-rose-50 to-red-50',
    sparkle: 'from-purple-50 via-fuchsia-50 to-pink-50'
  }

  const emotionBorder = {
    happy: 'border-orange-300',
    surprised: 'border-cyan-300',
    love: 'border-rose-300',
    sparkle: 'border-fuchsia-300'
  }

  // アバター画像パス（emotionに応じて変更）
  const getAvatarExpression = () => {
    switch (emotion) {
      case 'happy':
        return '/images/avatar/happy.png'
      case 'surprised':
        return '/images/avatar/happy.png' // surprised用の画像があればそれを使用
      case 'love':
        return '/images/avatar/happy.png' // love用の画像があればそれを使用
      case 'sparkle':
        return '/images/avatar/happy.png' // sparkle用の画像があればそれを使用
      default:
        return '/images/avatar/normal.png'
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className={`relative max-w-lg w-full bg-gradient-to-br ${emotionColors[emotion]} border-4 ${emotionBorder[emotion]} shadow-2xl animate-in zoom-in-95 duration-500`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors z-10"
          aria-label="閉じる"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="p-8 text-center space-y-6">
          {/* キラキラアイコン */}
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-orange-500 animate-pulse" />
              <Sparkles className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
            </div>
          </div>

          {/* アバター画像 */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 animate-bounce">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <img
                src={getAvatarExpression()}
                alt="しばちゃん"
                className="relative w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* 吹き出しメッセージ */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-orange-300 relative">
              {/* 吹き出しの三角形 */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[16px] border-r-[16px] border-b-[16px] border-l-transparent border-r-transparent border-b-orange-300"></div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[14px] border-l-transparent border-r-transparent border-b-white"></div>

              <p className="text-2xl font-bold text-gray-800 leading-relaxed animate-in slide-in-from-bottom duration-700">
                {message}
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="pt-4">
            <Button
              onClick={onClose}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                明日も頑張る！
                <Sparkles className="h-5 w-5" />
              </span>
            </Button>
          </div>

          {/* 小さな応援メッセージ */}
          <p className="text-sm text-gray-600 animate-in fade-in duration-1000 delay-500">
            ✨ 素晴らしい一日でした！また明日も一緒に頑張りましょう ✨
          </p>
        </div>
      </Card>
    </div>
  )
}
