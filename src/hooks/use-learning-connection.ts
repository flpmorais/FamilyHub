import { useEffect } from "react";
import { useRepository } from "./use-repository";
import { useLanguageLearningStore } from "../stores/language-learning.store";
import { HEALTH_CHECK_INTERVAL_MS } from "../constants/language-learning-defaults";

export function useLearningConnection() {
  const sessionRepo = useRepository("session");
  const setConnectionStatus = useLanguageLearningStore(
    (s) => s.setConnectionStatus,
  );

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function check(isRetry: boolean) {
      if (inFlight) return;
      inFlight = true;
      if (isRetry && !cancelled) setConnectionStatus("reconnecting");
      const ok = await sessionRepo.healthCheck();
      inFlight = false;
      if (!cancelled) {
        setConnectionStatus(ok ? "connected" : "disconnected");
      }
    }

    check(false);
    const interval = setInterval(() => check(true), HEALTH_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionRepo, setConnectionStatus]);
}
