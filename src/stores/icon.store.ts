import { create } from "zustand";
import type { IconEntry } from "../types/packing.types";
import type { IIconRepository } from "../repositories/interfaces/icon.repository.interface";

interface IconState {
  icons: IconEntry[];
  iconsMap: Map<string, IconEntry>;
  loaded: boolean;
  loadIcons: (repo: IIconRepository) => Promise<void>;
  resolveIconName: (iconId: string) => string;
}

export const useIconStore = create<IconState>((set, get) => ({
  icons: [],
  iconsMap: new Map(),
  loaded: false,

  loadIcons: async (repo) => {
    if (get().loaded) return;
    const icons = await repo.getIcons();
    set({
      icons,
      iconsMap: new Map(icons.map((i) => [i.id, i])),
      loaded: true,
    });
  },

  resolveIconName: (iconId) => {
    return get().iconsMap.get(iconId)?.name ?? "help";
  },
}));
