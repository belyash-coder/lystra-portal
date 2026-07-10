import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl?: string;
}

interface PlayerStore {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.5, // Громкость по умолчанию (от 0 до 1)
  
  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  
  togglePlayPause: () => set((state) => ({ 
    isPlaying: state.currentTrack ? !state.isPlaying : false 
  })),
  
  setVolume: (volume) => set({ volume }),
}));