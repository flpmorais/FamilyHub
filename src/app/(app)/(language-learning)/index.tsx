import { useCallback, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { router, useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useLanguageLearningStore } from "../../../stores/language-learning.store";

export default function LanguageLearningScreen() {
  const sessionRepo = useRepository("session");
  const setAuthStatus = useLanguageLearningStore((s) => s.setAuthStatus);
  const setAuthError = useLanguageLearningStore((s) => s.setAuthError);
  const authStatus = useLanguageLearningStore((s) => s.authStatus);
  const authError = useLanguageLearningStore((s) => s.authError);
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);

  useFocusEffect(
    useCallback(() => {
      if (connectionStatus !== "connected") return;
      let cancelled = false;
      (async () => {
        try {
          const status = await sessionRepo.getAuthStatus();
          if (!cancelled) {
            setAuthStatus(status);
            setAuthError(null);
          }
        } catch (e: any) {
          if (!cancelled) {
            setAuthError(e.message ?? "Erro ao verificar estado");
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [connectionStatus, sessionRepo, setAuthStatus, setAuthError]),
  );

  useEffect(() => {
    if (!authStatus) return;
    if (!authStatus.configured) {
      router.replace("api-key-setup");
    }
  }, [authStatus]);

  function handleRetry() {
    setAuthError(null);
    setAuthStatus(null);
  }

  if (connectionStatus !== "connected") {
    return (
      <View style={s.container}>
        <Text style={s.waiting}>A aguardar ligação...</Text>
      </View>
    );
  }

  if (authError) {
    return (
      <View style={s.container}>
        <Text style={s.error}>{authError}</Text>
        <Button mode="contained" onPress={handleRetry} style={s.retryButton}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  if (authStatus?.configured) {
    return (
      <View style={s.container}>
        <Text style={s.configured}>Configuração concluída!</Text>
        <Text style={s.configuredSub}>
          A preparar experiência de aprendizagem...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" />
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
  waiting: {
    fontSize: 16,
    color: "#888888",
  },
  error: {
    fontSize: 16,
    color: "#F44336",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  configured: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  configuredSub: {
    fontSize: 14,
    color: "#888888",
  },
});
