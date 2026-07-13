'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LoginLink from '@/components/LoginLink';
import { getSession, signOut } from 'next-auth/react';
import { Bell, Heart, MessageSquare, UserPlus, Mail, User, LogOut } from 'lucide-react';
import { useChat } from '@/components/ChatProvider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { getFrameClass, getGlowClass, hasGlow } from '@/lib/levelTiers';

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
  const [xp, setXp] = useState(0);
  const [title, setTitle] = useState<string | null>(null);
  
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
          fetch('/api/profile/me')
            .then((res) => res.json())
            .then((data) => {
              setXp(data.xp || 0);
              setTitle(data.title || null);
            })
            .catch(() => { setXp(0); setTitle(null); });
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

  const frameClass = getFrameClass(xp, 'compact');
  const showGlow = hasGlow(xp);

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
            {showGlow && (
              <div className={getGlowClass('compact')}></div>
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
            {showGlow && (
              <div className={getGlowClass('compact')}></div>
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
        <div className={isMobile ? "w-full flex flex-col" : "absolute right-0 mt-3 w-72 bg-[#1a1a1a] border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"}>
          {!isMobile && (
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-800 bg-gradient-to-br from-[#a78bfa]/10 to-transparent">
              <div className="w-9 h-9 relative rounded-full flex-shrink-0 overflow-hidden bg-neutral-800 border border-neutral-700">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-[#34d399] font-bold">
                    {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-bold text-white truncate">{profile?.username || 'Профиль'}</span>
                  {title && (
                    <span className="px-1.5 py-0.5 bg-[#34d399] text-[#121212] text-[9px] rounded-full font-bold uppercase tracking-wide flex-shrink-0">
                      {title}
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-500">Вы вошли в аккаунт</span>
              </div>
            </div>
          )}

          <div className={`${isMobile ? 'flex flex-col gap-1' : 'p-2 border-b border-neutral-800 flex flex-col gap-0.5'}`}>
            {isMobile ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-neutral-300 hover:bg-white/5 hover:text-white active:bg-white/10 transition-all"
                >
                  <User className="w-5 h-5 text-neutral-500" />
                  Профиль
                </Link>
                <Link
                  href="/following"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-neutral-300 hover:bg-white/5 hover:text-white active:bg-white/10 transition-all"
                >
                  <UserPlus className="w-5 h-5 text-neutral-500" />
                  Мои подписки
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-neutral-200 hover:text-white hover:bg-[#a78bfa]/10 transition-all"
                >
                  <User className="w-4 h-4 text-[#a78bfa]" />
                  Профиль
                </Link>

                <Link
                  href="/following"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-neutral-200 hover:text-white hover:bg-[#a78bfa]/10 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-[#a78bfa]" />
                  Мои подписки
                </Link>
              </>
            )}
          </div>

          {isMobile && <hr className="border-neutral-900 my-4" />}

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

          {isMobile ? (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl text-base font-medium text-red-400/90 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/15 transition-all w-full"
            >
              <LogOut className="w-5 h-5 text-red-400/70" />
              Выйти
            </button>
          ) : (
            <div className="p-2">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400/90 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/15 transition-all w-full"
              >
                <LogOut className="w-4 h-4 text-red-400/70" />
                Выйти
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}