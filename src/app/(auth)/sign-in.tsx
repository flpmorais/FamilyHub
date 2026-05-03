import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRepository } from "../../hooks/use-repository";
import { useAuthStore } from "../../stores/auth.store";
import { logger } from "../../utils/logger";

export default function SignInScreen() {
  const authRepository = useRepository("auth");
  const { setUserAccount, setLoading, setError, isLoading, error } =
    useAuthStore();

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const userAccount = await authRepository.signInWithGoogle();
      setUserAccount(userAccount);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao iniciar sessão.";
      logger.error("SignIn", "handleSignIn failed", err);
      setError(message);
    } finally {
      setLoading(false);
    }
    // Navigation to (app) is driven by (auth)/_layout.tsx reacting to session state change
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FamilyHub</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
        accessibilityLabel="Entrar com Google"
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Entrar com Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 48,
    color: "#B5451B",
  },
  error: {
    color: "#D32F2F",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#B5451B",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
