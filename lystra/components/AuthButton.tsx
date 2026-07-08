'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LoginLink from '@/components/LoginLink';
import { getSession, signOut } from 'next-auth/react';
import { Bell, Heart, MessageSquare, UserPlus, Mail, User } from 'lucide-react';
import { useChat } from '@/components/ChatProvider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface Notification {
  id: string;
  type: string;
  notifier_username: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export default function AuthButton({ isMobile = false }: { isMobile?: boolean } = {}) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeChat, openChat } = useChat();
  const activeChatRef = useRef(activeChat);
  const pathname = usePathname();

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          setUser(session.user);
          setProfile({
            username: session.user.name || 'Пользователь',
            avatar_url: session.user.image || null
          });
        }
      } catch (error) {
        console.error("Ошибка загрузки сессии:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [pathname]);

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
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    // В будущем здесь будет запрос к нашему API на базе Prisma
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

  // Временно ставим 0 баллов, пока не подключим API статистики
  const points = 0;
  
  let frameClass = "border-2 border-transparent group-hover:border-[#a78bfa]/50"; 
  if (points >= 300) {
    frameClass = "p-0.5 bg-gradient-to-tr from-[#a78bfa] via-[#34d399] to-[#a78bfa] shadow-[0_0_0_2px_#121212,0_0_0_4px_#a78bfa]";
  } else if (points >= 100) {
    frameClass = "border-[2px] border-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.3)] group-hover:shadow-[0_0_12px_rgba(52,211,153,0.5)]";
  } else if (points >= 28) {
    frameClass = "border-2 border-[#a78bfa] ring-1 ring-[#121212] ring-offset-1 ring-offset-[#a78bfa]";
  }

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
          <div className={`w-10 h-10 relative rounded-full flex-shrink-0 transition-all z-10 ${frameClass}`}>
            {points >= 300 && (
              <div className="absolute -inset-1 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-sm opacity-50 animate-pulse -z-10"></div>
            )}
            <div className="w-full h-full relative rounded-full overflow-hidden bg-neutral-800">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#34d399] font-bold">
                  {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
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
        <div className="relative">
          <div className={`w-8 h-8 relative rounded-full flex-shrink-0 transition-all z-10 ${frameClass}`}>
            {points >= 300 && (
              <div className="absolute -inset-1 bg-gradient-to-tr from-[#a78bfa] to-[#34d399] rounded-full blur-sm opacity-50 animate-pulse -z-10"></div>
            )}
            <div className="w-full h-full relative rounded-full overflow-hidden bg-neutral-800">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#34d399] font-bold">
                  {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 z-20 min-w-[16px] h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black font-mono px-1 shadow-md">
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
          <div className={`p-3 ${isMobile ? '' : 'border-b border-neutral-800 bg-[#121212]'} flex flex-col gap-1.5`}>
            <Link 
              href="/profile" 
              onClick={() => !isMobile && setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-neutral-200 hover:text-white hover:bg-[#a78bfa]/10 transition-all border border-neutral-800/50 hover:border-[#a78bfa]/30"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 text-[#a78bfa]">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col flex-1">
                <span>Профиль</span>
                <span className="text-neutral-500 text-xs font-medium">Ваши данные и статистика</span>
              </div>
              <span className="text-neutral-500 text-xs">→</span>
            </Link>
            
            <Link 
              href="/following" 
              onClick={() => !isMobile && setIsOpen(false)}
              className="flex items-center justify-between p-2 rounded-xl text-sm font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <span>Мои подписки</span>
              <UserPlus className="w-4 h-4 text-neutral-500" />
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
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-center text-xs text-neutral-400 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-3 py-2 rounded-xl transition-all active:scale-95 font-medium"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}