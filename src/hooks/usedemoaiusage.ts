import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DemoAIUsageStatus {
  found: boolean;
  isExpired: boolean;
  expiresAt: string;
  chat: {
    used: number;
    limit: number;
    remaining: number;
    lastUsedAt: string | null;
  };
  report: {
    used: number;
    limit: number;
    remaining: number;
    lastUsedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DemoAICheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  featureType: 'chat' | 'report';
  demoSessionId: string;
  expiresAt: string;
  message: string;
  error?: string;
}

export interface UseDemoAIUsageResult {
  status: DemoAIUsageStatus | null;
  loading: boolean;
  error: string | null;
  checkUsage: (featureType: 'chat' | 'report') => Promise<DemoAICheckResult | null>;
  incrementUsage: (featureType: 'chat' | 'report') => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage AI usage limits for demo sessions
 */
export function useDemoAIUsage(demoSessionId: string | null): UseDemoAIUsageResult {
  const [status, setStatus] = useState<DemoAIUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageStatus = useCallback(async () => {
    console.log('🔍 useDemoAIUsage: Fetching status for session:', demoSessionId);

    if (!demoSessionId || !supabase) {
      console.log('⚠️ useDemoAIUsage: No demo session ID or supabase client');
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_demo_ai_usage_status', {
        p_demo_session_id: demoSessionId
      });

      console.log('📊 useDemoAIUsage: RPC response:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ Failed to fetch demo AI usage status:', rpcError);
        setError(rpcError.message);
        setStatus(null);
      } else if (data) {
        const statusObj = {
          found: data.found,
          isExpired: data.is_expired,
          expiresAt: data.expires_at,
          chat: {
            used: data.chat?.used || 0,
            limit: data.chat?.limit || 5,
            remaining: data.chat?.remaining || 5,
            lastUsedAt: data.chat?.last_used_at || null
          },
          report: {
            used: data.report?.used || 0,
            limit: data.report?.limit || 3,
            remaining: data.report?.remaining || 3,
            lastUsedAt: data.report?.last_used_at || null
          },
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        console.log('✅ useDemoAIUsage: Status set:', statusObj);
        setStatus(statusObj);
      }
    } catch (err) {
      console.error('❌ Error fetching demo AI usage status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [demoSessionId]);

  const checkUsage = useCallback(async (featureType: 'chat' | 'report'): Promise<DemoAICheckResult | null> => {
    if (!demoSessionId || !supabase) {
      return null;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('check_demo_ai_usage', {
        p_demo_session_id: demoSessionId,
        p_feature_type: featureType
      });

      if (rpcError) {
        console.error('Failed to check demo AI usage:', rpcError);
        return null;
      }

      return {
        allowed: data.allowed,
        currentCount: data.current_count,
        limit: data.limit,
        remaining: data.remaining,
        featureType: data.feature_type,
        demoSessionId: data.demo_session_id,
        expiresAt: data.expires_at,
        message: data.message,
        error: data.error
      };
    } catch (err) {
      console.error('Error checking demo AI usage:', err);
      return null;
    }
  }, [demoSessionId]);

  const incrementUsage = useCallback(async (featureType: 'chat' | 'report'): Promise<boolean> => {
    if (!demoSessionId || !supabase) {
      return false;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('increment_demo_ai_usage', {
        p_demo_session_id: demoSessionId,
        p_feature_type: featureType
      });

      if (rpcError) {
        console.error('Failed to increment demo AI usage:', rpcError);
        return false;
      }

      if (data && data.success) {
        await fetchUsageStatus();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error incrementing demo AI usage:', err);
      return false;
    }
  }, [demoSessionId, fetchUsageStatus]);

  const refresh = useCallback(async () => {
    await fetchUsageStatus();
  }, [fetchUsageStatus]);

  useEffect(() => {
    fetchUsageStatus();
  }, [fetchUsageStatus]);

  return {
    status,
    loading,
    error,
    checkUsage,
    incrementUsage,
    refresh
  };
}

/**
 * Check if current session is a demo session
 */
export function isDemoSession(): boolean {
  if (typeof window === 'undefined') return false;

  const demoSessionId = localStorage.getItem('demo_session_id');
  const demoShareToken = localStorage.getItem('demo_share_token');

  return !!(demoSessionId && demoShareToken);
}

/**
 * Get demo session ID from localStorage
 */
export function getDemoSessionId(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('demo_session_id');
}

/**
 * Get demo share token from localStorage
 */
export function getDemoShareToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('demo_share_token');
}
