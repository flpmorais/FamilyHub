import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Leftover } from "../../types/leftover.types";
import { daysUntilExpiry } from "../../utils/date.utils";

interface LeftoversWidgetProps {
  items: Leftover[];
  onPress: () => void;
}

function formatExpiryRelative(days: number): string {
  if (days < 0) return "expirou";
  if (days === 0) return "expira hoje";
  if (days === 1) return "expira amanhã";
  return `expira em ${days} dias`;
}

export function LeftoversWidget({ items, onPress }: LeftoversWidgetProps) {
  const activeMeals = items.length;
  const totalActiveDoses = items.reduce(
    (sum, l) => sum + (l.totalDoses - l.dosesEaten - l.dosesThrownOut),
    0,
  );
  const nearest = items.length > 0 ? items[0] : null;
  const nearestDays = nearest ? daysUntilExpiry(nearest.expiryDate) : 0;
  const isUrgent = nearest !== null && nearestDays <= 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.title}>Restos</Text>
      {activeMeals === 0 ? (
        <Text style={s.emptyText}>Frigorífico vazio</Text>
      ) : (
        <>
          <Text style={s.summary}>
            {activeMeals} {activeMeals === 1 ? "refeição" : "refeições"} ·{" "}
            {totalActiveDoses} {totalActiveDoses === 1 ? "dose" : "doses"}
          </Text>
          {nearest && (
            <View style={s.expiryRow}>
              <Text
                style={[s.expiryText, isUrgent && s.expiryExpired]}
                numberOfLines={1}
              >
                {isUrgent ? "⚠️ " : ""}
                {nearest.name} {formatExpiryRelative(nearestDays)}
              </Text>
              <Text style={s.arrow}>→</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFF8F5",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0E0D8",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B5451B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: "#888888",
  },
  summary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  expiryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiryText: {
    fontSize: 13,
    color: "#555555",
    flex: 1,
  },
  expiryExpired: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  arrow: {
    fontSize: 16,
    color: "#B5451B",
    marginLeft: 8,
  },
});
