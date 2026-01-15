import React from 'react';
import toast from 'react-hot-toast';
import { AvatarToast, type ToastType } from '@/components/ui/avatar-toast';
import { convertToAvatarMessage, getEmotionForMessageType } from './avatarmessages';

let setEmotionWithMessageCallback: ((emotion: 'happy' | 'sad' | 'thinking' | 'normal', message: string, timeout?: number) => void) | null = null;
let onAnomalyClickCallback: (() => void) | null = null;

export function registerAvatarCallback(
  callback: (emotion: 'happy' | 'sad' | 'thinking' | 'normal', message: string, timeout?: number) => void
) {
  setEmotionWithMessageCallback = callback;
}

export function registerAnomalyClickCallback(callback: () => void) {
  onAnomalyClickCallback = callback;
}

function showAvatarToast(
  message: string,
  type: ToastType,
  options?: { duration?: number; onClick?: () => void; clickable?: boolean }
) {
  const avatarMessage = convertToAvatarMessage(message, type);
  const emotion = getEmotionForMessageType(type);
  const duration = options?.duration ?? (type === 'loading' ? Infinity : 3000);

  // アバター本体の吹き出しにメッセージを表示
  if (setEmotionWithMessageCallback) {
    setEmotionWithMessageCallback(emotion, avatarMessage, duration);
  }

  // クリック可能な場合のみトーストUIも表示
  if (options?.clickable || options?.onClick) {
    const handleClick = () => {
      if (options?.onClick) {
        options.onClick();
        toast.dismiss();
      } else if (onAnomalyClickCallback && options?.clickable) {
        onAnomalyClickCallback();
        toast.dismiss();
      }
    };

    return toast.custom(
      (t) => (
        <div
          onClick={handleClick}
          className="cursor-pointer hover:scale-105 transition-transform"
        >
          <AvatarToast message={avatarMessage} type={type} />
          <div className="text-center mt-1">
            <span className="text-xs text-blue-600 font-medium">🔍 クリックで詳細を見る</span>
          </div>
        </div>
      ),
      {
        duration,
        position: 'bottom-right',
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          marginBottom: '140px',
          marginRight: '8px'
        }
      }
    );
  }

  // 通常のメッセージはアバターの吹き出しのみ使用
  return null;
}

export const avatarToast = {
  success: (message: string, options?: { duration?: number; onClick?: () => void }) => {
    return showAvatarToast(message, 'success', options);
  },

  error: (message: string, options?: { duration?: number; onClick?: () => void }) => {
    return showAvatarToast(message, 'error', options);
  },

  loading: (message: string) => {
    return showAvatarToast(message, 'loading', { duration: Infinity });
  },

  info: (message: string, options?: { duration?: number; onClick?: () => void }) => {
    return showAvatarToast(message, 'info', options);
  },

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> => {
    const loadingToastId = avatarToast.loading(messages.loading);

    try {
      const result = await promise;
      toast.dismiss(loadingToastId);
      avatarToast.success(messages.success);
      return result;
    } catch (error) {
      toast.dismiss(loadingToastId);
      avatarToast.error(messages.error);
      throw error;
    }
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};
