import React, { useState } from 'react';
import { User, Settings, LogOut, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">業務報告システム</h1>
          <p className="text-sm text-gray-500">Restaurant Business Report System</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <User className="w-5 h-5 text-gray-600" />
            <div className="text-sm text-left">
              <p className="font-medium text-gray-900">{profile?.name || 'ユーザー'}</p>
              <p className="text-gray-500 capitalize">{profile?.role || 'staff'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                設定
              </button>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};