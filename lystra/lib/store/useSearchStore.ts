import { create } from 'zustand';

interface SearchStore {
  query: string;
  results: any[];
  scrollPosition: number;
  setSearchData: (query: string, results: any[]) => void;
  setScrollPosition: (pos: number) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: "",
  results: [],
  scrollPosition: 0,
  
  setSearchData: (query, results) => set({ query, results }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  clearSearch: () => set({ query: "", results: [], scrollPosition: 0 }),
}));