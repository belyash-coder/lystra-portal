'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Trophy, Check, X, ArrowLeft, Music } from 'lucide-react';
import { QUIZ_SECTIONS, type QuizSection, type QuizGenre } from '@/data/quizGenres';

interface QuizTrack {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  audio: string;
}

type Stage = 'section' | 'genre' | 'loading' | 'play' | 'result' | 'empty';

const QUESTIONS_PER_ROUND = 6;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizPage() {
  const [stage, setStage] = useState<Stage>('section');
  const [section, setSection] = useState<QuizSection | null>(null);
  const [genre, setGenre] = useState<QuizGenre | null>(null);
  const [tracks, setTracks] = useState<QuizTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[index];

  const questionsTotal = Math.min(QUESTIONS_PER_ROUND, tracks.length);

  // Варианты ответа — правильный исполнитель + 3 случайных других из этой же
  // подборки жанра. Чистая производная от текущего трека, эффект не нужен.
  const options = useMemo(() => {
    if (!currentTrack) return [];
    const others = tracks.filter((t) => t.id !== currentTrack.id).map((t) => t.artist);
    return shuffle([currentTrack.artist, ...shuffle(others).slice(0, 3)]);
  }, [currentTrack, tracks]);

  const startGenre = async (s: QuizSection, g: QuizGenre) => {
    setSection(s);
    setGenre(g);
    setStage('loading');
    try {
      const res = await fetch(`/api/quiz-tracks?section=${s.id}&genre=${g.id}`);
      const data = await res.json();
      const fetched: QuizTrack[] = (data.tracks || []).filter((t: QuizTrack) => !!t.audio);

      if (fetched.length < 4) {
        setStage('empty');
        return;
      }

      setTracks(shuffle(fetched));
      setIndex(0);
      setScore(0);
      setSelected(null);
      setIsPlaying(false);
      setStage('play');
    } catch {
      setStage('empty');
    }
  };

  // При смене вопроса перезагружаем аудио-элемент, чтобы не доигрывал
  // предыдущий трек и не сохранял прогресс перемотки.
  useEffect(() => {
    if (stage !== 'play' || !currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }, [stage, index, currentTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const answer = (artist: string) => {
    if (selected) return;
    setSelected(artist);
    audioRef.current?.pause();
    setIsPlaying(false);
    if (artist === currentTrack.artist) setScore((s) => s + 1);
  };

  const next = () => {
    setSelected(null);
    setIsPlaying(false);
    if (index + 1 >= questionsTotal) {
      setStage('result');
    } else {
      setIndex((i) => i + 1);
    }
  };

  const reset = () => {
    setStage('section');
    setSection(null);
    setGenre(null);
    setTracks([]);
    setIndex(0);
    setScore(0);
    setSelected(null);
  };

  return (
    <main className="min-h-screen bg-[#121212] text-white p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8 mt-2 md:mt-8">
        <div className="text-center px-2">
          <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
            Угадай <span className="text-[#a78bfa]">исполнителя</span>
          </h1>
          <p className="text-neutral-400 text-sm md:text-lg">Слушай отрывок и выбирай, кто это исполняет.</p>
        </div>

        {stage === 'section' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUIZ_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSection(s);
                  setStage('genre');
                }}
                className="bg-[#1a1a1a]/80 border border-neutral-800 rounded-3xl p-8 text-2xl font-bold hover:border-[#a78bfa] hover:shadow-[0_0_30px_rgba(167,139,250,0.15)] transition-all cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {stage === 'genre' && section && (
          <div>
            <button
              onClick={() => setStage('section')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4 text-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Назад
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {section.genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => startGenre(section, g)}
                  className="bg-[#1a1a1a]/80 border border-neutral-800 rounded-2xl p-5 font-semibold hover:border-[#34d399] hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all cursor-pointer"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <RefreshCw className="w-8 h-8 text-[#34d399] animate-spin" />
            <p className="text-neutral-400">Подбираем треки…</p>
          </div>
        )}

        {stage === 'empty' && (
          <div className="text-center space-y-4 py-8">
            <p className="text-neutral-400">Не удалось найти достаточно треков для этого жанра. Попробуй другой.</p>
            <button
              onClick={() => setStage(section ? 'genre' : 'section')}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-2xl border border-neutral-700 transition-colors cursor-pointer"
            >
              Назад к жанрам
            </button>
          </div>
        )}

        {stage === 'play' && currentTrack && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-neutral-400">
              <span>
                {section?.label} · {genre?.label}
              </span>
              <span>
                Вопрос {index + 1} / {questionsTotal} · Счёт: {score}
              </span>
            </div>

            <div className="bg-[#1a1a1a]/80 border border-neutral-800 rounded-[2rem] p-8 flex flex-col items-center gap-6">
              <audio ref={audioRef} src={currentTrack.audio} onEnded={() => setIsPlaying(false)} preload="none" />

              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#34d399] flex items-center justify-center text-[#121212] hover:scale-105 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>

              {selected && (
                <div className="flex items-center gap-3 text-center animate-in fade-in">
                  <div className="w-12 h-12 rounded overflow-hidden bg-neutral-800 flex-shrink-0">
                    {currentTrack.cover ? (
                      <img src={currentTrack.cover} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-neutral-600" />
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{currentTrack.title}</p>
                    <p className="text-xs text-[#a78bfa]">{currentTrack.artist}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((artist) => {
                const isCorrect = artist === currentTrack.artist;
                const isChosen = artist === selected;
                let cls = 'bg-[#1a1a1a]/80 border-neutral-800 hover:border-neutral-600';
                if (selected) {
                  if (isCorrect) cls = 'bg-[#34d399]/10 border-[#34d399] text-[#34d399]';
                  else if (isChosen) cls = 'bg-red-500/10 border-red-500 text-red-400';
                  else cls = 'bg-[#1a1a1a]/40 border-neutral-800 text-neutral-500';
                }
                return (
                  <button
                    key={artist}
                    onClick={() => answer(artist)}
                    disabled={!!selected}
                    className={`flex items-center justify-between gap-2 border rounded-2xl px-5 py-4 font-medium transition-all text-left ${cls} ${
                      !selected ? 'cursor-pointer' : ''
                    }`}
                  >
                    <span className="truncate">{artist}</span>
                    {selected && isCorrect && <Check className="w-5 h-5 flex-shrink-0" />}
                    {selected && isChosen && !isCorrect && <X className="w-5 h-5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selected && (
              <button
                onClick={next}
                className="w-full bg-gradient-to-r from-[#a78bfa] to-[#34d399] text-[#121212] font-bold text-lg py-4 rounded-2xl hover:scale-[1.02] transition-all cursor-pointer"
              >
                {index + 1 >= questionsTotal ? 'Результат' : 'Дальше'}
              </button>
            )}
          </div>
        )}

        {stage === 'result' && section && genre && (
          <div className="text-center space-y-6 py-6">
            <Trophy className="w-16 h-16 text-[#a78bfa] mx-auto" />
            <h2 className="text-3xl font-black">
              {score} / {questionsTotal}
            </h2>
            <p className="text-neutral-400">
              {section.label} · {genre.label}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => startGenre(section, genre)}
                className="bg-gradient-to-r from-[#a78bfa] to-[#34d399] text-[#121212] font-bold px-6 py-3 rounded-2xl hover:scale-105 transition-all cursor-pointer"
              >
                Ещё раз
              </button>
              <button
                onClick={() => setStage('genre')}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-2xl border border-neutral-700 transition-colors cursor-pointer"
              >
                Другой жанр
              </button>
              <button
                onClick={reset}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-2xl border border-neutral-700 transition-colors cursor-pointer"
              >
                Другой раздел
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
