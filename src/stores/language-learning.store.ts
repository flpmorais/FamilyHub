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
  authStatus: { configured: boolean; setupComplete: boolean } | null;
  isConfiguring: boolean;
  authError: string | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSession: (session: SessionInfo) => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  enqueueTts: (phrases: string[]) => void;
  dequeueTts: () => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  setAuthStatus: (
    status: { configured: boolean; setupComplete: boolean } | null,
  ) => void;
  setConfiguring: (isConfiguring: boolean) => void;
  setAuthError: (error: string | null) => void;
  updateLastAgentMessage: (content: string) => void;
  clearSession: () => void;
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
  authStatus: null as {
    configured: boolean;
    setupComplete: boolean;
  } | null,
  isConfiguring: false,
  authError: null as string | null,
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
    setAuthStatus: (authStatus) => set({ authStatus }),
    setConfiguring: (isConfiguring) => set({ isConfiguring }),
    setAuthError: (authError) => set({ authError }),
    updateLastAgentMessage: (content) =>
      set((state) => {
        const msgs = [...state.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "agent") {
          msgs[msgs.length - 1] = { ...last, content: last.content + content };
        }
        return { messages: msgs };
      }),
    clearSession: () =>
      set({
        activeSession: null,
        messages: [],
        isStreaming: false,
        ttsQueue: [],
        isSpeaking: false,
      }),
    reset: () => set(initialState),
  }),
);
