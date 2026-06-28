'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Smile, Minus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface DirectChatProps {
  currentUserId: string;
  targetProfile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  initialMessages?: Message[]; // ИЗМЕНЕНО: теперь опционально
  onClose: () => void;
}

export function DirectChat({ currentUserId, targetProfile, initialMessages = [], onClose }: DirectChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(initialMessages.length === 0);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isMinimizedRef = useRef(isMinimized);

  // === ИЗМЕНЕНО: БЕЗОПАСНЫЙ ПОДХОД К СЧЕТЧИКУ (Защита от +2) ===
  // Храним ID последнего полученного сообщения, чтобы не инкрементить счетчик дважды для одного и того же
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    isMinimizedRef.current = isMinimized;
    if (!isMinimized) {
      setUnreadCount(0);
    }
  }, [isMinimized]);

  // ИЗМЕНЕНО: Подгружаем сообщения, если их нет (для колокольчика)
  useEffect(() => {
    const fetchHistory = async () => {
      if (initialMessages.length > 0) return; // Если передали готовые — не грузим
      
      setIsLoadingMessages(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetProfile.id}),and(sender_id.eq.${targetProfile.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
      
      if (data) {
        setMessages(data as Message[]);
      }
      setIsLoadingMessages(false);
    };

    fetchHistory();
  }, [currentUserId, targetProfile.id, initialMessages.length, supabase]);

  const scrollToBottom = () => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isMinimized, isLoadingMessages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === REALTIME СОКЕТ ===
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${currentUserId}-${targetProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const incomingMessage = payload.new as Message;
          
          // Жесткая проверка: это точно сообщение от собеседника в этот чат?
          if (incomingMessage.sender_id !== targetProfile.id || incomingMessage.receiver_id !== currentUserId) return;
          
          // БЕЗОПАСНЫЙ ФИКС СЧЕТЧИКА: не обрабатываем сообщение дважды
          if (lastProcessedMessageId.current === incomingMessage.id) return;
          lastProcessedMessageId.current = incomingMessage.id;

          // Звеним и вибрируем
          if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(50);
                
          // Увеличиваем счетчик ТОЛЬКО если свернуто
          if (isMinimizedRef.current) {
            setUnreadCount(prevCount => prevCount + 1);
          }

          // Добавляем в конец списка
          setMessages((prev) => [...prev, incomingMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, targetProfile.id, supabase]);

  // === ОТПРАВКА СООБЩЕНИЯ ===
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setShowEmojiPicker(false);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: targetProfile.id,
        content: newMessage.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      const sentMsg = data as Message;
      // Мгновенно добавляем как прочитанное (для себя)
      setMessages((prev) => [...prev, sentMsg]);
      // Запоминаем ID, чтобы по сокету оно не пролетело как "непрочитанное от себя же"
      lastProcessedMessageId.current = sentMsg.id;
      setNewMessage('');
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      console.error('Ошибка отправки:', error);
    }
    setIsSending(false);
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    inputRef.current?.focus();
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[90vw] md:w-[360px] bg-[#121212]/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-[72px]' : 'h-[65vh] max-h-[600px]'
      }`}
    >
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden relative border border-[#a78bfa]/30 flex-shrink-0">
            {targetProfile.avatar_url ? (
              <Image src={targetProfile.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-sm font-bold text-[#a78bfa]">
                {targetProfile.username?.charAt(0).toUpperCase()}
              </span>
            )}
            
            {isMinimized && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-neutral-900 rounded-full animate-in zoom-in" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              @{targetProfile.username}
              
              {isMinimized && unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono animate-in zoom-in duration-200">
                  +{unreadCount}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#34d399]">{isMinimized ? 'Свернуто' : 'Личный чат'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-neutral-400">
          <button className="p-1.5 hover:text-white transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 hover:text-rose-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative">
            {isLoadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#a78bfa]" />
                <p>Загрузка истории...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm">
                <p>Здесь пока пусто.</p>
                <p>Напишите первое сообщение!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                        isMine ? 'bg-[#a78bfa] text-black rounded-br-sm' : 'bg-neutral-800 text-white rounded-bl-sm border border-neutral-700'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-neutral-800 bg-[#121212] relative">
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200" ref={emojiPickerRef}>
                <EmojiPicker 
                  theme={Theme.DARK} 
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  searchPlaceHolder="Поиск..."
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#262626' }}
                />
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-[#a78bfa] transition-colors z-10 cursor-pointer"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Написать..."
                disabled={isSending || isLoadingMessages}
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-full pl-11 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-[#a78bfa] transition-colors"
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending || isLoadingMessages}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[#a78bfa] text-black rounded-full hover:bg-[#b8a1fa] disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 transition-all cursor-pointer"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5 ml-[-2px]" />}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}