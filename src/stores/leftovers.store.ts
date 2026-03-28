import { create } from "zustand";

interface LeftoversState {
  paginationCursor: number;
  scrollPosition: number;
  setPaginationCursor: (cursor: number) => void;
  setScrollPosition: (pos: number) => void;
  reset: () => void;
}

export const useLeftoversStore = create<LeftoversState>((set) => ({
  paginationCursor: 0,
  scrollPosition: 0,
  setPaginationCursor: (cursor) => set({ paginationCursor: cursor }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  reset: () => set({ paginationCursor: 0, scrollPosition: 0 }),
}));
