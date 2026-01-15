import React, { useTransition } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, User, LogOut, Settings, ChevronDown, Store, Shield, Loader2, Tag, X, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminData } from '@/contexts/admindatacontext'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import { useBrands } from '@/hooks/usebrands'
import { DemoBanner } from '@/components/demo/demobanner'
import { NotificationBell } from '@/components/notifications/notificationbell'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialStore = params.get('store') || 'all'
  // 業態フィルターをlocalStorageから復元（URLパラメータが優先）
  const savedBrand = localStorage.getItem('selectedBrandId') || ''
  const initialBrand = params.get('brand') || savedBrand
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(initialStore)
  const [selectedBrandId, setSelectedBrandId] = React.useState<string>(initialBrand)
  const { stores } = useAdminData()
  const { user, signOut, isDemoMode, exitDemoMode } = useAuth()
  const { subscriptionStatus, organizationRole } = useOrganization()
  const { brands, getBrandById } = useBrands()

  // デバッグログ
  React.useEffect(() => {
    console.log('📊 Header: brands:', brands)
    console.log('📊 Header: brands.length:', brands.length)
    console.log('📊 Header: brands詳細:', brands.map(b => ({
      id: b.id,
      name: b.name,
      displayName: b.displayName,
      icon: b.icon,
      isActive: b.isActive
    })))
    console.log('📊 Header: isDemoMode:', isDemoMode)
    console.log('📊 Header: user:', user)
  }, [brands, isDemoMode, user])

  // ✅ startTransition: 重い集計と競合しないようにUI更新を緩和
  const [isPending, startTransition] = useTransition()

  const currentPeriod = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  // アクセス可能な店舗を計算（業態フィルター適用）
  const accessibleStores = React.useMemo(() => {
    console.log('🔄 accessibleStores useMemo 実行')
    console.log('🔄 user:', user)
    console.log('🔄 isDemoMode:', isDemoMode)
    console.log('🔄 stores from AdminDataContext:', stores)
    console.log('🔄 selectedBrandId:', selectedBrandId)

    // デモモードの場合は user が null でも stores を使用
    if (isDemoMode) {
      console.log('🎭 Demo mode: Using stores directly')
      const storeList = stores.map(s => ({ id: s.id, name: s.name, brandId: s.brandId }))
      console.log('🏪 Demo mode stores:', storeList)

      // 業態フィルターが指定されている場合、その業態の店舗のみ表示
      if (selectedBrandId) {
        console.log('🔍 業態フィルター適用前:', storeList)
        console.log('🔍 選択された業態ID:', selectedBrandId)
        const filteredStores = storeList.filter((s: any) => {
          console.log(`🔍 店舗: ${s.name}, brandId: ${s.brandId}, 一致: ${s.brandId === selectedBrandId}`)
          return s.brandId === selectedBrandId
        })
        console.log('🔍 業態フィルター適用後:', filteredStores)
        return filteredStores
      }

      return storeList
    }

    if (!user) {
      console.log('❌ user is null, returning empty array')
      return []
    }

    let storeList: Array<{ id: string; name: string; brandId?: string | null }> = []

    // スーパー管理者または管理者権限の場合は stores（AdminDataContext経由）を使用
    if (user.isSuperAdmin || user.role === 'admin' || user.role === 'owner') {
      console.log('✅ User is admin/owner/super admin, mapping stores...')
      storeList = stores.map(s => ({ id: s.id, name: s.name, brandId: s.brandId }))
      console.log('🏪 Header: 管理者店舗リスト:', storeList)
    } else {
      console.log('👤 User is not admin, using assignedStores')
      // 非管理者は assignedStores を使用
      storeList = user.assignedStores || []
    }

    // 業態フィルターが指定されている場合、その業態の店舗のみ表示
    if (selectedBrandId) {
      console.log('🔍 業態フィルター適用前:', storeList)
      console.log('🔍 選択された業態ID:', selectedBrandId)
      const filteredStores = storeList.filter((s: any) => {
        console.log(`🔍 店舗: ${s.name}, brandId: ${s.brandId}, 一致: ${s.brandId === selectedBrandId}`)
        return s.brandId === selectedBrandId
      })
      console.log('🔍 業態フィルター適用後:', filteredStores)
      storeList = filteredStores
    }

    return storeList
  }, [user, stores, selectedBrandId, isDemoMode])
  const selectedStore = accessibleStores.find((s: any) => s.id === selectedStoreId)
  const selectedBrand = getBrandById(selectedBrandId)

  // URLパラメータの変更を監視してstateを同期
  React.useEffect(() => {
    const currentParams = new URLSearchParams(location.search)
    const urlStoreId = currentParams.get('store') || 'all'
    const urlBrandId = currentParams.get('brand')

    // URLのstoreIdとstateが異なる場合のみ更新
    if (urlStoreId !== selectedStoreId) {
      setSelectedStoreId(urlStoreId)
    }

    // URLに明示的にbrandパラメータがある場合のみ、それを使用
    if (urlBrandId !== null && urlBrandId !== selectedBrandId) {
      setSelectedBrandId(urlBrandId)
      localStorage.setItem('selectedBrandId', urlBrandId)
    }
  }, [location.search])

  const onChangeStore = (id: string) => {
    console.log('🟢 onChangeStore called with:', id)
    // ✅ 状態更新を並行レンダに逃がす（体感フリーズ解消）
    startTransition(() => {
      console.log('🟢 Setting selectedStoreId to:', id)
      setSelectedStoreId(id)
      const p = new URLSearchParams(location.search)
      // 'all' を選択した場合も明示的にURLに残す
      p.set('store', id)
      const newUrl = `${location.pathname}?${p.toString()}`
      console.log('🟢 Navigating to:', newUrl)
      navigate(newUrl, { replace: true })
    })
  }

  const onChangeBrand = (brandId: string) => {
    startTransition(() => {
      setSelectedBrandId(brandId)
      // localStorageに保存
      if (brandId) {
        localStorage.setItem('selectedBrandId', brandId)
      } else {
        localStorage.removeItem('selectedBrandId')
      }

      const p = new URLSearchParams(location.search)
      if (!brandId) {
        p.delete('brand')
        // 業態フィルタークリア時は店舗も「all」にリセット
        p.set('store', 'all')
        setSelectedStoreId('all')
      } else {
        p.set('brand', brandId)
        // 業態が選択されても店舗は「all」を維持
        // これにより、業態フィルター後の店舗が表示される
        if (selectedStoreId !== 'all') {
          // 現在選択中の店舗が新しい業態に属していない場合のみ「all」にリセット
          p.set('store', 'all')
          setSelectedStoreId('all')
        }
      }
      navigate(`${location.pathname}?${p.toString()}`, { replace: true })
    })
  }

  const clearBrandFilter = () => {
    onChangeBrand('')
  }

  const handleSignOut = async () => {
    if (isDemoMode) {
      exitDemoMode()
    } else {
      await signOut()
    }
    navigate('/')
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield className="h-3 w-3 text-red-600" />
      case 'admin': return <Shield className="h-3 w-3 text-blue-600" />
      case 'manager': return <User className="h-3 w-3 text-green-600" />
      case 'staff': return <User className="h-3 w-3 text-slate-600" />
      default: return <User className="h-3 w-3" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'admin': return '管理者'
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  // 店舗・業態選択を表示するページ（日次・週次・月次ダッシュボード）
  // 目標達成度ページはページ内に独自のセレクターを持つため除外
  const showFilters = [
    '/dashboard/daily',
    '/dashboard/weekly',
    '/dashboard/monthly'
  ].includes(location.pathname)

  return (
    <>
    {isDemoMode && (
      <DemoBanner
        expiresAt={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
      />
    )}
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 relative">
        {/* First Row - Title and User Menu */}
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden flex-shrink-0"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold text-foreground truncate leading-tight">
                  FoodValue for 経営分析
                </h1>
                <p className="text-xs text-muted-foreground truncate leading-tight hidden sm:block">
                  {currentPeriod}の分析
                  {selectedStoreId === 'all' ? '（全店舗合計）' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Right section - Help & User menu */}
          <div className="min-w-0 flex-shrink-0 flex items-center gap-1 sm:gap-2">
            {/* Trial Status Badge */}
            {subscriptionStatus.isTrialing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/subscription')}
                className="hidden sm:flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Badge variant="outline" className="border-blue-600 text-blue-600">
                  トライアル残り {subscriptionStatus.daysLeft}日
                </Badge>
              </Button>
            )}

            {/* Notification Bell */}
            {!isDemoMode && <NotificationBell />}

            {/* Points Display - Desktop */}
            {!isDemoMode && user?.points !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">
                  {user.points.toLocaleString()}
                </span>
              </div>
            )}

            {/* Points Display - Mobile (Compact) */}
            {!isDemoMode && user?.points !== undefined && (
              <div className="flex sm:hidden items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md">
                <Coins className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                  {user.points.toLocaleString()}
                </span>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 px-2 h-9">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm max-w-[80px] truncate">
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
            <DropdownMenuContent align="end" className="w-56 max-w-[85vw] sm:max-w-[calc(100vw-2rem)]">
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
              {!isDemoMode && user?.points !== undefined && (
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                    <Coins className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-amber-700">
                        {user.points.toLocaleString()} ポイント
                      </div>
                      {user.totalPoints !== undefined && (
                        <div className="text-xs text-amber-600">
                          累計: {user.totalPoints.toLocaleString()}P
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
              <DropdownMenuItem onClick={() => navigate('/dashboard/admin')}>
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

        {/* Second Row - Brand & Store Selector (Mobile only) */}
        {showFilters && (
          <div className="flex flex-col gap-2 pb-3 sm:hidden">
            {/* 業態フィルター - デバッグ用に常に表示 */}
            <div className="flex items-center gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
              ) : (
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <select
                value={selectedBrandId}
                onChange={(e) => onChangeBrand(e.target.value)}
                disabled={isPending}
                className="flex-1 px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <option value="">🏯 業態フィルターなし (brands: {brands.length})</option>
                {user?.role === 'owner' && (
                  <option value="headquarters">🏛️ 本部（全業態・全店舗）</option>
                )}
                {brands.map(brand => {
                  console.log('🎨 Rendering brand option:', brand.displayName, 'icon:', brand.icon, 'isActive:', brand.isActive)
                  return (
                    <option key={brand.id} value={brand.id}>
                      {brand.icon} {brand.displayName}
                    </option>
                  )
                })}
              </select>
              {selectedBrandId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearBrandFilter}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* 店舗フィルター */}
            <div className="flex items-center gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
              ) : (
                <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  console.log('🔵 Store selector changed to:', e.target.value)
                  onChangeStore(e.target.value)
                }}
                disabled={isPending}
                className="flex-1 px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {(user?.role === 'admin' || user?.role === 'owner' || isDemoMode) && (
                  <option value="all">
                    🏢 {selectedBrandId === 'headquarters' ? '本部 全業態・全店舗（合計）' : selectedBrand ? `${selectedBrand.displayName}業態 全店舗（合計）` : '全店舗（合計）'}
                  </option>
                )}
                {accessibleStores.map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Brand & Store Selector (Desktop - inline with title) */}
        {showFilters && (
          <div className="hidden sm:flex items-center gap-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* 業態フィルター - デバッグ用に常に表示 */}
            <>
              {isPending ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Tag className="h-4 w-4 text-muted-foreground" />
              )}
              <select
                value={selectedBrandId}
                onChange={(e) => onChangeBrand(e.target.value)}
                disabled={isPending}
                className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring w-48 max-w-[40vw] disabled:opacity-50 disabled:cursor-not-allowed"
                style={selectedBrand ? {
                  borderColor: selectedBrand.color,
                  color: selectedBrand.color
                } : {}}
              >
                <option value="">🏯 業態フィルターなし (brands: {brands.length})</option>
                {user?.role === 'owner' && (
                  <option value="headquarters">🏛️ 本部（全業態・全店舗）</option>
                )}
                {brands.map(brand => {
                  console.log('🎨 Rendering brand option:', brand.displayName, 'icon:', brand.icon, 'isActive:', brand.isActive)
                  return (
                    <option key={brand.id} value={brand.id}>
                      {brand.icon} {brand.displayName}
                    </option>
                  )
                })}
              </select>
              {selectedBrandId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearBrandFilter}
                  className="h-8 w-8"
                  title="業態フィルターをクリア"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
            {/* 店舗フィルター */}
            {isPending ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Store className="h-4 w-4 text-muted-foreground" />
            )}
            <select
              value={selectedStoreId}
              onChange={(e) => {
                console.log('🔵 Store selector (desktop) changed to:', e.target.value)
                onChangeStore(e.target.value)
              }}
              disabled={isPending}
              className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64 max-w-[45vw] disabled:opacity-50 disabled:cursor-not-allowed"
              data-tour="store-selector"
            >
              {(user?.role === 'admin' || user?.role === 'owner' || isDemoMode) && (
                <option value="all">
                  🏢 {selectedBrandId === 'headquarters' ? '本部 全業態・全店舗（合計）' : selectedBrand ? `${selectedBrand.displayName}業態 全店舗（合計）` : '全店舗（合計）'}
                </option>
              )}
              {accessibleStores.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {selectedBrandId === 'headquarters' ? (
              <Badge
                variant="outline"
                className="text-xs border-purple-500 text-purple-700 bg-purple-50"
              >
                🏛️ 本部
              </Badge>
            ) : selectedBrand && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: selectedBrand.color,
                  color: selectedBrand.color
                }}
              >
                {selectedBrand.icon} {selectedBrand.displayName}
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
    </>
  )
}