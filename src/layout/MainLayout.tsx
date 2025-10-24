import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { StoreProvider } from '@/contexts/StoreContext'
import { AdminDataProvider } from '@/contexts/AdminDataContext'
import { AIReportNotification } from '@/components/Dashboard/AIReportNotification'
import { Footer } from '@/components/layout/Footer'

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // フッターを表示するページ
  const showFooter = ['/admin', '/organization'].includes(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminDataProvider>
        <StoreProvider>
          <div className="flex h-screen">
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0">
              <Header onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-auto flex flex-col">
                <div className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-6">
                  <Outlet />
                </div>
                {showFooter && <Footer />}
              </main>
            </div>
          </div>
          <AIReportNotification />
        </StoreProvider>
      </AdminDataProvider>
    </div>
  )
}