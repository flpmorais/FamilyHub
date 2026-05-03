import type { SSEEvent } from "../../types/language-learning.types";
import type { ISessionRepository } from "../interfaces/session.repository.interface";
import { HEALTH_CHECK_TIMEOUT_MS } from "../../constants/language-learning-defaults";

const NETWORK_ERROR = "Erro de ligação. Verifique a sua conexão.";

export class SessionRepository implements ISessionRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT_MS,
    );
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async configureApiKey(apiKey: string): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/auth/configure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ api_key: apiKey }),
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao configurar a chave API");
    }
    const data = await response.json().catch(() => null);
    if (!data?.provisioned) {
      throw new Error("Erro ao configurar a chave API");
    }
  }

  async getAuthStatus(): Promise<{
    configured: boolean;
    setupComplete: boolean;
  }> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/auth/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      throw new Error("Erro ao obter estado de autenticação");
    }
    const data = await response.json();
    return {
      configured: !!data?.configured,
      setupComplete: !!data?.setup_complete,
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
