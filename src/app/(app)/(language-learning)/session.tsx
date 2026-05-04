import { useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useLanguageLearningStore } from "../../../stores/language-learning.store";
import { useSession } from "../../../hooks/use-session";
import { SKILL_LABELS } from "../../../constants/language-learning-defaults";
import { ChatBubble } from "../../../components/language-learning/chat-bubble";
import { ChatInput } from "../../../components/language-learning/chat-input";
import type { LearningSkill } from "../../../types/language-learning.types";

export default function SessionScreen() {
  const activeSession = useLanguageLearningStore((s) => s.activeSession);
  const messages = useLanguageLearningStore((s) => s.messages);
  const isStreaming = useLanguageLearningStore((s) => s.isStreaming);
  const { sendMessage } = useSession();
  const flatListRef = useRef<FlatList>(null);

  const skillLabel = activeSession
    ? (SKILL_LABELS[activeSession.skill as LearningSkill] ?? "Sessão")
    : "Sessão";

  function handleSend(content: string) {
    sendMessage(content);
  }

  function scrollToEnd() {
    flatListRef.current?.scrollToEnd({ animated: true });
  }

  if (!activeSession) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backBtn}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sessão</Text>
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>Nenhuma sessão activa.</Text>
        </View>
      </View>
    );
  }

  if (isStreaming && messages.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backBtn}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{skillLabel}</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#B5451B" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{skillLabel}</Text>
      </View>

      {messages.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Inicie a conversa...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isLastAgent =
              item.role === "agent" &&
              isStreaming &&
              messages[messages.length - 1]?.id === item.id;
            return <ChatBubble message={item} isStreaming={isLastAgent} />;
          }}
          contentContainerStyle={s.messageList}
          onContentSizeChange={scrollToEnd}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  backBtn: {
    fontSize: 16,
    color: "#B5451B",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888888",
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
