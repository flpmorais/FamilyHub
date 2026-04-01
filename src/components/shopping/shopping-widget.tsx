import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";

interface ShoppingWidgetProps {
  itemCount: number;
  onPress: () => void;
}

export function ShoppingWidget({ itemCount, onPress }: ShoppingWidgetProps) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.titleRow}>
        <Icon source="cart" size={18} color="#B5451B" />
        <Text style={s.title}>Compras</Text>
      </View>
      {itemCount === 0 ? (
        <Text style={s.emptyText}>Lista vazia</Text>
      ) : (
        <View style={s.contentRow}>
          <Text style={s.count}>
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </Text>
          <Text style={s.arrow}>→</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0DDD5",
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
  emptyText: {
    fontSize: 14,
    color: "#888888",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  arrow: {
    fontSize: 16,
    color: "#B5451B",
    marginLeft: 8,
  },
});
