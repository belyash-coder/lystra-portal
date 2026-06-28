'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  root_id: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface ReviewCommentsProps {
  reviewId: string;
  initialCommentsCount?: number;
  children?: React.ReactNode;
}

export function ReviewComments({ reviewId, initialCommentsCount = 0, children }: ReviewCommentsProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; rootId: string | null } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reviewIdFromUrl = searchParams.get('review_id');
    
    if (reviewIdFromUrl === reviewId) {
      setIsOpen(true);
      
      if (comments.length === 0) {
        const fetchCommentsFromUrl = async () => {
          setIsFetching(true);
          const { data, error } = await supabase
            .from('comments')
            .select('id, content, created_at, parent_id, root_id, profiles(username, avatar_url)')
            .eq('review_id', reviewId)
            .order('created_at', { ascending: true });

          if (!error && data) {
            setComments(data as unknown as Comment[]);
          }
          setIsFetching(false);
        };
        fetchCommentsFromUrl();
      }

      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputRef.current?.focus();
      }, 300);
    }
  }, [searchParams, reviewId]);

  const toggleComments = async () => {
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      
      if (comments.length === 0) {
        setIsFetching(true);
        const { data, error } = await supabase
          .from('comments')
          .select('id, content, created_at, parent_id, root_id, profiles(username, avatar_url)')
          .eq('review_id', reviewId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setComments(data as unknown as Comment[]);
        }
        setIsFetching(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Нужно войти в аккаунт, чтобы писать комментарии.');
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        review_id: reviewId,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyingTo?.id || null,     
        root_id: replyingTo?.rootId || null,   
      })
      .select('id, content, created_at, parent_id, root_id, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments([...comments, data as unknown as Comment]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
      setReplyingTo(null);
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      alert('Ошибка при отправке комментария');
    }
    setIsLoading(false);
  };

  // ПРАВИЛЬНАЯ ФУНКЦИЯ КЛИКА: теперь она принимает готовый rootId напрямую из разметки
  const handleReplyClick = (commentId: string, username: string, explicitRootId: string | null) => {
    setReplyingTo({ 
      id: commentId, 
      username, 
      rootId: explicitRootId || commentId // Если explicitRootId нет, значит это сам корень ветки
    });
    
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  // Главные комментарии — те, у которых нет вообще root_id
  const rootComments = comments.filter(c => !c.root_id);
  // Ответы собираем строго по их принадлежности к конкретной ветке главного комментария
  const getReplies = (rootId: string) => comments.filter(c => c.root_id === rootId);

  return (
    <div className="w-full mt-3" ref={containerRef}>
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 transition-all duration-200 group/btn cursor-pointer ${
            isOpen ? 'text-[#34d399]' : 'text-neutral-500 hover:text-[#34d399]'
          }`}
        >
          <MessageSquare className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'fill-current' : 'group-hover/btn:scale-110'}`} />
          <span className="text-xs font-semibold font-mono select-none">{commentsCount}</span>
        </button>
        {children}
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-neutral-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-4 mb-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {isFetching ? (
              <p className="text-xs text-neutral-500 text-center py-2">Загрузка...</p>
            ) : rootComments.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-2">Пока нет комментариев. Будьте первым!</p>
            ) : (
              rootComments.map((rootComment) => (
                <div key={rootComment.id} className="space-y-3">
                  
                  {/* Главный комментарий */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex-shrink-0 overflow-hidden relative">
                      {rootComment.profiles.avatar_url ? (
                        <Image src={rootComment.profiles.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[10px] font-bold text-[#a78bfa]">
                          {rootComment.profiles.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-neutral-900/50 rounded-xl rounded-tl-none p-3 border border-neutral-800/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-[#34d399]">@{rootComment.profiles.username}</span>
                          <span className="text-[10px] text-neutral-600">{new Date(rootComment.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <p className="text-xs text-neutral-300 break-words leading-relaxed">{rootComment.content}</p>
                      </div>
                      <button 
                        onClick={() => handleReplyClick(rootComment.id, rootComment.profiles.username, null)}
                        className="text-[10px] text-neutral-500 hover:text-[#a78bfa] font-medium mt-1.5 ml-2 transition-colors"
                      >
                        Ответить
                      </button>
                    </div>
                  </div>

                  {/* Все вложенные ответы этой ветки */}
                  {getReplies(rootComment.id).length > 0 && (
                    <div className="space-y-3 mt-2">
                      {getReplies(rootComment.id).map((reply) => (
                        <div key={reply.id} className="flex gap-3 ml-9">
                          <div className="w-6 h-6 rounded-full bg-neutral-800 flex-shrink-0 overflow-hidden relative">
                            {reply.profiles.avatar_url ? (
                              <Image src={reply.profiles.avatar_url} alt="avatar" fill className="object-cover" unoptimized />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-[9px] font-bold text-[#a78bfa]">
                                {reply.profiles.username?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="bg-neutral-900/30 rounded-xl rounded-tl-none p-2.5 border border-neutral-800/30">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[11px] font-bold text-[#a78bfa]">@{reply.profiles.username}</span>
                                <span className="text-[9px] text-neutral-600">{new Date(reply.created_at).toLocaleDateString('ru-RU')}</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 break-words leading-relaxed">{reply.content}</p>
                            </div>
                            <button 
                              // ИСПРАВЛЕНО: Жестко передаем ID главного корневого комментария (rootComment.id)
                              onClick={() => handleReplyClick(reply.id, reply.profiles.username, rootComment.id)}
                              className="text-[10px] text-neutral-500 hover:text-[#a78bfa] font-medium mt-1 ml-2 transition-colors"
                            >
                              Ответить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* Поле ввода */}
          <div className="relative">
            {replyingTo && (
              <div className="flex items-center justify-between bg-neutral-800/50 rounded-t-lg px-3 py-1.5 border border-b-0 border-neutral-700/50 mb-[-1px] text-[10px]">
                <span className="text-neutral-400">Ответ <span className="text-[#a78bfa] font-medium">@{replyingTo.username}</span></span>
                <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-rose-400 transition-colors p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                disabled={isLoading}
                className={`w-full bg-[#1a1a1a] border border-neutral-800 pl-4 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-[#a78bfa] transition-colors disabled:opacity-50 ${
                  replyingTo ? 'rounded-b-xl rounded-tr-xl' : 'rounded-full'
                }`}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-[#a78bfa] disabled:opacity-50 disabled:hover:text-neutral-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}