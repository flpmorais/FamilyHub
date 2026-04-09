import { create } from 'zustand';
import type { DishType, DishTypeKey } from '../types/dish-type.types';
import type { IDishTypeRepository } from '../repositories/interfaces/dish-type.repository.interface';

interface DishTypeState {
  dishTypes: DishType[];
  byKey: Partial<Record<DishTypeKey, DishType>>;
  loadedFamilyId: string | null;
  loading: boolean;
  load: (repo: IDishTypeRepository, familyId: string) => Promise<void>;
  reset: () => void;
}

export const useDishTypeStore = create<DishTypeState>((set, get) => ({
  dishTypes: [],
  byKey: {},
  loadedFamilyId: null,
  loading: false,

  load: async (repo, familyId) => {
    if (get().loading) return;
    if (get().loadedFamilyId === familyId && get().dishTypes.length > 0) return;

    set({ loading: true });
    try {
      const list = await repo.getByFamilyId(familyId);
      const byKey: Partial<Record<DishTypeKey, DishType>> = {};
      for (const dt of list) byKey[dt.key] = dt;
      set({ dishTypes: list, byKey, loadedFamilyId: familyId, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  reset: () => set({ dishTypes: [], byKey: {}, loadedFamilyId: null }),
}));
