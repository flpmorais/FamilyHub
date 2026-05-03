export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
};

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "speak"; phrases: string[] }
  | { type: "skill-complete"; skill: string }
  | { type: "error"; message: string }
  | { type: "done" };

export type LearningSkill =
  | "setup"
  | "learn"
  | "review"
  | "vocab"
  | "writing"
  | "speaking"
  | "reading"
  | "progress";

export type SessionInfo = {
  id: string;
  skill: string;
} | null;
