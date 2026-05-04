import { useEffect, useRef } from "react";
import * as Speech from "expo-speech";
import { useLanguageLearningStore } from "../stores/language-learning.store";
import {
  TTS_REPEAT_PAUSE_MS,
  TTS_PHRASE_PAUSE_MS,
} from "../constants/language-learning-defaults";
import { logger } from "../utils/logger";

function speakPhrase(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: "el-GR",
      onDone: resolve,
      onError: (error) => {
        logger.error("TTS", "speak failed", error);
        resolve();
      },
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTtsQueue() {
  const ttsQueue = useLanguageLearningStore((s) => s.ttsQueue);
  const activeSession = useLanguageLearningStore((s) => s.activeSession);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!activeSession) {
      Speech.stop();
      isProcessingRef.current = false;
      const store = useLanguageLearningStore.getState();
      store.setCurrentTtsPhrase(null);
      store.setSpeaking(false);
    }
  }, [activeSession]);

  useEffect(() => {
    if (ttsQueue.length === 0 || isProcessingRef.current) return;

    const store = useLanguageLearningStore.getState();
    isProcessingRef.current = true;
    store.setSpeaking(true);
    let cancelled = false;

    (async () => {
      const liveStore = useLanguageLearningStore.getState;
      while (liveStore().ttsQueue.length > 0 && !cancelled) {
        const phrase = liveStore().ttsQueue[0];
        liveStore().setCurrentTtsPhrase(phrase);

        await speakPhrase(phrase);
        if (cancelled) break;
        await delay(TTS_REPEAT_PAUSE_MS);
        if (cancelled) break;

        await speakPhrase(phrase);
        if (cancelled) break;

        liveStore().dequeueTts();

        if (liveStore().ttsQueue.length > 0) {
          await delay(TTS_PHRASE_PAUSE_MS);
        }
      }

      if (!cancelled) {
        liveStore().setCurrentTtsPhrase(null);
        liveStore().setSpeaking(false);
      }
      isProcessingRef.current = false;
    })();

    return () => {
      cancelled = true;
      isProcessingRef.current = false;
      Speech.stop();
    };
  }, [ttsQueue.length]);
}
