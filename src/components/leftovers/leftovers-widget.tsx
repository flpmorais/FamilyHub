import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import type { Leftover } from "../../types/leftover.types";
import { daysUntilExpiry } from "../../utils/date.utils";

interface LeftoversWidgetProps {
  items: Leftover[];
  onPress: () => void;
}

export function LeftoversWidget({ items, onPress }: LeftoversWidgetProps) {
  const expired = items.filter((l) => daysUntilExpiry(l.expiryDate) < 0);
  const expiresToday = items.filter((l) => daysUntilExpiry(l.expiryDate) === 0);
  const expiresTomorrow = items.filter(
    (l) => daysUntilExpiry(l.expiryDate) === 1,
  );

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.titleRow}>
        <Icon source="fridge-outline" size={18} color="#B5451B" />
        <Text style={s.title}>Restos</Text>
      </View>
      {items.length === 0 ? (
        <View style={s.statusRow}>
          <Icon source="check-circle" size={14} color="#388E3C" />
          <Text style={s.emptyText}>Sem restos</Text>
        </View>
      ) : (
        <>
          <View style={s.contentRow}>
            <Text style={s.itemList} numberOfLines={2}>
              {items.map((l) => l.name).join(", ")}
            </Text>
            <Text style={s.arrow}>→</Text>
          </View>
          {expired.map((l) => (
            <View key={`exp-${l.id}`} style={s.statusRow}>
              <Icon source="alert-circle" size={14} color="#D32F2F" />
              <Text style={s.alertExpired}>{l.name} expirou</Text>
            </View>
          ))}
          {expiresToday.map((l) => (
            <View key={`today-${l.id}`} style={s.statusRow}>
              <Icon source="alert-circle" size={14} color="#F59300" />
              <Text style={s.alertWarning}>{l.name} expira hoje</Text>
            </View>
          ))}
          {expiresTomorrow.map((l) => (
            <View key={`tmrw-${l.id}`} style={s.statusRow}>
              <Icon source="alert-circle" size={14} color="#F59300" />
              <Text style={s.alertWarning}>{l.name} expira amanhã</Text>
            </View>
          ))}
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B5451B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#388E3C",
    fontWeight: "600",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemList: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: "#B5451B",
    marginLeft: 8,
  },
  alertExpired: {
    fontSize: 13,
    color: "#D32F2F",
    fontWeight: "600",
  },
  alertWarning: {
    fontSize: 13,
    color: "#F59300",
    fontWeight: "600",
  },
});
