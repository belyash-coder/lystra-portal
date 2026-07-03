'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import LoginLink from '@/components/LoginLink';
import { signOut } from '@/app/login/actions';
import { Bell, Heart, MessageSquare, UserPlus, Mail } from 'lucide-react';
import { useChat } from '@/components/ChatProvider';

interface Notification {
  id: string;
  type: string;
  notifier_username: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export default function AuthButton({ isMobile = false }: { isMobile?: boolean } = {}) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeChat, openChat } = useChat();
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const initAuthAndNotifications = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser(authUser);

      const { data: prof } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', authUser.id)
        .single();
      setProfile(prof);

      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, type, notifier_username, related_id, is_read, created_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (notifs) setNotifications(notifs);
      
      setLoading(false);
    };

    initAuthAndNotifications();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      channel = supabase
        .channel(`user-notifications-${authUser.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${authUser.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            const currentChat = activeChatRef.current;

            if (newNotif.type === 'message' && currentChat?.profile.id === newNotif.related_id) {
              setNotifications((prev) => [{ ...newNotif, is_read: true }, ...prev]);
              supabase.from('notifications').update({ is_read: true }).eq('id', newNotif.id).then();
            } else {
              setNotifications((prev) => [newNotif, ...prev]);
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(100);
              }
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', authUser.id)
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
      case 'message':
        return { icon: <Mail className="w-4 h-4 text-sky-400" />, text: `@${username} прислал вам сообщение` };
      default:
        return { icon: <Bell className="w-4 h-4 text-gray-400" />, text: `Активность от @${username}` };
    }
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse" />;
  }

  if (!user) {
    return <LoginLink />;
  }

  return (
    <div className={`relative ${isMobile ? 'w-full flex flex-col gap-2' : ''}`} ref={dropdownRef}>
      {isMobile ? (
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-10 h-10 relative rounded-full border border-neutral-700">
            {profile?.avatar_url ? (
              <img 
                src={`${profile.avatar_url}?t=${new Date(profile.username || '').getTime()}`}
                alt="Аватар" 
                className="object-cover w-full h-full rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-sm text-[#34d399] font-bold rounded-full">
                {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <span className="text-lg font-bold text-white">
            {profile?.username || 'Профиль'}
          </span>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) handleMarkAllAsRead();
          }}
          className="flex items-center gap-2 group cursor-pointer select-none active:scale-95 transition-transform outline-none"
        >
        <div className="w-8 h-8 relative rounded-full border border-neutral-700 group-hover:border-[#a78bfa] transition-all">
          {profile?.avatar_url ? (
            <img 
              src={`${profile.avatar_url}?t=${new Date(profile.username || '').getTime()}`}
              alt="Аватар" 
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs text-[#34d399] font-bold rounded-full">
              {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black font-mono px-1 shadow-md">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
          {profile?.username || 'Профиль'}
        </span>
      </button>
      )}

      {(isOpen || isMobile) && (
        <div className={isMobile ? "w-full flex flex-col" : "absolute right-0 mt-3 w-80 bg-[#1a1a1a] border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"}>
          <div className={`p-3 ${isMobile ? '' : 'border-b border-neutral-800 bg-[#121212]'}`}>
            <Link 
              href="/profile" 
              onClick={() => !isMobile && setIsOpen(false)}
              className="flex items-center justify-between p-2 rounded-xl text-sm font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <span>Профиль</span>
              <span className="text-neutral-500 text-xs">→</span>
            </Link>
          </div>

          <div className={`p-3 ${isMobile ? '' : 'border-b border-neutral-800 max-h-64'} overflow-y-auto custom-scrollbar divide-y divide-neutral-900`}>
            <div className="flex justify-between items-center px-2 pb-2">
              <h4 className="text-xs font-bold text-neutral-400">Уведомления</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-md font-medium">
                  +{unreadCount} новых
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                Уведомлений пока нет
              </div>
            ) : (
              notifications.map((notif) => {
                const details = getNotificationDetails(notif.type, notif.notifier_username);
                const isMessage = notif.type === 'message';
                
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
                      if (isMessage && user.id) {
                        e.preventDefault(); 
                        openChat(
                          { 
                            id: notif.related_id, 
                            username: notif.notifier_username, 
                            avatar_url: null 
                          },
                          [], 
                          user.id
                        );
                      }
                    }}
                    className={`flex gap-3 p-2.5 items-start hover:bg-white/[0.02] rounded-lg transition-colors group block ${
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

          <div className={`p-3 ${isMobile ? 'pt-6' : 'bg-[#121212]'} flex justify-end`}>
            <form action={signOut} className="w-full">
              <button 
                type="submit"
                className="w-full text-center text-xs text-neutral-400 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-3 py-2 rounded-xl transition-all active:scale-95 font-medium"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}