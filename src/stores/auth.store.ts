import { create } from 'zustand';
import { UserAccount } from '../types/profile.types';

interface AuthState {
  userAccount: UserAccount | null;
  isLoading: boolean;
  error: string | null;
  setUserAccount: (userAccount: UserAccount | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userAccount: null,
  isLoading: false,
  error: null,
  setUserAccount: (userAccount) => set({ userAccount }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
