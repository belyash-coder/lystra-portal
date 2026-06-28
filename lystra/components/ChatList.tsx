'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { useChat } from './ChatProvider';
import { MessageSquare, Trash2, Loader2 } from 'lucide-react';

interface ChatItem {
  partner_id: string;
  partner_username: string;
  partner_avatar_url: string | null;
  last_message: string;
  last_message_time: string;
}

export function ChatList({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const { openChat } = useChat();
  
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_my_chats');
      
      if (!error && data) {
        setChats(data as ChatItem[]);
      }
      setIsLoading(false);
    };

    fetchChats();
  }, [supabase]);

  const handleDeleteChat = async (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation(); 
    
    if (!confirm('Удалить всю историю переписки? Это действие необратимо.')) return;
    
    setDeletingId(partnerId);

    // ИЗМЕНЕНО: Вызываем нашу мощную SQL-функцию, которая гарантированно стирает диалог
    const { error } = await supabase.rpc('delete_dialog', { partner_uid: partnerId });

    if (!error) {
      setChats(prev => prev.filter(c => c.partner_id !== partnerId));
    } else {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении чата');
    }
    setDeletingId(null);
  };

  const handleOpenChat = (chat: ChatItem) => {
    openChat(
      {
        id: chat.partner_id,
        username: chat.partner_username,
        avatar_url: chat.partner_avatar_url
      },
      [], 
      currentUserId
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin text-[#a78bfa]" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="bg-white/5 border border-white/5 border-dashed p-6 md:p-8 rounded-xl text-center flex flex-col items-center justify-center gap-3">
        <MessageSquare className="w-8 h-8 text-neutral-600" />
        <p className="text-sm md:text-base text-gray-500">У вас пока нет активных диалогов.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {chats.map((chat) => (
        <div 
          key={chat.partner_id}
          onClick={() => handleOpenChat(chat)}
          className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-neutral-800 hover:border-[#a78bfa]/50 rounded-xl cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden relative flex-shrink-0 border border-neutral-700">
              {chat.partner_avatar_url ? (
                <Image src={chat.partner_avatar_url} alt="avatar" fill className="object-cover" unoptimized />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-lg font-bold text-[#a78bfa]">
                  {chat.partner_username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">@{chat.partner_username}</h3>
              <p className="text-xs text-neutral-400 truncate mt-0.5 w-40 sm:w-60">
                {chat.last_message}
              </p>
              <span className="text-[10px] text-neutral-600 block mt-1">
                {new Date(chat.last_message_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => handleDeleteChat(e, chat.partner_id)}
            disabled={deletingId === chat.partner_id}
            className="p-2 text-neutral-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Удалить диалог"
          >
            {deletingId === chat.partner_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}