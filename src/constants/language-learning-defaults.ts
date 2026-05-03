import type { LearningSkill } from "../types/language-learning.types";

export const HEALTH_CHECK_INTERVAL_MS = 10000;
export const HEALTH_CHECK_TIMEOUT_MS = 8000;
export const TTS_REPEAT_PAUSE_MS = 800;
export const TTS_PHRASE_PAUSE_MS = 1200;
export const SKILLS: LearningSkill[] = [
  "setup",
  "learn",
  "review",
  "vocab",
  "writing",
  "speaking",
  "reading",
  "progress",
];
