import type { SSEEvent } from "../../types/language-learning.types";
import type { ISessionRepository } from "../interfaces/session.repository.interface";
import { HEALTH_CHECK_TIMEOUT_MS } from "../../constants/language-learning-defaults";
import { consumeSSE } from "../../services/sse-client";

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

  async startSession(skill: string): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skill }),
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao iniciar sessão");
    }
  }

  async resumeSession(): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/session/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao retomar sessão");
    }
  }

  async endSession(): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/session/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao terminar sessão");
    }
  }

  async getSessionStatus(): Promise<{
    active: boolean;
    skill: string | null;
  }> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/session/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      throw new Error("Erro ao obter estado da sessão");
    }
    const data = await response.json();
    return {
      active: !!data?.active,
      skill: data?.skill ?? null,
    };
  }

  async sendMessage(content: string): Promise<AsyncIterable<SSEEvent>> {
    const token = await this.getToken();
    if (!token) throw new Error("Sessão expirada. Inicie sessão novamente.");
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/session/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
    } catch {
      throw new Error(NETWORK_ERROR);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? "Erro ao enviar mensagem");
    }
    return consumeSSE(response);
  }
}
