import { create } from "zustand";
import type {
  ConnectionStatus,
  ChatMessage,
  SessionInfo,
} from "../types/language-learning.types";

interface LanguageLearningState {
  connectionStatus: ConnectionStatus;
  activeSession: SessionInfo;
  messages: ChatMessage[];
  isStreaming: boolean;
  ttsQueue: string[];
  isSpeaking: boolean;
  isListening: boolean;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSession: (session: SessionInfo) => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  enqueueTts: (phrases: string[]) => void;
  dequeueTts: () => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  reset: () => void;
}

const initialState = {
  connectionStatus: "disconnected" as ConnectionStatus,
  activeSession: null as SessionInfo,
  messages: [] as ChatMessage[],
  isStreaming: false,
  ttsQueue: [] as string[],
  isSpeaking: false,
  isListening: false,
};

export const useLanguageLearningStore = create<LanguageLearningState>(
  (set) => ({
    ...initialState,
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setActiveSession: (session) => set({ activeSession: session }),
    addMessage: (message) =>
      set((state) => ({ messages: [...state.messages, message] })),
    setStreaming: (isStreaming) => set({ isStreaming }),
    enqueueTts: (phrases) =>
      set((state) => ({ ttsQueue: [...state.ttsQueue, ...phrases] })),
    dequeueTts: () => set((state) => ({ ttsQueue: state.ttsQueue.slice(1) })),
    setSpeaking: (isSpeaking) => set({ isSpeaking }),
    setListening: (isListening) => set({ isListening }),
    reset: () => set(initialState),
  }),
);
