import { create } from "zustand";
import { PackingStatus } from "../types/packing.types";

interface PackingState {
  activeVacationId: string | null;
  activeStatusFilters: PackingStatus[];
  activeProfileFilters: string[];
  activeCategoryFilters: string[];
  activeTagFilters: string[];
  selectedItemId: string | null;

  setActiveVacation: (vacationId: string) => void;
  setActiveStatusFilters: (filters: PackingStatus[]) => void;
  toggleStatusFilter: (status: PackingStatus) => void;
  toggleProfileFilter: (profileId: string) => void;
  toggleCategoryFilter: (categoryId: string) => void;
  toggleTagFilter: (tagId: string) => void;
  exclusiveStatusFilter: (status: PackingStatus) => void;
  clearAllFilters: () => void;
  setSelectedItemId: (id: string | null) => void;
}

const vacationFilters: Record<
  string,
  {
    statuses: PackingStatus[];
    profiles: string[];
    categories: string[];
    tags: string[];
  }
> = {};

function saveFilters(
  vacId: string | null,
  statuses: PackingStatus[],
  profiles: string[],
  categories: string[],
  tags: string[],
) {
  if (vacId) vacationFilters[vacId] = { statuses, profiles, categories, tags };
}

export const usePackingStore = create<PackingState>((set, get) => ({
  activeVacationId: null,
  activeStatusFilters: [],
  activeProfileFilters: [],
  activeCategoryFilters: [],
  activeTagFilters: [],
  selectedItemId: null,

  setActiveVacation: (vacationId) => {
    const current = get().activeVacationId;
    if (current === vacationId) return;
    saveFilters(
      current,
      get().activeStatusFilters,
      get().activeProfileFilters,
      get().activeCategoryFilters,
      get().activeTagFilters,
    );
    const saved = vacationFilters[vacationId];
    set({
      activeVacationId: vacationId,
      activeStatusFilters: saved?.statuses ?? [],
      activeProfileFilters: saved?.profiles ?? [],
      activeCategoryFilters: saved?.categories ?? [],
      activeTagFilters: saved?.tags ?? [],
    });
  },

  setActiveStatusFilters: (filters) => {
    set({ activeStatusFilters: filters });
    const s = get();
    saveFilters(
      s.activeVacationId,
      filters,
      s.activeProfileFilters,
      s.activeCategoryFilters,
      s.activeTagFilters,
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
        state.activeCategoryFilters,
        state.activeTagFilters,
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
        state.activeCategoryFilters,
        state.activeTagFilters,
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
        next,
        state.activeTagFilters,
      );
      return { activeCategoryFilters: next };
    }),

  toggleTagFilter: (tagId) =>
    set((state) => {
      const next = state.activeTagFilters.includes(tagId)
        ? state.activeTagFilters.filter((id) => id !== tagId)
        : [...state.activeTagFilters, tagId];
      saveFilters(
        state.activeVacationId,
        state.activeStatusFilters,
        state.activeProfileFilters,
        state.activeCategoryFilters,
        next,
      );
      return { activeTagFilters: next };
    }),

  exclusiveStatusFilter: (status) =>
    set((state) => {
      const isOnlyActive =
        state.activeStatusFilters.length === 1 &&
        state.activeStatusFilters[0] === status &&
        state.activeProfileFilters.length === 0 &&
        state.activeCategoryFilters.length === 0 &&
        state.activeTagFilters.length === 0;
      if (isOnlyActive) {
        saveFilters(state.activeVacationId, [], [], [], []);
        return {
          activeStatusFilters: [],
          activeProfileFilters: [],
          activeCategoryFilters: [],
          activeTagFilters: [],
        };
      }
      saveFilters(state.activeVacationId, [status], [], [], []);
      return {
        activeStatusFilters: [status],
        activeProfileFilters: [],
        activeCategoryFilters: [],
        activeTagFilters: [],
      };
    }),

  clearAllFilters: () => {
    set({
      activeStatusFilters: [],
      activeProfileFilters: [],
      activeCategoryFilters: [],
      activeTagFilters: [],
    });
    saveFilters(get().activeVacationId, [], [], [], []);
  },

  setSelectedItemId: (id) => set({ selectedItemId: id }),
}));
