'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { DirectChat } from './DirectChat';

interface TargetProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ChatContextType {
  openChat: (profile: TargetProfile, messages: any[], currentUserId: string) => void;
  closeChat: () => void;
  // ДОБАВЛЕНО: Теперь мы экспортируем текущее состояние чата
  activeChat: { profile: TargetProfile; messages: any[]; currentUserId: string } | null;
}

const ChatContext = createContext<ChatContextType>({
  openChat: () => {},
  closeChat: () => {},
  activeChat: null,
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeChat, setActiveChat] = useState<{
    profile: TargetProfile;
    messages: any[];
    currentUserId: string;
  } | null>(null);

  const openChat = useCallback((profile: TargetProfile, messages: any[], currentUserId: string) => {
    setActiveChat({ profile, messages, currentUserId });
  }, []);

  const closeChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  return (
    <ChatContext.Provider value={{ openChat, closeChat, activeChat }}>
      {children}
      
      {activeChat && (
        <DirectChat
          currentUserId={activeChat.currentUserId}
          targetProfile={activeChat.profile}
          initialMessages={activeChat.messages}
          onClose={closeChat}
        />
      )}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);