import { create } from "zustand";

interface ShoppingState {
  scrollPosition: number;
  activeCategoryFilter: string | null;
  setScrollPosition: (pos: number) => void;
  setActiveCategoryFilter: (categoryId: string | null) => void;
  reset: () => void;
}

export const useShoppingStore = create<ShoppingState>((set) => ({
  scrollPosition: 0,
  activeCategoryFilter: null,
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  setActiveCategoryFilter: (categoryId) =>
    set({ activeCategoryFilter: categoryId }),
  reset: () => set({ scrollPosition: 0, activeCategoryFilter: null }),
}));
