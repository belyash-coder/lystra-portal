'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Heart, MessageSquare, UserPlus, Mail } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useChat } from './ChatProvider';

interface Notification {
  id: string;
  type: string;
  notifier_username: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Добавили хранение текущего ID юзера для передачи в чат
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeChat, openChat } = useChat();
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('notifications')
        .select('id, type, notifier_username, related_id, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (data) setNotifications(data);
    };

    fetchNotifications();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            const currentChat = activeChatRef.current;

            // Если чат с этим человеком УЖЕ открыт — гасим уведомление (оно просто тихо падает в прочитанные)
            if (newNotif.type === 'message' && currentChat?.profile.id === newNotif.related_id) {
              setNotifications((prev) => [{ ...newNotif, is_read: true }, ...prev]);
              supabase.from('notifications').update({ is_read: true }).eq('id', newNotif.id).then();
            } else {
              // Иначе показываем индикатор и звеним
              setNotifications((prev) => [newNotif, ...prev]);
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(100);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [supabase]); 

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const getNotificationDetails = (type: string, username: string) => {
    switch (type) {
      case 'like':
        return { icon: <Heart className="w-4 h-4 text-rose-400 fill-current" />, text: `@${username} лайкнул ваш отзыв` };
      case 'comment':
        return { icon: <MessageSquare className="w-4 h-4 text-[#34d399] fill-current" />, text: `@${username} прокомментировал ваш отзыв` };
      case 'reply':
        return { icon: <MessageSquare className="w-4 h-4 text-[#a78bfa] fill-current" />, text: `@${username} ответил на ваш комментарий` };
      case 'follow':
        return { icon: <UserPlus className="w-4 h-4 text-amber-400" />, text: `@${username} подписался на вас` };
      // ВОЗВРАЩАЕМ КРАСИВЫЙ ТЕКСТ ДЛЯ СООБЩЕНИЙ
      case 'message':
        return { icon: <Mail className="w-4 h-4 text-sky-400" />, text: `@${username} прислал вам сообщение` };
      default:
        return { icon: <Bell className="w-4 h-4 text-gray-400" />, text: `Активность от @${username}` };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) handleMarkAllAsRead();
        }}
        className={`relative p-2 rounded-full border bg-neutral-950 transition-all cursor-pointer active:scale-95 ${
          isOpen ? 'border-[#a78bfa] text-[#a78bfa]' : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
        }`}
      >
        <Bell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black font-mono animate-in zoom-in duration-200">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#1a1a1a] border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#121212]">
            <h3 className="font-bold text-sm text-white">Уведомления</h3>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-neutral-900">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                Уведомлений пока нет
              </div>
            ) : (
              notifications.map((notif) => {
                const details = getNotificationDetails(notif.type, notif.notifier_username);
                const isMessage = notif.type === 'message';
                
                // Если это сообщение — ставим пустую ссылку (перехватим клик ниже)
                const linkHref = isMessage 
                  ? '#' 
                  : notif.type === 'follow' 
                    ? `/profile/${notif.notifier_username}` 
                    : `/?review_id=${notif.related_id}`;

                return (
                  <Link 
                    key={notif.id} 
                    href={linkHref}
                    onClick={(e) => {
                      setIsOpen(false);
                      
                      // МАГИЯ ЗДЕСЬ: Если кликнули на сообщение, предотвращаем переход
                      // и сразу разворачиваем виджет чата поверх текущей страницы
                      if (isMessage && currentUserId) {
                        e.preventDefault(); 
                        openChat(
                          { 
                            id: notif.related_id, 
                            username: notif.notifier_username, 
                            avatar_url: null 
                          },
                          [], // Передаем пустой массив, компонент DirectChat сам подгрузит историю!
                          currentUserId
                        );
                      }
                    }}
                    className={`flex gap-3 p-3.5 items-start hover:bg-white/[0.02] transition-colors group block ${
                      !notif.is_read ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{details.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-200 leading-normal break-words group-hover:text-white transition-colors">
                        {details.text}
                      </p>
                      <span className="text-[9px] text-neutral-600 block mt-1 font-mono">
                        {new Date(notif.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}