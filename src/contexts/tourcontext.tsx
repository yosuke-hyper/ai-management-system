import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { InteractiveTour, TourStep } from '../components/tour/interactivetour';
import { WelcomeTourModal } from '../components/tour/welcometourmodal';
import { TourCompletionModal } from '../components/tour/tourcompletionmodal';
import { useTour, TourType } from '../hooks/usetour';
import { useAuth } from './authcontext';
import {
  dashboardTourSteps,
  reportFormTourSteps,
  settingsTourSteps,
  firstTimeTourSteps,
  aiChatTourSteps,
} from '../lib/toursteps';

const AVATAR_WELCOME_ACTIVE_KEY = 'avatar_welcome_active';

function isAvatarWelcomeActive(): boolean {
  return localStorage.getItem(AVATAR_WELCOME_ACTIVE_KEY) === 'true';
}

interface TourContextValue {
  startTour: (tourType: TourType) => void;
  startFirstTimeTour: () => void;
  isAnyTourActive: boolean;
  showWelcomeModal: () => void;
  hideWelcomeModal: () => void;
  isWelcomeModalVisible: boolean;
  shouldShowWelcome: boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, isDemoMode } = useAuth();
  const [activeTour, setActiveTour] = useState<{ type: TourType; steps: TourStep[] } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedTourName, setCompletedTourName] = useState<TourType | null>(null);
  const [hasCheckedWelcome, setHasCheckedWelcome] = useState(false);

  const firstTimeTour = useTour('first_time');
  const dashboardTour = useTour('dashboard');
  const reportFormTour = useTour('report_form');
  const settingsTour = useTour('settings');
  const aiChatTour = useTour('ai_chat');

  const getTourHook = (type: TourType) => {
    switch (type) {
      case 'first_time':
        return firstTimeTour;
      case 'dashboard':
        return dashboardTour;
      case 'report_form':
        return reportFormTour;
      case 'settings':
        return settingsTour;
      case 'ai_chat':
        return aiChatTour;
      default:
        return dashboardTour;
    }
  };

  const getTourSteps = (type: TourType): TourStep[] => {
    switch (type) {
      case 'first_time':
        return firstTimeTourSteps;
      case 'dashboard':
        return dashboardTourSteps;
      case 'report_form':
        return reportFormTourSteps;
      case 'settings':
        return settingsTourSteps;
      case 'ai_chat':
        return aiChatTourSteps;
      default:
        return [];
    }
  };

  const shouldShowWelcome = !isDemoMode &&
    user &&
    !dashboardTour.isLoading &&
    dashboardTour.shouldShowTour &&
    !hasCheckedWelcome &&
    !isAvatarWelcomeActive();

  useEffect(() => {
    if (!isDemoMode && user && !dashboardTour.isLoading && dashboardTour.shouldShowTour && !hasCheckedWelcome) {
      const timer = setTimeout(() => {
        if (!isAvatarWelcomeActive()) {
          setShowWelcome(true);
          setHasCheckedWelcome(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode, user, dashboardTour.isLoading, dashboardTour.shouldShowTour, hasCheckedWelcome]);

  const startTour = useCallback((tourType: TourType) => {
    console.log('Starting tour:', tourType);
    setShowWelcome(false);
    const steps = getTourSteps(tourType);
    console.log('Tour steps:', steps);
    setActiveTour({ type: tourType, steps });
    const hook = getTourHook(tourType);
    hook.startTour(0);
  }, []);

  const startFirstTimeTour = useCallback(() => {
    startTour('first_time');
  }, [startTour]);

  const showWelcomeModal = useCallback(() => {
    setShowWelcome(true);
  }, []);

  const hideWelcomeModal = useCallback(() => {
    setShowWelcome(false);
    setHasCheckedWelcome(true);
  }, []);

  const handleComplete = useCallback(() => {
    if (activeTour) {
      const hook = getTourHook(activeTour.type);
      hook.completeTour();
      setCompletedTourName(activeTour.type);
      setShowCompletion(true);
    }
    setActiveTour(null);
  }, [activeTour]);

  const handleSkip = useCallback(() => {
    if (activeTour) {
      const hook = getTourHook(activeTour.type);
      hook.skipTour();
    }
    setActiveTour(null);
  }, [activeTour]);

  const handleStepChange = useCallback((stepId: string, stepIndex: number) => {
    if (activeTour) {
      const hook = getTourHook(activeTour.type);
      hook.updateProgress(stepIndex);
    }
  }, [activeTour]);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    setHasCheckedWelcome(true);
  }, []);

  const handleWelcomeNeverShow = useCallback(() => {
    setShowWelcome(false);
    setHasCheckedWelcome(true);
    dashboardTour.skipTour();
  }, [dashboardTour]);

  const handleCompletionClose = useCallback(() => {
    setShowCompletion(false);
    setCompletedTourName(null);
  }, []);

  const isAnyTourActive = activeTour !== null;

  return (
    <TourContext.Provider value={{
      startTour,
      startFirstTimeTour,
      isAnyTourActive,
      showWelcomeModal,
      hideWelcomeModal,
      isWelcomeModalVisible: showWelcome,
      shouldShowWelcome: !!shouldShowWelcome
    }}>
      {children}

      {showWelcome && (
        <WelcomeTourModal
          onStartTour={() => {
            setShowWelcome(false);
            startTour('dashboard');
          }}
          onDismiss={handleWelcomeDismiss}
          onNeverShow={handleWelcomeNeverShow}
        />
      )}

      {activeTour && (
        <InteractiveTour
          steps={activeTour.steps}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onStepChange={handleStepChange}
        />
      )}

      {showCompletion && completedTourName && (
        <TourCompletionModal
          onClose={handleCompletionClose}
          tourName={completedTourName}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}

export function useTourContextOptional() {
  return useContext(TourContext);
}
