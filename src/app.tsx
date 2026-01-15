import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MainLayout } from './layout/mainlayout'
import { LoginForm } from './components/auth/loginform'
import { useAuth } from './contexts/authcontext'
import { OrganizationProvider } from './contexts/organizationcontext'
import { AdminDataProvider } from './contexts/admindatacontext'
import { StoreProvider } from './contexts/storecontext'
import { ErrorProvider } from './contexts/errorcontext'
import { AvatarProvider } from './contexts/avatarcontext'
import { TourProvider } from './contexts/tourcontext'
import { ErrorBoundary } from './components/error/errorboundary'
import { ErrorNotification } from './components/error/errornotification'
import { supabase } from './lib/supabase'

// Lazy load page components for better performance
const DashboardDaily = lazy(() => import('./pages/dashboarddaily').then(m => ({ default: m.DashboardDaily })))
const DashboardWeekly = lazy(() => import('./pages/dashboardweekly').then(m => ({ default: m.DashboardWeekly })))
const DashboardMonthly = lazy(() => import('./pages/dashboardmonthly').then(m => ({ default: m.DashboardMonthly })))
const Targets = lazy(() => import('./pages/targets').then(m => ({ default: m.Targets })))
const AIChatPage = lazy(() => import('./pages/aichatpage').then(m => ({ default: m.AIChatPage })))
const AdminSettings = lazy(() => import('./pages/adminsettings').then(m => ({ default: m.AdminSettings })))
const ReportForm = lazy(() => import('./pages/reportform').then(m => ({ default: m.ReportForm })))
const MonthlyExpenseForm = lazy(() => import('./pages/monthlyexpenseform').then(m => ({ default: m.MonthlyExpenseForm })))
const AIReportsPage = lazy(() => import('./pages/aireportspage').then(m => ({ default: m.AIReportsPage })))
const OrganizationSettings = lazy(() => import('./pages/organizationsettings').then(m => ({ default: m.OrganizationSettings })))
const InvitationAccept = lazy(() => import('./pages/invitationaccept').then(m => ({ default: m.InvitationAccept })))
const SharedReport = lazy(() => import('./pages/sharedreport'))
const TermsOfService = lazy(() => import('./pages/termsofservice').then(m => ({ default: m.TermsOfService })))
const PrivacyPolicy = lazy(() => import('./pages/privacypolicy').then(m => ({ default: m.PrivacyPolicy })))
const ProjectDownload = lazy(() => import('./pages/projectdownload').then(m => ({ default: m.ProjectDownload })))
const PasswordReset = lazy(() => import('./pages/passwordreset').then(m => ({ default: m.PasswordReset })))
const PasswordResetConfirm = lazy(() => import('./pages/passwordresetconfirm').then(m => ({ default: m.PasswordResetConfirm })))
const SubscriptionManagement = lazy(() => import('./pages/subscriptionmanagement'))
const DemoSession = lazy(() => import('./pages/demosession'))
const DemoStart = lazy(() => import('./pages/demostart'))
const DemoRegistration = lazy(() => import('./pages/demoregistration'))
const DataManagement = lazy(() => import('./pages/datamanagement').then(m => ({ default: m.DataManagement })))
const Support = lazy(() => import('./pages/support'))
const FAQ = lazy(() => import('./pages/faq'))
const DailyGoalDemo = lazy(() => import('./pages/dailygoaldemo'))

