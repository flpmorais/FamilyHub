import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, TextInput, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useLanguageLearningStore } from "../../../stores/language-learning.store";

export default function ApiKeySetupScreen() {
  const [key, setKey] = useState("");
  const sessionRepo = useRepository("session");
  const isConfiguring = useLanguageLearningStore((s) => s.isConfiguring);
  const authError = useLanguageLearningStore((s) => s.authError);
  const setConfiguring = useLanguageLearningStore((s) => s.setConfiguring);
  const setAuthError = useLanguageLearningStore((s) => s.setAuthError);
  const setAuthStatus = useLanguageLearningStore((s) => s.setAuthStatus);

  async function handleSubmit() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setConfiguring(true);
    setAuthError(null);
    try {
      await sessionRepo.configureApiKey(trimmed);
      setAuthStatus({ configured: true, setupComplete: false });
      router.replace("../");
    } catch (e: any) {
      setAuthError(e.message ?? "Erro ao configurar a chave API");
    } finally {
      setConfiguring(false);
    }
  }

  return (
    <View style={s.container}>
      <TextInput
        label="Chave API"
        value={key}
        onChangeText={setKey}
        secureTextEntry
        placeholder="sk-..."
        mode="outlined"
        style={s.input}
        disabled={isConfiguring}
        error={!!authError}
      />
      <HelperText type="error" visible={!!authError}>
        {authError}
      </HelperText>
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isConfiguring}
        disabled={!key.trim() || isConfiguring}
        style={s.button}
      >
        Configurar
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  input: {
    backgroundColor: "#FFFFFF",
  },
  button: {
    marginTop: 16,
  },
});
