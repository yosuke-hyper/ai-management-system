import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/authcontext';

export type TourType = 'first_time' | 'dashboard' | 'report_form' | 'settings' | 'ai_chat';

interface TourProgress {
  user_id: string;
  tour_type: TourType;
  completed: boolean;
  skipped: boolean;
  last_step: number;
  completed_at?: string;
}

export function useTour(tourType: TourType) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourProgress, setTourProgress] = useState<TourProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    loadTourProgress();
  }, [user, tourType]);

  const loadTourProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tour_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('tour_type', tourType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tour progress:', error);
      }

      setTourProgress(data);

      if (data && !data.completed && !data.skipped) {
        setCurrentStep(data.last_step || 0);
      }
    } catch (error) {
      console.error('Error loading tour progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startTour = useCallback((step: number = 0) => {
    setIsActive(true);
    setCurrentStep(step);
  }, []);

  const updateProgress = async (step: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tour_progress')
        .upsert({
          user_id: user.id,
          tour_type: tourType,
          last_step: step,
          completed: false,
          skipped: false,
        }, {
          onConflict: 'user_id,tour_type'
        });

      if (error) {
        console.error('Error updating tour progress:', error);
      }
    } catch (error) {
      console.error('Error updating tour progress:', error);
    }
  };

  const completeTour = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tour_progress')
        .upsert({
          user_id: user.id,
          tour_type: tourType,
          completed: true,
          skipped: false,
          last_step: 0,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,tour_type'
        });

      if (error) {
        console.error('Error completing tour:', error);
      }

      setIsActive(false);
      setTourProgress(prev => prev ? { ...prev, completed: true } : null);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  }, [user, tourType]);

  const skipTour = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tour_progress')
        .upsert({
          user_id: user.id,
          tour_type: tourType,
          completed: false,
          skipped: true,
          last_step: currentStep,
        }, {
          onConflict: 'user_id,tour_type'
        });

      if (error) {
        console.error('Error skipping tour:', error);
      }

      setIsActive(false);
      setTourProgress(prev => prev ? { ...prev, skipped: true } : null);
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  }, [user, tourType, currentStep]);

  const resetTour = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tour_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('tour_type', tourType);

      if (error) {
        console.error('Error resetting tour:', error);
      }

      setTourProgress(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [user, tourType]);

  const shouldShowTour = useCallback(() => {
    if (!tourProgress) return true;
    return !tourProgress.completed && !tourProgress.skipped;
  }, [tourProgress]);

  return {
    isActive,
    currentStep,
    isLoading,
    tourProgress,
    shouldShowTour: shouldShowTour(),
    startTour,
    completeTour,
    skipTour,
    resetTour,
    updateProgress,
  };
}
