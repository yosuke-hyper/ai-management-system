import React from 'react';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | 'info';

interface AvatarToastProps {
  message: string;
  type: ToastType;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  loading: Loader2,
  info: Info,
};

const colorMap = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-900',
    icon: 'text-green-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-900',
    icon: 'text-red-500'
  },
  loading: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-900',
    icon: 'text-blue-500'
  },
  info: {
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-900',
    icon: 'text-gray-500'
  }
};

export function AvatarToast({ message, type }: AvatarToastProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <>
      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes wiggle {
            0%, 100% {
              transform: rotate(0deg);
            }
            25% {
              transform: rotate(-3deg);
            }
            75% {
              transform: rotate(3deg);
            }
          }
          .avatar-toast-enter {
            animation: slideInUp 0.3s ease-out, wiggle 0.6s ease-in-out;
          }
        `}
      </style>
      <div className="avatar-toast-enter relative max-w-[280px]">
        <div className={`${colors.bg} ${colors.border} border-2 rounded-xl px-4 py-3 shadow-xl relative`}>
          <div className="flex items-start gap-3">
            <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
              {type === 'loading' ? (
                <Icon className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <div className={`${colors.text} text-sm font-medium leading-relaxed flex-1`}>
              {message}
            </div>
          </div>
          <div
            className={`absolute -bottom-2 right-8 w-4 h-4 ${colors.bg} ${colors.border} border-r-2 border-b-2 transform rotate-45`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
          />
        </div>
      </div>
    </>
  );
}
