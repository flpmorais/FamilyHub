import { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import { Button } from "react-native-paper";
import { router, useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useLanguageLearningStore } from "../../../stores/language-learning.store";
import { SkillCard } from "../../../components/language-learning/skill-card";
import { SKILLS } from "../../../constants/language-learning-defaults";
import type { LearningSkill } from "../../../types/language-learning.types";

export default function LanguageLearningScreen() {
  const sessionRepo = useRepository("session");
  const setAuthStatus = useLanguageLearningStore((s) => s.setAuthStatus);
  const setAuthError = useLanguageLearningStore((s) => s.setAuthError);
  const authStatus = useLanguageLearningStore((s) => s.authStatus);
  const authError = useLanguageLearningStore((s) => s.authError);
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);
  const setActiveSession = useLanguageLearningStore((s) => s.setActiveSession);
  const addMessages = useLanguageLearningStore((s) => s.addMessages);
  const activeSession = useLanguageLearningStore((s) => s.activeSession);
  const activeSkill = useLanguageLearningStore((s) => s.activeSkill);
  const loadingSkill = useLanguageLearningStore((s) => s.loadingSkill);
  const skillError = useLanguageLearningStore((s) => s.skillError);
  const setActiveSkill = useLanguageLearningStore((s) => s.setActiveSkill);
  const setLoadingSkill = useLanguageLearningStore((s) => s.setLoadingSkill);
  const setSkillError = useLanguageLearningStore((s) => s.setSkillError);

  const mounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      if (connectionStatus !== "connected") return;
      let cancelled = false;
      (async () => {
        try {
          const status = await sessionRepo.getAuthStatus();
          if (!cancelled) {
            setAuthStatus(status);
            setAuthError(null);
          }
        } catch (err: any) {
          if (!cancelled) {
            setAuthError(err.message ?? "Erro ao verificar estado");
          }
        }
      })();
      return () => {
        cancelled = true;
        mounted.current = false;
      };
    }, [connectionStatus, sessionRepo, setAuthStatus, setAuthError]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!authStatus?.configured || !authStatus.setupComplete) return;
      let cancelled = false;
      (async () => {
        try {
          const sessionStatus = await sessionRepo.getSessionStatus();
          if (!cancelled && mounted.current) {
            setActiveSkill(sessionStatus.active ? sessionStatus.skill : null);
          }
        } catch {
          if (!cancelled && mounted.current) {
            setActiveSkill(null);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [authStatus, sessionRepo, setActiveSkill]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!authStatus?.configured) return;
      if (authStatus.setupComplete) return;
      let cancelled = false;
      (async () => {
        setLoadingSkill("setup");
        try {
          const result = await sessionRepo.startSession("setup");
          if (!cancelled && mounted.current) {
            setActiveSession({ id: result.sessionId, skill: result.skill });
            router.replace("session");
          }
        } catch {
          if (!cancelled && mounted.current) {
            setAuthError(
              "Não foi possível iniciar a configuração. Tente novamente.",
            );
          }
        } finally {
          if (!cancelled && mounted.current) {
            setLoadingSkill(null);
          }
        }
      })();
      return () => {
        cancelled = true;
        setLoadingSkill(null);
      };
    }, [
      authStatus,
      sessionRepo,
      setActiveSession,
      setAuthError,
      setLoadingSkill,
    ]),
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

  async function handleSkillPress(skill: LearningSkill) {
    if (loadingSkill !== null) return;
    setLoadingSkill(skill);
    setSkillError(null);
    try {
      if (activeSkill === skill) {
        const messages = await sessionRepo.resumeSession();
        if (!mounted.current) return;
        addMessages(messages);
        router.push("session");
      } else {
        const result = await sessionRepo.startSession(skill);
        if (!mounted.current) return;
        setActiveSession({ id: result.sessionId, skill: result.skill });
        setActiveSkill(skill);
        router.push("session");
      }
    } catch {
      setSkillError("Erro de ligação. Verifique a sua conexão.");
    } finally {
      setLoadingSkill(null);
    }
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

  if (!authStatus?.configured) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authStatus.setupComplete) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" />
        <Text style={s.loadingText}>A iniciar configuração...</Text>
      </View>
    );
  }

  return (
    <View style={s.gridContainer}>
      {skillError ? <Text style={s.skillError}>{skillError}</Text> : null}
      <FlatList
        data={SKILLS}
        keyExtractor={(item) => item}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        renderItem={({ item: skill }) => (
          <View style={s.cell}>
            <SkillCard
              skill={skill}
              isActive={activeSession?.skill === skill}
              hasResume={activeSkill === skill}
              disabled={loadingSkill !== null && loadingSkill !== skill}
              loading={loadingSkill === skill}
              onPress={() => handleSkillPress(skill)}
            />
          </View>
        )}
      />
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
  loadingText: {
    fontSize: 14,
    color: "#888888",
    marginTop: 12,
  },
  gridContainer: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  skillError: {
    fontSize: 14,
    color: "#F44336",
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
  },
  row: {
    gap: 12,
  },
  cell: {
    flex: 1,
  },
});
