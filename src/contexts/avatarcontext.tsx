import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getRandomReaction, InputReaction } from '@/lib/helpfaq';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/authcontext';

type EmotionType = 'happy' | 'sad' | 'thinking' | 'normal';

export interface EquippedItems {
  head: string | null;
  outfit: string | null;
  hand: string | null;
}

interface EquippedItemsById {
  head: string | null;
  outfit: string | null;
  hand: string | null;
}

interface AvatarContextType {
  emotion: EmotionType;
  message: string;
  equippedItems: EquippedItems;
  setEmotion: (emotion: EmotionType) => void;
  setEmotionWithTimeout: (emotion: EmotionType, timeout?: number) => void;
  setMessage: (message: string) => void;
  setMessageWithTimeout: (message: string, timeout?: number) => void;
  setEmotionWithMessage: (emotion: EmotionType, message: string, timeout?: number) => void;
  triggerInputReaction: (trigger: InputReaction['trigger']) => void;
  updateEquippedItems: (newEquipped: EquippedItems) => void;
  refreshEquippedItems: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [emotion, setEmotion] = useState<EmotionType>('normal');
  const [message, setMessage] = useState<string>('');
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    head: null,
    outfit: null,
    hand: null
  });
  const emotionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadUserEquippedItems = useCallback(async () => {
    if (!user) {
      setEquippedItems({ head: null, outfit: null, hand: null });
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('equipped_items')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData?.equipped_items) {
        const equippedById = profileData.equipped_items as EquippedItemsById;
        const itemIds = Object.values(equippedById).filter(Boolean);

        if (itemIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('avatar_items')
            .select('id, image_path')
            .in('id', itemIds);

          if (itemsError) throw itemsError;

          const itemMap = new Map(itemsData?.map(item => [item.id, item.image_path]) || []);

          setEquippedItems({
            head: equippedById.head ? itemMap.get(equippedById.head) || null : null,
            outfit: equippedById.outfit ? itemMap.get(equippedById.outfit) || null : null,
            hand: equippedById.hand ? itemMap.get(equippedById.hand) || null : null
          });
        }
      }
    } catch (error) {
      console.error('Failed to load equipped items:', error);
    }
  }, [user]);

  const refreshEquippedItems = useCallback(async () => {
    await loadUserEquippedItems();
  }, [loadUserEquippedItems]);

  const updateEquippedItems = useCallback((newEquipped: EquippedItems) => {
    setEquippedItems(newEquipped);
  }, []);

  useEffect(() => {
    loadUserEquippedItems();
  }, [loadUserEquippedItems]);

  useEffect(() => {
    return () => {
      if (emotionTimerRef.current) {
        clearTimeout(emotionTimerRef.current);
      }
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const setEmotionWithTimeout = (newEmotion: EmotionType, timeout: number = 5000) => {
    if (emotionTimerRef.current) {
      clearTimeout(emotionTimerRef.current);
    }

    setEmotion(newEmotion);

    if (newEmotion !== 'normal') {
      emotionTimerRef.current = setTimeout(() => {
        setEmotion('normal');
      }, timeout);
    }
  };

  const setMessageWithTimeout = (newMessage: string, timeout: number = 5000) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    setMessage(newMessage);

    if (newMessage) {
      messageTimerRef.current = setTimeout(() => {
        setMessage('');
      }, timeout);
    }
  };

  const setEmotionWithMessage = (newEmotion: EmotionType, newMessage: string, timeout: number = 5000) => {
    if (emotionTimerRef.current) {
      clearTimeout(emotionTimerRef.current);
    }
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    setEmotion(newEmotion);
    setMessage(newMessage);

    if (newEmotion !== 'normal' || newMessage) {
      const timer = setTimeout(() => {
        setEmotion('normal');
        setMessage('');
      }, timeout);
      emotionTimerRef.current = timer;
      messageTimerRef.current = timer;
    }
  };

  const triggerInputReaction = (trigger: InputReaction['trigger']) => {
    const reaction = getRandomReaction(trigger);
    if (reaction.message) {
      setEmotionWithMessage(reaction.emotion, reaction.message, 3000);
    }
  };

  return (
    <AvatarContext.Provider value={{
      emotion,
      message,
      equippedItems,
      setEmotion,
      setEmotionWithTimeout,
      setMessage,
      setMessageWithTimeout,
      setEmotionWithMessage,
      triggerInputReaction,
      updateEquippedItems,
      refreshEquippedItems,
    }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within AvatarProvider');
  }
  return context;
};
