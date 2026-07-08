'use client';

import { useEffect, Suspense, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useChat } from './ChatProvider';

interface ChatWidgetLauncherProps {
  currentUserId: string;
  targetProfile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  initialMessages: any[];
}

// Выносим логику чтения URL в отдельный компонент для безопасной работы с Suspense в Next.js
function AutoOpenLogic({ openChatFn, profile, messages, userId }: any) {
  const searchParams = useSearchParams();
  const hasTriggered = useRef(false); // Создаем предохранитель
  
  useEffect(() => {
    // Если в URL есть параметр и мы еще не открывали чат
    if (searchParams?.get('chat') === 'open' && !hasTriggered.current) {
      openChatFn(profile, messages, userId);
      hasTriggered.current = true; // Защелкиваем предохранитель
    }
  }, [searchParams, openChatFn, profile, messages, userId]);

  return null;
}

export function ChatWidgetLauncher({ currentUserId, targetProfile, initialMessages }: ChatWidgetLauncherProps) {
  const { openChat } = useChat(); // Подключаемся к глобальному хранилищу

  return (
    <>
      <Suspense fallback={null}>
        <AutoOpenLogic 
          openChatFn={openChat} 
          profile={targetProfile} 
          messages={initialMessages} 
          userId={currentUserId} 
        />
      </Suspense>

      <button 
        onClick={() => openChat(targetProfile, initialMessages, currentUserId)} 
        className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-full font-bold text-sm border border-neutral-700 hover:border-[#a78bfa] transition-all cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
        Написать
      </button>
    </>
  );
}