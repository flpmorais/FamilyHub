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
import { useTtsQueue } from "../../../hooks/use-tts-queue";
import { SKILL_LABELS } from "../../../constants/language-learning-defaults";
import { ChatBubble } from "../../../components/language-learning/chat-bubble";
import { ChatInput } from "../../../components/language-learning/chat-input";
import type { LearningSkill } from "../../../types/language-learning.types";

export default function SessionScreen() {
  const activeSession = useLanguageLearningStore((s) => s.activeSession);
  const messages = useLanguageLearningStore((s) => s.messages);
  const isStreaming = useLanguageLearningStore((s) => s.isStreaming);
  const authError = useLanguageLearningStore((s) => s.authError);
  const { sendMessage } = useSession();
  useTtsQueue();
  const currentTtsPhrase = useLanguageLearningStore((s) => s.currentTtsPhrase);
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

      {authError ? (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>{authError}</Text>
        </View>
      ) : null}

      {messages.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Inicie a conversa...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          extraData={isStreaming}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isLastAgent =
              item.role === "agent" &&
              isStreaming &&
              messages[messages.length - 1]?.id === item.id;
            return (
              <ChatBubble
                message={item}
                isStreaming={isLastAgent}
                currentTtsPhrase={currentTtsPhrase}
              />
            );
          }}
          contentContainerStyle={s.messageList}
          onContentSizeChange={scrollToEnd}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {currentTtsPhrase ? (
        <View style={s.ttsIndicator}>
          <Text style={s.ttsText}>🔊 {currentTtsPhrase}</Text>
        </View>
      ) : null}

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
  errorBanner: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 14,
    color: "#D32F2F",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ttsIndicator: {
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  ttsText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
});
