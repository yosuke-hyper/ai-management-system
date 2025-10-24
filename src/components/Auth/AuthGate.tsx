import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { TermsAcceptanceModal } from './TermsAcceptanceModal'
import { supabase } from '@/lib/supabase'

export default function AuthGate() {
  const { isInitialized, isAuthenticated, user } = useAuth()
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('terms_accepted, privacy_accepted')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Failed to check terms acceptance:', error)
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (termsAccepted === false && user?.id) {
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
