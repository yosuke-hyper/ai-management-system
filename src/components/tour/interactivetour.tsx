import React, { useEffect, useState, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  route?: string;
  roles?: Array<'owner' | 'admin' | 'manager' | 'staff' | 'viewer'>;
  requires?: Array<'store_selected' | 'has_store' | 'has_reports'>;
  waitForMs?: number;
  action?: () => void;
  helpGuideLink?: string;
}

interface InteractiveTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepId: string, stepIndex: number) => void;
  startStep?: number;
}

function waitForElement(selector: string, maxWaitMs: number = 4000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      resolve(element);
      return;
    }

    const startTime = Date.now();
    let rafId: number;

    const check = () => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - startTime >= maxWaitMs) {
        resolve(null);
        return;
      }
      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);

    setTimeout(() => {
      cancelAnimationFrame(rafId);
      resolve(document.querySelector(selector) as HTMLElement | null);
    }, maxWaitMs);
  });
}

export function InteractiveTour({ steps, onComplete, onSkip, onStepChange, startStep = 0 }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(startStep);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (step && onStepChange) {
      onStepChange(step.id, currentStep);
    }
  }, [currentStep, step, onStepChange]);

  useEffect(() => {
    if (!step) return;

    let cancelled = false;

    const updatePositionWithElement = (targetElement: HTMLElement | null) => {
      if (cancelled) return;

      if (!targetElement) {
        setHighlightRect(null);

        const tooltipEl = tooltipRef.current;
        if (tooltipEl) {
          const tooltipRect = tooltipEl.getBoundingClientRect();
          setTooltipPosition({
            top: (window.innerHeight - tooltipRect.height) / 2,
            left: (window.innerWidth - tooltipRect.width) / 2,
          });
        }
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;

      const tooltipRect = tooltipEl.getBoundingClientRect();
      let top = 0;
      let left = 0;

      const position = step.position || 'bottom';
      const spacing = 20;

      switch (position) {
        case 'top':
          top = rect.top - tooltipRect.height - spacing;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.right + spacing;
          break;
      }

      top = Math.max(spacing, Math.min(top, window.innerHeight - tooltipRect.height - spacing));
      left = Math.max(spacing, Math.min(left, window.innerWidth - tooltipRect.width - spacing));

      setTooltipPosition({ top, left });

      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const initializeStep = async () => {
      setIsWaiting(true);
      const waitTime = step.waitForMs ?? 4000;
      const targetElement = await waitForElement(step.target, waitTime);
      if (cancelled) return;
      setIsWaiting(false);
      updatePositionWithElement(targetElement);
    };

    initializeStep();

    const handleResize = () => {
      const targetElement = document.querySelector(step.target) as HTMLElement;
      updatePositionWithElement(targetElement);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [currentStep, step]);

  useEffect(() => {
    if (step?.action) {
      step.action();
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!step) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        {highlightRect && (
          <>
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: `${highlightRect.top}px`,
                background: 'rgba(0, 0, 0, 0.7)',
              }}
            />
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                top: `${highlightRect.bottom}px`,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
              }}
            />
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                top: `${highlightRect.top}px`,
                left: 0,
                width: `${highlightRect.left}px`,
                height: `${highlightRect.height}px`,
                background: 'rgba(0, 0, 0, 0.7)',
              }}
            />
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                top: `${highlightRect.top}px`,
                left: `${highlightRect.right}px`,
                right: 0,
                height: `${highlightRect.height}px`,
                background: 'rgba(0, 0, 0, 0.7)',
              }}
            />
            <div
              className="absolute border-4 border-blue-500 rounded-lg pointer-events-none transition-all duration-300 shadow-lg"
              style={{
                top: `${highlightRect.top - 4}px`,
                left: `${highlightRect.left - 4}px`,
                width: `${highlightRect.width + 8}px`,
                height: `${highlightRect.height + 8}px`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.5)',
              }}
            />
          </>
        )}
      </div>

      <div
        ref={tooltipRef}
        className="fixed z-[9999] pointer-events-auto transition-all duration-300"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <Card className="p-6 max-w-md shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-600">
                  ステップ {currentStep + 1} / {steps.length}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="ツアーをスキップ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 mb-4">{step.content}</p>

          {step.helpGuideLink && (
            <a
              href={step.helpGuideLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
            >
              <ExternalLink className="w-3 h-3" />
              詳しく見る
            </a>
          )}

          <div className="flex items-center gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || isWaiting}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            <Button
              onClick={handleNext}
              disabled={isWaiting}
              className="flex-1"
            >
              {isWaiting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  読込中...
                </>
              ) : currentStep === steps.length - 1 ? (
                '完了'
              ) : (
                <>
                  次へ
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
