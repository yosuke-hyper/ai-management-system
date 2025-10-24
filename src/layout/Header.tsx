import React, { useTransition } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, User, LogOut, Settings, ChevronDown, Store, Shield, HelpCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminData } from '@/contexts/AdminDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { HelpGuide } from '@/components/system/HelpGuide'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialStore = params.get('store') || 'all'
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(initialStore)
  const [isHelpOpen, setIsHelpOpen] = React.useState(false)
  const { stores } = useAdminData()
  const { user, signOut } = useAuth()

  // ✅ startTransition: 重い集計と競合しないようにUI更新を緩和
  const [isPending, startTransition] = useTransition()

  const currentPeriod = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  // アクセス可能な店舗を計算
  const accessibleStores = React.useMemo(() => {
    if (!user) return []
    if (user.role === 'admin') {
      return stores.map(s => ({ id: s.id, name: s.name }))
    }
    return user.assignedStores || []
  }, [user, stores])
  const selectedStore = accessibleStores.find(s => s.id === selectedStoreId)

  // URLパラメータの変更を監視してstateを同期
  React.useEffect(() => {
    const urlStoreId = params.get('store') || 'all'
    if (urlStoreId !== selectedStoreId) {
      setSelectedStoreId(urlStoreId)
    }
  }, [location.search, selectedStoreId, params])

  const onChangeStore = (id: string) => {
    // ✅ 状態更新を並行レンダに逃がす（体感フリーズ解消）
    startTransition(() => {
      setSelectedStoreId(id)
      const p = new URLSearchParams(location.search)
      if (id === 'all') p.delete('store'); else p.set('store', id)
      navigate(`${location.pathname}?${p.toString()}`, { replace: true })
    })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3 text-red-600" />
      case 'manager': return <User className="h-3 w-3 text-blue-600" />
      case 'staff': return <User className="h-3 w-3 text-green-600" />
      default: return <User className="h-3 w-3" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return '統括'
      case 'manager': return '店長'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  // 店舗選択を非表示にするページ（ページ内で店舗選択がある場合）
  const hideStoreSelector = [
    '/report',
    '/report/new',
    '/expenses/monthly',
    '/admin',
    '/chat',
    '/ai-reports'
  ].includes(location.pathname)

  return (
    <>
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate leading-tight">
              <span className="sm:hidden">AI経営管理</span>
              <span className="hidden sm:inline">AI経営管理システム</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate leading-tight">
              <span className="hidden sm:inline">{currentPeriod}の分析</span>
              <span className="sm:hidden">分析</span>
              {selectedStoreId === 'all' ? <span className="hidden sm:inline">（全店舗合計）</span> : ''}
            </p>
          </div>
        </div>

        {/* Store selector - Hidden on pages with their own store selector */}
        {!hideStoreSelector && (
          <div className="flex items-center gap-1 sm:gap-3 flex-1 sm:flex-initial justify-center sm:justify-start min-w-0 max-w-xs sm:max-w-none">
            {/* ✅ ローディングインジケーター */}
            {isPending ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Store className="h-4 w-4 text-muted-foreground" />
            )}
            <select
              value={selectedStoreId}
              onChange={(e) => onChangeStore(e.target.value)}
              disabled={isPending}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring min-w-0 w-full sm:w-auto max-w-full sm:min-w-64 truncate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {user?.role === 'admin' && (
                <option value="all">🏢 全店舗（合計）</option>
              )}
              {accessibleStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {(selectedStoreId === 'all' || selectedStore) && (
              <Badge variant="secondary" className="text-xs hidden md:inline-flex">
                {selectedStoreId === 'all' ? '全店舗' : (user?.role === 'admin' ? '全権限' : '限定権限')}
              </Badge>
            )}
          </div>
        )}

        {/* Right section - Help & User menu */}
        <div className="min-w-0 flex-shrink-0 flex items-center gap-2">
          {/* Help Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHelpOpen(true)}
            className="h-8 w-8 sm:h-10 sm:w-10"
            title="使い方ガイド"
          >
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 h-8 sm:h-10">
              <User className="h-4 w-4" />
              <span className="hidden md:inline text-sm">
                {user?.name}
              </span>
              <Badge variant="outline" className="text-xs hidden lg:inline-flex">
                <div className="flex items-center gap-1">
                  {getRoleIcon(user?.role || '')}
                  {getRoleName(user?.role || '')}
                </div>
              </Badge>
              <ChevronDown className="h-3 w-3 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-medium">
              {user?.name}
            </div>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {getRoleIcon(user?.role || '')}
                {getRoleName(user?.role || '')}
                {user?.role === 'admin' && <Badge variant="destructive" className="text-xs">全権限</Badge>}
              </div>
            </div>
            {user?.assignedStores && user.assignedStores.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground mb-1">担当店舗:</p>
                  {user.assignedStores.slice(0, 3).map(store => (
                    <div key={store.id} className="text-xs text-foreground">
                      🏪 {store.name.replace('居酒屋いっき', '').replace('バールアフロマージュスーヴォワル', 'アフロ')}
                    </div>
                  ))}
                  {user.assignedStores.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      他{user.assignedStores.length - 3}店舗...
                    </div>
                  )}
                </div>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              <Settings className="h-4 w-4 mr-2" />
              設定
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    {/* Help Guide Modal - Rendered outside header for proper z-index */}
    <HelpGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  )
}