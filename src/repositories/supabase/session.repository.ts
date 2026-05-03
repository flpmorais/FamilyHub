import type { SSEEvent } from "../../types/language-learning.types";
import type { ISessionRepository } from "../interfaces/session.repository.interface";

export class SessionRepository implements ISessionRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          signal: controller.signal,
        });
        return response.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }

  async configureApiKey(_apiKey: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async getAuthStatus(): Promise<{
    configured: boolean;
    setupComplete: boolean;
  }> {
    throw new Error("Not implemented");
  }

  async startSession(_skill: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async resumeSession(): Promise<void> {
    throw new Error("Not implemented");
  }

  async endSession(): Promise<void> {
    throw new Error("Not implemented");
  }

  async getSessionStatus(): Promise<{
    active: boolean;
    skill: string | null;
  }> {
    throw new Error("Not implemented");
  }

  async sendMessage(_content: string): Promise<AsyncIterable<SSEEvent>> {
    throw new Error("Not implemented");
  }
}
