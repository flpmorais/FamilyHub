import { create } from "zustand";
import { SyncStatus } from "../types/sync.types";

interface UiState {
  isOffline: boolean;
  syncStatus: SyncStatus;
  globalError: string | null;
  isSidebarOpen: boolean;
  setIsOffline: (isOffline: boolean) => void;
  setSyncStatus: (syncStatus: SyncStatus) => void;
  setGlobalError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isOffline: false,
  syncStatus: "synced",
  globalError: null,
  isSidebarOpen: false,
  setIsOffline: (isOffline) => set({ isOffline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setGlobalError: (error) => set({ globalError: error }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
}));
