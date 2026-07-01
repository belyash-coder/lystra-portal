'use client';

import React, { useState, useRef, useEffect } from 'react';
import genresData from '../../data/genres.json';

export default function TmaRoulettePage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentGenre, setCurrentGenre] = useState('Готов крутить?');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  // Сообщения и плеер для подгрузки музыки
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Функция для перемотки трека по клику на полосу
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };
  // На вебе мы обращаемся к API по относительному пути, чтобы браузер не блокировал запрос (CORS)
  const API_URL = "";

  // Сообщаем Telegram, что приложение готово, и раскрываем его на максимум
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand(); // Разворачивает окно Mini App на весь экран телефона
    }

    // Находим и скрываем глобальную шапку сайта, чтобы в Telegram интерфейс был абсолютно чистым
    const globalHeader = document.querySelector('header');
    if (globalHeader) {
      globalHeader.style.display = 'none';
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Возвращаем шапку на место, если пользователь перейдет на другую страницу сайта
      if (globalHeader) {
        globalHeader.style.display = '';
      }
    };
  }, []);

  const fetchTracks = async (genre: string) => {
    setIsLoadingTracks(true);
    setTracks([]);
    try {
      const response = await fetch(`${API_URL}/api/spotify-mix?genre=${encodeURIComponent(genre)}`);
      const data = await response.json();
      if (data.tracks && data.tracks.length > 0) {
        // Логика 1-в-1 как в мобильном приложении: просто передаем полученные треки
        setTracks(data.tracks);

        // Плавный скролл к блоку с результатами (увеличенная задержка)
        setTimeout(() => {
          const resultsEl = document.getElementById('results-start');
          if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 600);{/* Кнопка запуска */}
        <button 
          onClick={handleSpin} 
          disabled={isSpinning}
          style={{
            ...styles.spinButton,
            backgroundColor: isSpinning ? '#1A1A1E' : '#A78BFA', // Лавандовая кнопка
            color: isSpinning ? '#71717A' : '#0B0B0F',
            cursor: isSpinning ? 'not-allowed' : 'pointer'
          }}
        >
          {isSpinning ? 'Ищем вайб...' : 'Крутить рулетку'}
        </button>
      }
    } catch (error) {
      console.error("Ошибка загрузки треков:", error);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handlePlayPause = (track: any) => {
    if (playingTrackId === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(err => console.error("Ошибка воспроизведения:", err));
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Теперь мы точно знаем, что твой API отдает ссылку в поле audio
    const previewUrl = track.audio;

    if (!previewUrl) return;

    audioRef.current = new Audio(previewUrl as string);
    setPlayingTrackId(track.id);
    setIsPlaying(true);
    setTrackProgress(0);

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current && audioRef.current.duration) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setTrackProgress(progress);
      }
    };

    audioRef.current.play().catch(err => {
      console.error("Воспроизведение отклонено браузером:", err);
      setIsPlaying(false);
    });

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setPlayingTrackId(null);
      setTrackProgress(0);
    };
  };

  const openStreamingApp = (platform: 'spotify' | 'yandex') => {
    if (!selectedGenre) return;
    
    const query = encodeURIComponent(selectedGenre);
    let url = '';

    if (platform === 'spotify') {
      url = `https://open.spotify.com/search/${query}`;
    } else if (platform === 'yandex') {
      url = `https://music.yandex.ru/search?text=${query}`;
    }

    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSpin = () => {
    if (isSpinning) return;

    // Сбрасываем плеер перед новым кручением
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayingTrackId(null);
    }

    setIsSpinning(true);
    setSelectedGenre(null);
    setTracks([]);

    let step = 0;
    const maxSteps = 30; 
    let currentDelay = 25; 

    const tick = () => {
      const randomGenre = (genresData as string[])[Math.floor(Math.random() * genresData.length)];
      setCurrentGenre(randomGenre);

      step++;

      if (step > 15) {
        currentDelay *= 1.14; 
      }

      if (step < maxSteps) {
        setTimeout(tick, currentDelay);
      } else {
        setIsSpinning(false);
        setSelectedGenre(randomGenre);
        // Запускаем подгрузку треков сразу после выбора жанра
        fetchTracks(randomGenre);
      }
    };

    tick();
  };

  return (
    <div style={styles.container}>
      {/* Шапка */}
      <div style={styles.header}>
        <img src="/logo.jpg" alt="LYSTRA Logo" style={styles.logo} />
        <p style={styles.subtitle}>
          <span style={{ color: '#6EE7B7' }}>MUSIC</span>{' '}
          <span style={{ color: '#A78BFA' }}>DISCOVERY</span>
        </p>
      </div>

      {/* Экран барабана */}
      <div style={styles.main}>
        <div style={{
          ...styles.wheelContainer,
          borderColor: isSpinning ? '#6EE7B7' : '#2A2A32', // Мятный при вращении
          boxShadow: isSpinning ? '0 0 30px rgba(110, 231, 183, 0.2)' : 'none'
        }}>
          {/* Иконка пластинки */}
          <svg 
            style={{
              ...styles.icon,
              animation: isSpinning ? 'spin 1s linear infinite' : 'none',
              color: isSpinning ? '#A78BFA' : '#FFFFFF' // Лавандовый при вращении
            }} 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>

          {/* Текст жанра */}
          <div style={styles.genreWrapper}>
            <span style={{
              ...styles.genreText,
              color: selectedGenre ? '#FFFFFF' : '#A78BFA',
              textShadow: selectedGenre ? '0 0 20px rgba(110, 231, 183, 0.6)' : 'none'
            }}>
              {currentGenre}
            </span>
          </div>
        </div>

        {/* Кнопка запуска */}
        <button 
          onClick={handleSpin} 
          disabled={isSpinning}
          style={{
            ...styles.spinButton,
            backgroundColor: isSpinning ? '#1A1A1E' : '#A78BFA', // Лавандовая кнопка
            color: isSpinning ? '#71717A' : '#0B0B0F',
            cursor: isSpinning ? 'not-allowed' : 'pointer'
          }}
        >
          {isSpinning ? 'Ищем вайб...' : 'Крутить рулетку'}
        </button>

            {/* Анимированный спиннер загрузки треков */}
            {isLoadingTracks && (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Подбираем эксклюзивный микс...</p>
              </div>
            )}

            {/* Вывод списка треков */}
            {!isLoadingTracks && tracks.length > 0 && (
              <div id="results-start" style={styles.resultsContainer}>
                
                {/* Мятная плашка с выпавшим жанром */}
                <div style={styles.resultGenreWrapper}>
                  <span style={styles.resultGenreText}>{selectedGenre}</span>
                </div>

                {tracks.map((track) => {
                  const isCurrentTrackPlaying = playingTrackId === track.id && isPlaying;
                  return (
                    <div key={track.id} style={styles.trackCard}>
                      <img 
                        src={track.cover || 'https://via.placeholder.com/150'} 
                        alt={track.title} 
                        style={styles.coverImage} 
                      />
                      <div style={styles.trackInfo}>
                        <div style={styles.trackTitle}>{track.title}</div>
                        <div style={styles.trackArtist}>{track.artist}</div>
                        
                        {/* Полоса прогресса появляется только у играющего трека */}
                        {isCurrentTrackPlaying && (
                          <div style={styles.progressBarContainer} onClick={handleSeek}>
                            <div style={styles.progressBarBg}>
                              <div style={{ ...styles.progressBarFill, width: `${trackProgress}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => handlePlayPause(track)}
                        style={{
                          ...styles.playButton,
                          backgroundColor: isCurrentTrackPlaying ? '#6EE7B7' : '#1F1F24',
                          color: isCurrentTrackPlaying ? '#0B0B0F' : '#FFFFFF'
                        }}
                      >
                        {isCurrentTrackPlaying ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* Кнопки стримингов */}
                <div style={styles.platformsContainer}>
                  <button 
                    style={{...styles.platformButton, borderColor: '#A78BFA'}} 
                    onClick={() => openStreamingApp('spotify')}
                  >
                    <span style={styles.platformButtonText}>Spotify</span>
                  </button>
                  <button 
                    style={{...styles.platformButton, borderColor: '#6EE7B7'}} 
                    onClick={() => openStreamingApp('yandex')}
                  >
                    <span style={styles.platformButtonText}>Яндекс Музыка</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      {/* Анимация вращения пластинки и скрытие лишнего интерфейса портала */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Прячем навигацию, боковые панели и подвалы основного сайта на этой странице */
        nav, footer, header, .navbar, .sidebar, .footer, .header, [class*="sidebar"], [class*="navbar"] {
          display: none !important;
        }
        
        /* Обнуляем внешние отступы, которые мог навязать глобальный шаблон сайта */
        body, main {
          padding: 0 !important;
          margin: 0 !important;
        }
      `}} />
}

// Фирменные стили (Темный фон, лавандовые и мятные акценты)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#000000', // Абсолютно черный фон
    color: '#FFFFFF',
    fontFamily: 'system-ui, sans-serif',
    padding: '24px',
    boxSizing: 'border-box',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  logo: {
    width: '100%',
    maxWidth: '200px',
    height: 'auto',
    display: 'block',
    margin: '0 auto 16px auto'
  },
  subtitle: {
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '6px',
    textTransform: 'uppercase',
    margin: 0
  },
  main: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  wheelContainer: {
    backgroundColor: '#141419',
    borderRadius: '32px',
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '240px',
    border: '2px solid #2A2A32',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box'
  },
  icon: {
    width: '56px',
    height: '56px',
    marginBottom: '20px',
    transition: 'color 0.3s ease'
  },
  genreWrapper: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  genreText: {
    fontSize: '28px',
    fontWeight: 900,
    textTransform: 'capitalize',
    transition: 'all 0.1s ease'
  },
  spinButton: {
    width: '100%',
    padding: '18px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(167, 139, 250, 0.3)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(167, 139, 250, 0.1)',
    borderTop: '3px solid #A78BFA',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#71717A',
    marginTop: '12px',
    fontSize: '14px'
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
    width: '100%',
    scrollMarginTop: '24px' // Чтобы при скролле оставался красивый отступ сверху
  },
  resultGenreWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
    marginTop: '8px'
  },
  resultGenreText: {
    color: '#6EE7B7',
    border: '1px solid #6EE7B7',
    backgroundColor: 'rgba(110, 231, 183, 0.08)',
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '16px',
    fontWeight: 'bold',
    textTransform: 'capitalize'
  },
  trackCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#141419',
    borderRadius: '16px',
    padding: '12px',
    border: '1px solid #2A2A32',
    boxSizing: 'border-box'
  },
  coverImage: {
    width: '56px',
    height: '56px',
    borderRadius: '10px',
    objectFit: 'cover',
    backgroundColor: '#2A2A32'
  },
  trackInfo: {
    flex: 1,
    marginLeft: '16px',
    marginRight: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'hidden'
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'left'
  },
  trackArtist: {
    color: '#71717A',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'left'
  },
  progressBarContainer: {
    width: '100%',
    padding: '8px 0',
    cursor: 'pointer',
    marginTop: '4px'
  },
  progressBarBg: {
    height: '4px',
    backgroundColor: '#2A2A32',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6EE7B7', // Мятный цвет заполнения
    borderRadius: '2px',
    transition: 'width 0.1s linear'
  },
  playButton: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  platformsContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    width: '100%'
  },
  platformButton: {
    flex: 1,
    backgroundColor: '#141419',
    padding: '14px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  platformButtonText: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600
  }
};