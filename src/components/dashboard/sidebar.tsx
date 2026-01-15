import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar,
  TrendingUp, 
  Target,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  FileSpreadsheet,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user?: { name: string; role: string } | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  user,
  onLogout
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'ダッシュボード',
      icon: BarChart3,
      description: '売上概要'
    },
    {
      id: 'reports',
      label: '分析レポート',
      icon: Calendar,
      description: '期間別分析'
    },
    {
      id: 'targets',
      label: '目標達成度',
      icon: Target,
      description: '目標vs実績'
    },
    {
      id: 'stores',
      label: '店舗管理',
      icon: Store,
      description: '店舗設定'
    },
    {
      id: 'chat',
      label: 'AIチャット',
      icon: MessageCircle,
      description: 'データ分析AI'
    },
    {
      id: 'settings',
      label: '設定',
      icon: Settings,
      description: 'システム設定'
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full ${
      isCollapsed ? 'w-16' : 'w-64'
    } transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">業務分析</h2>
              <p className="text-xs text-gray-500">Restaurant Analytics</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {user && !isCollapsed && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${
                isActive 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => onViewChange(item.id)}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="ml-3 text-left">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {onLogout && (
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <div className="ml-3 text-left">
                <div className="text-sm font-medium">ログアウト</div>
              </div>
            )}
          </Button>
        )}
        
        {!isCollapsed && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Version 1.0.0 MVP
            </p>
          </div>
        )}
      </div>
    </div>
  );
};