import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { AIReportNotification } from '@/components/dashboard/aireportnotification'
import { Footer } from '@/components/layout/footer'
import { ReadOnlyBanner } from '@/components/ui/read-only-banner'
import { TrialExpiringAlert } from '@/components/subscription/trialexpiringalert'
import { AiAvatar } from '@/components/avatar/aiavatar'
import { WelcomeModal } from '@/components/onboarding/welcomemodal'
import { OnboardingChecklist } from '@/components/onboarding/onboardingchecklist'
import { useAuth } from '@/contexts/authcontext'
import { useAvatar } from '@/contexts/avatarcontext'
import { useOnboarding } from '@/hooks/useonboarding'
import { registerAvatarCallback } from '@/lib/avatartoast'

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { isDemoMode, user } = useAuth()
  const { emotion, message, setEmotionWithMessage, equippedItems } = useAvatar()
  const { showWelcomeModal, closeWelcomeModal, isOnboardingActive, loading: onboardingLoading } = useOnboarding()

  useEffect(() => {
    if (showWelcomeModal) {
      console.log('🎉 WelcomeModal should be displayed!', {
        isDemoMode,
        showWelcomeModal,
        userId: user?.id
      });
    }
  }, [showWelcomeModal, isDemoMode, user?.id])

  useEffect(() => {
    registerAvatarCallback(setEmotionWithMessage)
  }, [setEmotionWithMessage])

  const showFooter = ['/admin', '/organization'].includes(location.pathname)
  const isChatPage = location.pathname === '/dashboard/chat'
  const hideGlobalAvatar = isChatPage

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!isDemoMode && <ReadOnlyBanner />}
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
      <TrialExpiringAlert />
      {!hideGlobalAvatar && (
        <AiAvatar
          emotion={emotion}
          message={message}
          helpChatPosition="right"
          enableCustomize={false}
          equippedItems={equippedItems}
        />
      )}
      {!isDemoMode && showWelcomeModal && (
        <WelcomeModal onClose={closeWelcomeModal} />
      )}
    </div>
  )
}