import type {
  ChatMessage,
  SSEEvent,
} from "../../types/language-learning.types";

export interface ISessionRepository {
  healthCheck(): Promise<boolean>;
  configureApiKey(apiKey: string): Promise<void>;
  getAuthStatus(): Promise<{
    configured: boolean;
    setupComplete: boolean;
  }>;
  startSession(skill: string): Promise<{ sessionId: string; skill: string }>;
  resumeSession(): Promise<ChatMessage[]>;
  endSession(): Promise<void>;
  getSessionStatus(): Promise<{ active: boolean; skill: string | null }>;
  sendMessage(content: string): Promise<AsyncIterable<SSEEvent>>;
}
