import { create } from 'zustand';
import { PackingStatus } from '../types/packing.types';

interface PackingState {
  activeVacationId: string | null;
  activeStatusFilters: PackingStatus[];
  activeProfileFilters: string[];
  activeCategoryFilters: string[];
  selectedItemId: string | null;

  setActiveVacation: (vacationId: string) => void;
  setActiveStatusFilters: (filters: PackingStatus[]) => void;
  toggleStatusFilter: (status: PackingStatus) => void;
  toggleProfileFilter: (profileId: string) => void;
  toggleCategoryFilter: (categoryId: string) => void;
  clearAllFilters: () => void;
  setSelectedItemId: (id: string | null) => void;
}

const vacationFilters: Record<
  string,
  { statuses: PackingStatus[]; profiles: string[]; categories: string[] }
> = {};

function saveFilters(
  vacId: string | null,
  statuses: PackingStatus[],
  profiles: string[],
  categories: string[]
) {
  if (vacId) vacationFilters[vacId] = { statuses, profiles, categories };
}

export const usePackingStore = create<PackingState>((set, get) => ({
  activeVacationId: null,
  activeStatusFilters: [],
  activeProfileFilters: [],
  activeCategoryFilters: [],
  selectedItemId: null,

  setActiveVacation: (vacationId) => {
    const current = get().activeVacationId;
    if (current === vacationId) return;
    saveFilters(
      current,
      get().activeStatusFilters,
      get().activeProfileFilters,
      get().activeCategoryFilters
    );
    const saved = vacationFilters[vacationId];
    set({
      activeVacationId: vacationId,
      activeStatusFilters: saved?.statuses ?? [],
      activeProfileFilters: saved?.profiles ?? [],
      activeCategoryFilters: saved?.categories ?? [],
    });
  },

  setActiveStatusFilters: (filters) => {
    set({ activeStatusFilters: filters });
    saveFilters(
      get().activeVacationId,
      filters,
      get().activeProfileFilters,
      get().activeCategoryFilters
    );
  },

  toggleStatusFilter: (status) =>
    set((state) => {
      const next = state.activeStatusFilters.includes(status)
        ? state.activeStatusFilters.filter((s) => s !== status)
        : [...state.activeStatusFilters, status];
      saveFilters(
        state.activeVacationId,
        next,
        state.activeProfileFilters,
        state.activeCategoryFilters
      );
      return { activeStatusFilters: next };
    }),

  toggleProfileFilter: (profileId) =>
    set((state) => {
      const next = state.activeProfileFilters.includes(profileId)
        ? state.activeProfileFilters.filter((id) => id !== profileId)
        : [...state.activeProfileFilters, profileId];
      saveFilters(
        state.activeVacationId,
        state.activeStatusFilters,
        next,
        state.activeCategoryFilters
      );
      return { activeProfileFilters: next };
    }),

  toggleCategoryFilter: (categoryId) =>
    set((state) => {
      const next = state.activeCategoryFilters.includes(categoryId)
        ? state.activeCategoryFilters.filter((id) => id !== categoryId)
        : [...state.activeCategoryFilters, categoryId];
      saveFilters(
        state.activeVacationId,
        state.activeStatusFilters,
        state.activeProfileFilters,
        next
      );
      return { activeCategoryFilters: next };
    }),

  clearAllFilters: () => {
    set({ activeStatusFilters: [], activeProfileFilters: [], activeCategoryFilters: [] });
    saveFilters(get().activeVacationId, [], [], []);
  },

  setSelectedItemId: (id) => set({ selectedItemId: id }),
}));
