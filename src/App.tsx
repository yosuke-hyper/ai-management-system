import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MainLayout } from './layout/MainLayout'
import { LoginForm } from './components/auth/LoginForm'
import { DashboardDaily } from './pages/DashboardDaily'
import { DashboardWeekly } from './pages/DashboardWeekly'
import { DashboardMonthly } from './pages/DashboardMonthly'
import { Targets } from './pages/Targets'
import { AIChatPage } from './pages/AIChatPage'
import { AdminSettings } from './pages/AdminSettings'
import { StaffManagement } from './pages/StaffManagement'
import { ReportForm } from './pages/ReportForm'
import { MonthlyExpenseForm } from './pages/MonthlyExpenseForm'
import { AIReportsPage } from './pages/AIReportsPage'
import { OrganizationSettings } from './pages/OrganizationSettings'
import { InvitationAccept } from './pages/InvitationAccept'
import SharedReport from './pages/SharedReport'
import { TermsOfService } from './pages/TermsOfService'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { ProjectDownload } from './pages/ProjectDownload'
import { useAuth } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'

const Spinner: React.FC<{ msg?: string }> = ({ msg = '認証処理中です...' }) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600 text-lg">{msg}</p>
    </div>
  </div>
)

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized, isAuthenticated } = useAuth()
  const loc = useLocation()
  const inCallback =
    loc.pathname === '/auth/callback' ||
    loc.search.includes('code=') || loc.search.includes('state=') ||
    loc.hash.includes('access_token=')

  if (!isInitialized || inCallback) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { isInitialized, isAuthenticated, user } = useAuth()
  console.log('🎯 App render:', { isInitialized, isAuthenticated })

  return (
    <OrganizationProvider userId={user?.id || null}>
      <Routes>
        <Route path="/auth/callback" element={<Spinner />} />

        <Route path="/share/report/:shareToken" element={<SharedReport />} />
        <Route path="/invite/:token" element={<InvitationAccept />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/download" element={<ProjectDownload />} />

        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard/daily" replace /> : <LoginForm />} />

        <Route path="/" element={<AuthGate><MainLayout /></AuthGate>}>
          <Route index element={<Navigate to="/dashboard/daily" replace />} />
          <Route path="dashboard/daily" element={<DashboardDaily />} />
          <Route path="dashboard/weekly" element={<DashboardWeekly />} />
          <Route path="dashboard/monthly" element={<DashboardMonthly />} />
          <Route path="targets" element={<Targets />} />
          <Route path="chat" element={<AIChatPage />} />
          <Route path="ai-reports" element={<AIReportsPage />} />
          <Route path="admin" element={<AdminSettings />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="organization" element={<OrganizationSettings />} />
          <Route path="report/new" element={<ReportForm />} />
          <Route path="report" element={<ReportForm />} />
          <Route path="expenses/monthly" element={<MonthlyExpenseForm />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard/daily' : '/login'} replace />} />
      </Routes>
    </OrganizationProvider>
  )
}
