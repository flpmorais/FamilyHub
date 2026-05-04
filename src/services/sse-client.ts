import type { SSEEvent } from "../types/language-learning.types";

export async function* consumeSSE(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const event = parseSSEChunk(part);
        if (event) yield event;
      }
    }

    if (buffer.trim()) {
      const event = parseSSEChunk(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEChunk(chunk: string): SSEEvent | null {
  let eventType = "";
  let data = "";

  for (const line of chunk.split("\n")) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      data += (data ? "\n" : "") + line.slice(6);
    }
  }

  if (!eventType) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = data ? JSON.parse(data) : {};
  } catch {
    return {
      type: "error",
      message: "Erro ao processar resposta do servidor",
    };
  }

  switch (eventType) {
    case "token":
      return { type: "token", content: (parsed.content as string) ?? "" };
    case "speak":
      return { type: "speak", phrases: (parsed.phrases as string[]) ?? [] };
    case "skill-complete":
      return { type: "skill-complete", skill: (parsed.skill as string) ?? "" };
    case "error":
      return {
        type: "error",
        message: (parsed.message as string) ?? "Erro desconhecido",
      };
    case "done":
      return { type: "done" };
    default:
      return null;
  }
}
