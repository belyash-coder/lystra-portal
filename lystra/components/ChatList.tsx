'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useChat } from './ChatProvider';
import { MessageSquare, Trash2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ChatItem {
  partner_id: string;
  partner_username: string;
  partner_avatar_url: string | null;
  last_message: string;
  last_message_time: string;
}

export function ChatList({ currentUserId, username, limit }: { currentUserId: string; username: string; limit?: number }) {
  const { openChat } = useChat();
  
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      
      // ВАЖНО: Supabase удален. 
      // В будущем здесь нужно будет сделать fetch('/api/chats') к вашему новому API на Prisma.
      // Пока возвращаем пустой массив, чтобы билд прошел успешно.
      console.warn('Получение чатов временно отключено (Supabase удален).');
      
      setChats([]);
      setIsLoading(false);
    };

    fetchChats();
  }, []);

  const handleDeleteChat = async (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation(); 
    
    if (!confirm('Удалить всю историю переписки? Это действие необратимо.')) return;
    
    setDeletingId(partnerId);

    // ВАЖНО: Supabase удален.
    // В будущем здесь нужно будет сделать fetch-запрос к API для удаления.
    console.warn('Удаление чатов временно отключено (Supabase удален).');

    // Локально убираем чат из списка для вида
    setChats(prev => prev.filter(c => c.partner_id !== partnerId));
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
      <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/5 border-dashed p-8 md:p-12 rounded-2xl text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="w-16 h-16 bg-[#121212] border border-white/10 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(56,189,248,0.05)] group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-shadow duration-500">
          <MessageSquare className="w-6 h-6 text-sky-400/70 group-hover:text-sky-400 transition-colors" />
        </div>
        <p className="text-sm md:text-base text-neutral-300 relative z-10 font-medium">Нет активных диалогов</p>
        <p className="text-xs md:text-sm text-neutral-500 relative z-10 max-w-sm">Перейдите в профиль интересного вам меломана и нажмите на иконку чата, чтобы начать общение.</p>
      </div>
    );
  }

  const displayedChats = limit ? chats.slice(0, limit) : chats;
  const hasMore = limit ? chats.length > limit : false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {displayedChats.map((chat) => (
        <div 
          key={chat.partner_id}
          onClick={() => handleOpenChat(chat)}
          className="flex items-center justify-between p-4 md:p-5 bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-sky-400/40 hover:shadow-[0_8px_24px_rgba(56,189,248,0.1)] hover:-translate-y-0.5 rounded-2xl cursor-pointer group transition-all duration-300 relative backdrop-blur-sm overflow-hidden"
        >
          {/* Декоративный градиент при наведении */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          <div className="flex items-center gap-4 min-w-0 flex-1 relative z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#121212] overflow-hidden relative flex-shrink-0 border-2 border-white/5 group-hover:border-sky-400/50 transition-colors shadow-md group-hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              {chat.partner_avatar_url ? (
                <Image src={chat.partner_avatar_url} alt="avatar" fill className="object-cover" unoptimized />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-lg font-bold text-sky-400 bg-[#121212]">
                  {chat.partner_username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-white text-sm md:text-base truncate group-hover:text-sky-400 transition-colors">
                  @{chat.partner_username}
                </h3>
                <span className="text-[10px] text-neutral-500 whitespace-nowrap ml-3 block mt-0.5">
                  {new Date(chat.last_message_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-xs md:text-sm text-neutral-400 truncate w-full group-hover:text-neutral-300 transition-colors">
                {chat.last_message}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => handleDeleteChat(e, chat.partner_id)}
            disabled={deletingId === chat.partner_id}
            className="relative z-20 p-2 md:opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
            title="Удалить диалог"
          >
            {deletingId === chat.partner_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      ))}

      {hasMore && (
        <Link
          href={`/profile/${username}/chats`}
          className="flex items-center justify-center p-4 md:p-5 bg-gradient-to-br from-sky-400/10 to-transparent border border-sky-400/20 hover:border-sky-400/50 hover:shadow-[0_8px_24px_rgba(56,189,248,0.15)] rounded-2xl cursor-pointer group transition-all duration-300 min-h-[88px] md:min-h-[106px]"
        >
          <div className="flex items-center gap-2 text-sky-400 font-semibold group-hover:text-sky-300 transition-colors">
            <span>Смотреть все диалоги ({chats.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}
    </div>
  );
}