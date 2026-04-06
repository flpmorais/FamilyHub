import { create } from 'zustand';
import type { RecipeType } from '../types/recipe.types';

interface RecipesState {
  scrollPosition: number;
  activeTypeFilter: RecipeType | null;
  searchTerm: string;
  setScrollPosition: (pos: number) => void;
  setActiveTypeFilter: (type: RecipeType | null) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

export const useRecipesStore = create<RecipesState>((set) => ({
  scrollPosition: 0,
  activeTypeFilter: null,
  searchTerm: '',
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  setActiveTypeFilter: (type) => set({ activeTypeFilter: type }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  reset: () => set({ scrollPosition: 0, activeTypeFilter: null, searchTerm: '' }),
}));
