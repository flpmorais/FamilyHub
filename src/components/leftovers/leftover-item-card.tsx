import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Icon } from "react-native-paper";
import type { Leftover, LeftoverType } from "../../types/leftover.types";
import { daysUntilExpiry } from "../../utils/date.utils";

function shortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

const TYPE_LABEL: Record<LeftoverType, string> = {
  meal: "Refeição",
  main: "Principal",
  soup: "Sopa",
  side: "Acompanhamento",
  dessert: "Sobremesa",
  other: "Outro",
};

interface LeftoverItemCardProps {
  item: Leftover;
  onEaten: (id: string) => void;
  onThrowOut: (id: string) => void;
  onPress: (item: Leftover) => void;
}

export function LeftoverItemCard({
  item,
  onEaten,
  onThrowOut,
  onPress,
}: LeftoverItemCardProps) {
  const remaining = item.totalDoses - item.dosesEaten - item.dosesThrownOut;
  const isActive = item.status === "active";
  const days = daysUntilExpiry(item.expiryDate);
  const isExpiresToday = isActive && days === 0;
  const isExpired = isActive && days < 0;

  function handleThrowOut() {
    Alert.alert("Deitar fora", "Descartar todas as doses restantes?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deitar fora",
        style: "destructive",
        onPress: () => onThrowOut(item.id),
      },
    ]);
  }

  return (
    <TouchableOpacity
      style={[s.card, !isActive && s.cardClosed, isExpiresToday && s.cardExpiresToday, isExpired && s.cardExpired]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={s.header}>
        <Text style={[s.name, !isActive && s.nameClosed]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={s.headerRight}>
          {isActive ? (
            isExpired ? (
              <View style={s.badgeRow}>
                <Icon source="alert-circle" size={14} color="#D32F2F" />
                <Text style={[s.expiryBadge, s.expiryExpired]}>Expirado</Text>
              </View>
            ) : isExpiresToday ? (
              <View style={s.badgeRow}>
                <Icon source="alert-circle" size={14} color="#F59300" />
                <Text style={[s.expiryBadge, s.expiryWarning]}>Expira hoje</Text>
              </View>
            ) : (
              <Text style={s.expiryBadge}>{days}d</Text>
            )
          ) : (
            <Text style={s.closedBadge}>Fechado</Text>
          )}
        </View>
      </View>

      {isActive ? (
        <>
          <View style={s.infoRow}>
            <Text style={s.typeText}>{TYPE_LABEL[item.type ?? "meal"]}</Text>
            <Text style={s.dateLabel}>add: {shortDate(item.dateAdded)}</Text>
          </View>
          <View style={[s.infoRow, { marginBottom: 12 }]}>
            <Text style={s.dosesText}>
              {remaining} {remaining === 1 ? "dose restante" : "doses restantes"}
            </Text>
            <Text style={s.dateLabel}>exp: {shortDate(item.expiryDate)}</Text>
          </View>
          <View style={s.actions}>
            <TouchableOpacity
              style={s.eatenBtn}
              onPress={() => onEaten(item.id)}
            >
              <Text style={s.eatenBtnText}>Comi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.throwOutBtn} onPress={handleThrowOut}>
              <Text style={s.throwOutBtnText}>Deitar fora</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={s.infoRow}>
            <Text style={s.closedInfo}>
              {item.dosesEaten} {item.dosesEaten === 1 ? "comida" : "comidas"} ·{" "}
              {item.dosesThrownOut}{" "}
              {item.dosesThrownOut === 1 ? "deitada fora" : "deitadas fora"}
            </Text>
            <Text style={s.dateLabel}>add: {shortDate(item.dateAdded)}</Text>
          </View>
          <View style={s.infoRow}>
            <View />
            <Text style={s.dateLabel}>exp: {shortDate(item.expiryDate)}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 1,
  },
  cardClosed: {
    opacity: 0.6,
    backgroundColor: "#FAFAFA",
  },
  cardExpiresToday: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59300",
    borderColor: "#FFE0B2",
  },
  cardExpired: {
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
    borderColor: "#FFCDD2",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  nameClosed: {
    color: "#888888",
  },
  expiryBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1976D2",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryWarning: {
    color: "#F59300",
    backgroundColor: "#FFF3E0",
  },
  expiryExpired: {
    color: "#D32F2F",
    backgroundColor: "#FFEBEE",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  closedBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  typeText: {
    fontSize: 12,
    color: "#888888",
  },
  dosesText: {
    fontSize: 14,
    color: "#555555",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  eatenBtn: {
    flex: 1,
    backgroundColor: "#388E3C",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  eatenBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  throwOutBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D32F2F",
    alignItems: "center",
  },
  throwOutBtnText: {
    color: "#D32F2F",
    fontSize: 14,
    fontWeight: "600",
  },
  closedInfo: {
    fontSize: 13,
    color: "#888888",
  },
  dateLabel: {
    fontSize: 11,
    color: "#888888",
    textAlign: "right",
  },
});
