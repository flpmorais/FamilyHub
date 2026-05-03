import { View, Text, StyleSheet } from "react-native";
import { useLanguageLearningStore } from "../../stores/language-learning.store";
import type { ConnectionStatus } from "../../types/language-learning.types";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; backgroundColor: string }
> = {
  connected: { label: "Conectado", backgroundColor: "#4CAF50" },
  disconnected: { label: "Desconectado", backgroundColor: "#F44336" },
  reconnecting: { label: "A ligar...", backgroundColor: "#FF9800" },
};

export function ConnectionStatusBar() {
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <View style={[s.bar, { backgroundColor: config.backgroundColor }]}>
      <Text style={s.text}>{config.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
