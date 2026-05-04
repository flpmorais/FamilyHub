import { View, Text, StyleSheet } from "react-native";
import type { ChatMessage } from "../../types/language-learning.types";

interface TextSegment {
  text: string;
  isGreek: boolean;
}

function isGreekChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (!code) return false;
  return (
    (code >= 0x0370 && code <= 0x03ff) || (code >= 0x1f00 && code <= 0x1fff)
  );
}

function segmentText(content: string): TextSegment[] {
  if (!content) return [];
  const segments: TextSegment[] = [];
  let current = "";
  let currentIsGreek = false;

  for (const char of content) {
    const greek = isGreekChar(char);
    if (greek !== currentIsGreek && current.length > 0) {
      segments.push({ text: current, isGreek: currentIsGreek });
      current = "";
    }
    currentIsGreek = greek;
    current += char;
  }

  if (current.length > 0) {
    segments.push({ text: current, isGreek: currentIsGreek });
  }

  return segments;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  currentTtsPhrase?: string | null;
}

export function ChatBubble({
  message,
  isStreaming,
  currentTtsPhrase,
}: ChatBubbleProps) {
  const isAgent = message.role === "agent";
  const ttsActive =
    !!currentTtsPhrase && message.content.includes(currentTtsPhrase);

  function renderAgentContent() {
    const segments = segmentText(message.content);
    return (
      <Text style={[s.text, s.agentText]}>
        {segments.map((seg, i) => {
          const isTtsHighlighted =
            ttsActive &&
            !!currentTtsPhrase &&
            seg.text.includes(currentTtsPhrase);

          if (seg.isGreek) {
            return (
              <Text
                key={i}
                style={[s.greekText, isTtsHighlighted && s.ttsHighlight]}
              >
                {seg.text}
              </Text>
            );
          }
          return (
            <Text key={i} style={isTtsHighlighted && s.ttsHighlight}>
              {seg.text}
            </Text>
          );
        })}
        {isStreaming && <Text style={s.cursor}>▊</Text>}
      </Text>
    );
  }

  return (
    <View style={[s.bubble, isAgent ? s.agentBubble : s.userBubble]}>
      {isAgent ? (
        renderAgentContent()
      ) : (
        <Text style={[s.text, s.userText]}>
          {message.content}
          {isStreaming && <Text style={s.cursor}>▊</Text>}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  agentBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#B5451B",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  agentText: {
    color: "#1A1A1A",
  },
  userText: {
    color: "#FFFFFF",
  },
  greekText: {
    fontSize: 18,
    color: "#B5451B",
    fontWeight: "600",
    lineHeight: 25,
  },
  ttsHighlight: {
    backgroundColor: "rgba(181, 69, 27, 0.12)",
    borderRadius: 3,
  },
  cursor: {
    color: "#888888",
    fontWeight: "400",
  },
});
