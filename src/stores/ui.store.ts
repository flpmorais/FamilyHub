import { create } from 'zustand';
import { SyncStatus } from '../types/sync.types';

interface UiState {
  isOffline: boolean;
  syncStatus: SyncStatus;
  globalError: string | null;
  setIsOffline: (isOffline: boolean) => void;
  setSyncStatus: (syncStatus: SyncStatus) => void;
  setGlobalError: (error: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isOffline: false,
  syncStatus: 'synced',
  globalError: null,
  setIsOffline: (isOffline) => set({ isOffline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setGlobalError: (error) => set({ globalError: error }),
}));
