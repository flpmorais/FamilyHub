import { View, Text, StyleSheet } from "react-native";
import { useStatusColours } from "../../constants/status-colours";
import type { PackingStatus } from "../../types/packing.types";

const STATUS_LABELS: Record<PackingStatus, string> = {
  new: "Novo",
  buy: "Comprar",
  ready: "Pronto",
  issue: "Problema",
  last_minute: "Últ. hora",
  packed: "Embalado",
};

interface StatusBadgeProps {
  status: PackingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colours = useStatusColours();
  const tokens = colours[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: tokens.bg }]}
      accessible={false}
      importantForAccessibility="no"
    >
      <Text style={[styles.label, { color: tokens.text }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
