import React from 'react';
import { 
  BarChart3, 
  FileText, 
  MessageCircle, 
  Settings, 
  Store,
  Calendar,
  TrendingUp,
  Users,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
  { id: 'reports', label: '日次報告', icon: FileText },
  { id: 'analytics', label: '分析', icon: TrendingUp },
  { id: 'stores', label: '店舗管理', icon: Store },
  { id: 'calendar', label: 'カレンダー', icon: Calendar },
  { id: 'chat', label: 'AIチャット', icon: MessageCircle },
  { id: 'team', label: 'チーム', icon: Users },
  { id: 'settings', label: '設定', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isOpen, 
  onClose 
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-4 border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onTabChange(item.id);
                        onClose();
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                        transition-colors duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Version 1.0.0 MVP
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};