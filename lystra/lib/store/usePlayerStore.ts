import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl?: string;
}

function shuffleIndices(length: number, keepFirst: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  // Fisher-Yates on everything except the currently playing index,
  // which stays pinned to the front of the order.
  const rest = indices.filter((i) => i !== keepFirst);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [keepFirst, ...rest];
}

interface PlayerStore {
  currentTrack: Track | null;
  queue: Track[];
  playOrder: number[]; // indices into `queue`, in playback order
  playOrderIndex: number; // position of currentTrack within playOrder
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  previousVolume: number;
  isShuffled: boolean;

  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  playOrder: [],
  playOrderIndex: -1,
  isPlaying: false,
  volume: 0.5, // Громкость по умолчанию (от 0 до 1)
  isMuted: false,
  previousVolume: 0.5,
  isShuffled: false,

  playTrack: (track, queue) => {
    const { isShuffled } = get();
    const effectiveQueue = queue && queue.length > 0 ? queue : [track];
    const trackIndex = effectiveQueue.findIndex((t) => t.id === track.id);
    const safeTrackIndex = trackIndex === -1 ? 0 : trackIndex;

    const playOrder = isShuffled
      ? shuffleIndices(effectiveQueue.length, safeTrackIndex)
      : effectiveQueue.map((_, i) => i);

    set({
      currentTrack: effectiveQueue[safeTrackIndex] ?? track,
      queue: effectiveQueue,
      playOrder,
      playOrderIndex: playOrder.indexOf(safeTrackIndex),
      isPlaying: true,
    });
  },

  togglePlayPause: () => set((state) => ({
    isPlaying: state.currentTrack ? !state.isPlaying : false
  })),

  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),

  toggleMute: () => set((state) => {
    if (state.isMuted) {
      const restored = state.previousVolume || 0.5;
      return { isMuted: false, volume: restored };
    }
    return { isMuted: true, previousVolume: state.volume || 0.5, volume: 0 };
  }),

  playNext: () => set((state) => {
    const { queue, playOrder, playOrderIndex } = state;
    if (queue.length === 0 || playOrder.length === 0) return state;
    const nextOrderIndex = (playOrderIndex + 1) % playOrder.length;
    const nextTrack = queue[playOrder[nextOrderIndex]];
    if (!nextTrack) return state;
    return { currentTrack: nextTrack, playOrderIndex: nextOrderIndex, isPlaying: true };
  }),

  playPrev: () => set((state) => {
    const { queue, playOrder, playOrderIndex } = state;
    if (queue.length === 0 || playOrder.length === 0) return state;
    const prevOrderIndex = (playOrderIndex - 1 + playOrder.length) % playOrder.length;
    const prevTrack = queue[playOrder[prevOrderIndex]];
    if (!prevTrack) return state;
    return { currentTrack: prevTrack, playOrderIndex: prevOrderIndex, isPlaying: true };
  }),

  toggleShuffle: () => set((state) => {
    const nextIsShuffled = !state.isShuffled;
    const currentIndexInQueue = state.currentTrack
      ? state.queue.findIndex((t) => t.id === state.currentTrack!.id)
      : -1;

    if (currentIndexInQueue === -1) {
      return { isShuffled: nextIsShuffled };
    }

    const playOrder = nextIsShuffled
      ? shuffleIndices(state.queue.length, currentIndexInQueue)
      : state.queue.map((_, i) => i);

    return {
      isShuffled: nextIsShuffled,
      playOrder,
      playOrderIndex: playOrder.indexOf(currentIndexInQueue),
    };
  }),
}));
