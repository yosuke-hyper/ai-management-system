import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/authcontext'
import { TermsAcceptanceModal } from './termsacceptancemodal'
import { supabase } from '@/lib/supabase'

export default function AuthGate() {
  const { isInitialized, isAuthenticated, isDemoMode, user } = useAuth()
  const location = useLocation()
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)
  const [checkingTerms, setCheckingTerms] = useState(true)

  useEffect(() => {
    if (user?.id) {
      checkTermsAcceptance()
    }
  }, [user?.id])

  const checkTermsAcceptance = async () => {
    if (!user?.id) return

    // デモモードの場合は利用規約チェックをスキップ
    if (user.id === 'demo-user') {
      setTermsAccepted(true)
      setCheckingTerms(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('terms_accepted, privacy_accepted')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Failed to check terms acceptance:', error)
        setTermsAccepted(false)
      } else if (!data) {
        // プロフィールが見つからない場合は規約未承認とする
        setTermsAccepted(false)
      } else {
        setTermsAccepted(data?.terms_accepted && data?.privacy_accepted)
      }
    } catch (err) {
      console.error('Error checking terms:', err)
      setTermsAccepted(false)
    } finally {
      setCheckingTerms(false)
    }
  }

  if (!isInitialized || checkingTerms) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !isDemoMode) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (termsAccepted === false && user?.id && !isDemoMode) {
    return (
      <TermsAcceptanceModal
        userId={user.id}
        onAccepted={() => {
          setTermsAccepted(true)
        }}
      />
    )
  }

  return <Outlet />
}
