import { useEffect } from "react";
import * as Speech from "expo-speech";
import { useLanguageLearningStore } from "../stores/language-learning.store";
import {
  TTS_REPEAT_PAUSE_MS,
  TTS_PHRASE_PAUSE_MS,
} from "../constants/language-learning-defaults";

function speakPhrase(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: "el-GR",
      onDone: resolve,
      onError: () => resolve(),
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTtsQueue() {
  const ttsQueue = useLanguageLearningStore((s) => s.ttsQueue);
  const isSpeaking = useLanguageLearningStore((s) => s.isSpeaking);
  const store = useLanguageLearningStore();

  useEffect(() => {
    if (ttsQueue.length === 0 || isSpeaking) return;

    store.setSpeaking(true);
    let cancelled = false;

    (async () => {
      while (store.ttsQueue.length > 0 && !cancelled) {
        const phrase = store.ttsQueue[0];
        store.setCurrentTtsPhrase(phrase);

        await speakPhrase(phrase);
        if (cancelled) break;
        await delay(TTS_REPEAT_PAUSE_MS);
        if (cancelled) break;

        await speakPhrase(phrase);
        if (cancelled) break;
        await delay(TTS_PHRASE_PAUSE_MS);

        store.dequeueTts();
      }

      if (!cancelled) {
        store.setCurrentTtsPhrase(null);
        store.setSpeaking(false);
      }
    })();

    return () => {
      cancelled = true;
      Speech.stop();
    };
  }, [ttsQueue.length > 0, isSpeaking]);
}
