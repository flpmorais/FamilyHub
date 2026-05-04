import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { router } from "expo-router";
import { useLanguageLearningStore } from "../../../stores/language-learning.store";
import { SKILL_LABELS } from "../../../constants/language-learning-defaults";
import type { LearningSkill } from "../../../types/language-learning.types";

export default function SessionScreen() {
  const activeSession = useLanguageLearningStore((s) => s.activeSession);

  return (
    <View style={s.container}>
      <Text style={s.title}>
        {activeSession
          ? (SKILL_LABELS[activeSession.skill as LearningSkill] ?? "Sessão")
          : "Sessão"}
      </Text>
      <Text style={s.placeholder}>Ecrã de sessão (placeholder)</Text>
      <Button mode="outlined" onPress={() => router.back()}>
        Voltar
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 24,
  },
});
