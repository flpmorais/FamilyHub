import { View, Text, StyleSheet } from "react-native";
import type { ChatMessage } from "../../types/language-learning.types";

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isAgent = message.role === "agent";

  return (
    <View style={[s.bubble, isAgent ? s.agentBubble : s.userBubble]}>
      <Text style={[s.text, isAgent ? s.agentText : s.userText]}>
        {message.content}
        {isStreaming && <Text style={s.cursor}>▊</Text>}
      </Text>
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
  cursor: {
    color: "#888888",
    fontWeight: "400",
  },
});
