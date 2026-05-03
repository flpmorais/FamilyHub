import { create } from "zustand";

interface VacationState {
  activeVacationId: string | null;
  pinnedVacationId: string | null;
  setActiveVacationId: (id: string | null) => void;
  setPinnedVacationId: (id: string | null) => void;
}

export const useVacationStore = create<VacationState>((set) => ({
  activeVacationId: null,
  pinnedVacationId: null,
  setActiveVacationId: (id) => set({ activeVacationId: id }),
  setPinnedVacationId: (id) => set({ pinnedVacationId: id }),
}));
