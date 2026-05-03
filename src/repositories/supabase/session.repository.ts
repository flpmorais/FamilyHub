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

  async configureApiKey(apiKey: string): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");
    const response = await fetch(`${this.baseUrl}/auth/configure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao configurar a chave API");
    }
  }

  async getAuthStatus(): Promise<{
    configured: boolean;
    setupComplete: boolean;
  }> {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");
    const response = await fetch(`${this.baseUrl}/auth/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to get auth status");
    const data = await response.json();
    return {
      configured: data.configured,
      setupComplete: data.setup_complete,
    };
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