const Spinner: React.FC<{ msg?: string }> = ({ msg = '認証処理中です...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600 text-lg">{msg}</p>
    </div>
  </div>
)

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized, isAuthenticated, isDemoMode } = useAuth()
  const loc = useLocation()
  const inCallback =
    loc.pathname === '/auth/callback' ||
    loc.search.includes('code=') || loc.search.includes('state=') ||
    loc.hash.includes('access_token=')

  if (!isInitialized || inCallback) return <Spinner />
  if (!isAuthenticated && !isDemoMode) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { isInitialized, isAuthenticated, isDemoMode, user } = useAuth()

  console.log('🔍 App render:', { isInitialized, isAuthenticated, isDemoMode, user: user?.email })

  useEffect(() => {
    const testOrgMembership = async () => {
      if (!isAuthenticated || !user) return

      const orgId = "d4f835bf-3be8-4081-b867-dedbe8134056"
      const { data, error } = await supabase.rpc("check_org_membership", { p_org_id: orgId })
      console.log("🔍 check_org_membership rpc:", { data, error, userId: user.id, orgId })
    }

    testOrgMembership()
  }, [isAuthenticated, user])

  // 初期化中はスピナーを表示
  if (!isInitialized) {
    console.log('⏳ Still initializing...')
    return <Spinner msg="読み込み中..." />
  }

  console.log('✅ Initialized, rendering routes')

  return (
    <ErrorBoundary>
      <OrganizationProvider userId={user?.id || null}>
        <ErrorProvider>
          <AdminDataProvider>
            <StoreProvider>
              <AvatarProvider>
                <TourProvider>
                  <Toaster position="top-center" />
                  <ErrorNotification />
                  <Suspense fallback={<Spinner msg="ページを読み込み中..." />}>
                  <Routes>
            <Route path="/auth/callback" element={<Spinner />} />

            <Route path="/demo/start" element={<DemoStart />} />
            <Route path="/demo/register" element={<DemoRegistration />} />
            <Route path="/demo/:shareToken" element={<DemoSession />} />
            <Route path="/share/report/:shareToken" element={<SharedReport />} />
            <Route path="/invite/:token" element={<InvitationAccept />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/download" element={<ProjectDownload />} />
            <Route path="/daily-goal-demo" element={<DailyGoalDemo />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/reset-password-confirm" element={<PasswordResetConfirm />} />

            <Route path="/login" element={
              (() => {
                console.log('🚪 /login route, isAuthenticated:', isAuthenticated, 'isDemoMode:', isDemoMode)
                return (isAuthenticated || isDemoMode) ? <Navigate to="/dashboard/daily" replace /> : <LoginForm />
              })()
            } />
            <Route path="/signup" element={<LoginForm />} />

            <Route path="/" element={
              (() => {
                console.log('🏠 Root route, redirecting to:', (isAuthenticated || isDemoMode) ? '/dashboard/daily' : '/login')
                return <Navigate to={(isAuthenticated || isDemoMode) ? '/dashboard/daily' : '/login'} replace />
              })()
            } />

            <Route path="/dashboard" element={<AuthGate><MainLayout /></AuthGate>}>
              <Route index element={<Navigate to="/dashboard/daily" replace />} />
              <Route path="daily" element={<DashboardDaily />} />
              <Route path="weekly" element={<DashboardWeekly />} />
              <Route path="monthly" element={<DashboardMonthly />} />
              <Route path="targets" element={<Targets />} />
              <Route path="chat" element={<AIChatPage />} />
              <Route path="ai-reports" element={<AIReportsPage />} />
              <Route path="admin" element={<AdminSettings />} />
              <Route path="staff" element={<Navigate to="/dashboard/organization" replace />} />
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="subscription" element={<SubscriptionManagement />} />
              <Route path="report/new" element={<ReportForm />} />
              <Route path="report" element={<ReportForm />} />
              <Route path="expenses/monthly" element={<MonthlyExpenseForm />} />
              <Route path="data-management" element={<DataManagement />} />
              <Route path="support" element={<Support />} />
              <Route path="faq" element={<FAQ />} />
            </Route>

            <Route path="*" element={<Navigate to={(isAuthenticated || isDemoMode) ? '/dashboard/daily' : '/login'} replace />} />
            </Routes>
          </Suspense>
                </TourProvider>
              </AvatarProvider>
            </StoreProvider>
          </AdminDataProvider>
        </ErrorProvider>
      </OrganizationProvider>
    </ErrorBoundary>
  )
}
