/**
 * スーパー管理者バナーコンポーネント
 *
 * スーパー管理者モードであることを明示的に表示し、
 * 組織切り替え機能を提供します。
 */

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface SuperAdminBannerProps {
  organizationName?: string
  onSwitchOrganization?: () => void
}

export const SuperAdminBanner: React.FC<SuperAdminBannerProps> = ({
  organizationName,
  onSwitchOrganization
}) => {
  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div className="flex flex-col">
          <span className="font-semibold text-sm">スーパー管理者モード</span>
          {organizationName && (
            <span className="text-xs opacity-90">
              現在の組織: {organizationName}
            </span>
          )}
        </div>
      </div>
      {onSwitchOrganization && (
        <button
          onClick={onSwitchOrganization}
          className="px-3 py-1 bg-white text-red-600 rounded text-sm font-medium hover:bg-red-50 transition-colors"
        >
          組織を切り替え
        </button>
      )}
    </div>
  )
}
