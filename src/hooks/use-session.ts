import { router } from "expo-router";
import { useRepository } from "./use-repository";
import { useLanguageLearningStore } from "../stores/language-learning.store";

export function useSession() {
  const sessionRepo = useRepository("session");
  const store = useLanguageLearningStore();

  async function sendMessage(content: string) {
    if (store.isStreaming) return;

    store.setStreaming(true);
    store.addMessage({
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: Date.now(),
    });

    try {
      const stream = await sessionRepo.sendMessage(content);
      store.addMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: "",
        timestamp: Date.now(),
      });

      for await (const event of stream) {
        switch (event.type) {
          case "token":
            store.updateLastAgentMessage(event.content);
            break;
          case "speak":
            store.enqueueTts(event.phrases);
            break;
          case "skill-complete":
            await sessionRepo.endSession();
            store.clearSession();
            router.replace("../");
            return;
          case "error":
            store.setAuthError(event.message);
            break;
          case "done":
            break;
        }
      }
    } catch (e: any) {
      store.setAuthError(e?.message ?? "Erro ao enviar mensagem");
    } finally {
      store.setStreaming(false);
    }
  }

  async function startSession(skill: string) {
    try {
      const result = await sessionRepo.startSession(skill);
      store.setActiveSession({ id: result.sessionId, skill: result.skill });
    } catch (e: any) {
      store.setAuthError(e?.message ?? "Erro ao iniciar sessão");
    }
  }

  async function resumeSession() {
    try {
      const messages = await sessionRepo.resumeSession();
      for (const msg of messages) {
        store.addMessage(msg);
      }
    } catch (e: any) {
      store.setAuthError(e?.message ?? "Erro ao retomar sessão");
    }
  }

  async function endSession() {
    try {
      await sessionRepo.endSession();
      store.clearSession();
    } catch (e: any) {
      store.setAuthError(e?.message ?? "Erro ao terminar sessão");
    }
  }

  async function getSessionStatus() {
    try {
      return await sessionRepo.getSessionStatus();
    } catch (e: any) {
      store.setAuthError(e?.message ?? "Erro ao obter estado da sessão");
      return { active: false, skill: null };
    }
  }

  return {
    sendMessage,
    startSession,
    resumeSession,
    endSession,
    getSessionStatus,
  };
}
