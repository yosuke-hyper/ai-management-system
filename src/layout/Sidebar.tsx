import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChartBar as BarChart3, Calendar, Target, MessageSquare, X, TrendingUp, Settings, Users, FileText, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    icon: BarChart3,
    children: [
      { id: 'daily', label: '日次分析', path: '/dashboard/daily' },
      { id: 'weekly', label: '週次分析', path: '/dashboard/weekly' },
      { id: 'monthly', label: '月次分析', path: '/dashboard/monthly' }
    ]
  },
  {
    id: 'targets',
    label: '目標達成度',
    icon: Target,
    path: '/targets'
  },
  {
    id: 'chat',
    label: 'AIチャット',
    icon: MessageSquare,
    path: '/chat',
    badge: 'Beta'
  },
  {
    id: 'ai-reports',
    label: 'AI分析レポート',
    icon: FileText,
    path: '/ai-reports'
  },
  {
    id: 'report',
    label: '日報入力',
    icon: Calendar,
    path: '/report/new'
  },
  {
    id: 'monthly-expense',
    label: '月次経費入力',
    icon: Calendar,
    path: '/expenses/monthly'
  },
  {
    id: 'staff',
    label: 'スタッフ管理',
    icon: Users,
    path: '/staff'
  },
  {
    id: 'organization',
    label: '組織設定',
    icon: Building,
    path: '/organization'
  },
  {
    id: 'admin',
    label: 'システム設定',
    icon: Settings,
    path: '/admin'
  }
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleNavigation = (path: string) => {
    // 現在のURLから店舗IDを取得
    const currentParams = new URLSearchParams(location.search)
    const currentStoreId = currentParams.get('store')

    // 店舗IDが選択されている場合は、新しいパスにも引き継ぐ
    if (currentStoreId) {
      const newUrl = `${path}?store=${currentStoreId}`
      navigate(newUrl)
    } else {
      navigate(path)
    }
    onClose()
  }

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  // 権限に応じてメニューアイテムをフィルタリング
  const getVisibleMenuItems = () => {
    if (!user) return []
    
    const allItems = menuItems
    
    // スタッフの場合は基本機能のみ
    if (user.role === 'staff') {
      return allItems.filter(item => 
        ['dashboard', 'report', 'chat'].includes(item.id)
      )
    }
    
    // 店長の場合は一部管理機能のみ表示
    if (user.role === 'manager') {
      return allItems
    }
    
    // 統括は全機能アクセス可能
    return allItems
  }

  const visibleMenuItems = getVisibleMenuItems()
  return (
    <>
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">
                Analytics
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              const hasChildren = !!item.children
              const isParentActive = hasChildren 
                ? item.children.some(child => isActivePath(child.path))
                : isActivePath(item.path || '')

              return (
                <div key={item.id}>
                  {/* Parent item */}
                  {item.id === 'admin' || item.id === 'staff' ? (
                    <PermissionGuard requiredRole={item.id === 'admin' ? 'admin' : 'manager'} showError={false}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-auto py-3 px-3",
                          isParentActive && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => !hasChildren && handleNavigation(item.path!)}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </PermissionGuard>
                  ) : (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-3 px-3",
                        isParentActive && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => !hasChildren && handleNavigation(item.path!)}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  )}

                  {/* Children items */}
                  {hasChildren && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Button
                          key={child.id}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-sm py-2",
                            isActivePath(child.path) && "bg-primary text-primary-foreground"
                          )}
                          onClick={() => handleNavigation(child.path)}
                        >
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {user && (
              <div className="mb-3 p-2 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">ログイン中</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    user.role === 'admin' ? 'bg-red-500' :
                    user.role === 'manager' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`} />
                  <div className="text-xs font-medium truncate">{user.name}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.role === 'admin' ? '統括権限' :
                   user.role === 'manager' ? '店長権限' :
                   'スタッフ権限'}
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Version 1.0.0
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}