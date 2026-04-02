import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import type { ShoppingItem } from "../../types/shopping.types";

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onPress: (item: ShoppingItem) => void;
  onLongPress: (item: ShoppingItem) => void;
  onToggleUrgent: (item: ShoppingItem) => void;
}

export function ShoppingItemCard({
  item,
  onPress,
  onLongPress,
  onToggleUrgent,
}: ShoppingItemCardProps) {
  return (
    <View style={[s.card, item.isTicked && s.cardTicked]}>
      <TouchableOpacity
        style={s.leftZone}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={s.checkbox}>
          {item.isTicked && <View style={s.checkboxFilled} />}
        </View>
        <View style={s.content}>
          <Text
            style={[s.name, item.isTicked && s.nameTicked]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.quantityNote ? (
            <Text
              style={[s.quantity, item.isTicked && s.quantityTicked]}
              numberOfLines={1}
            >
              {item.quantityNote}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.rightZone}
        onPress={() => onToggleUrgent(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.tag,
            item.isTicked
              ? s.tagTicked
              : item.isUrgent
                ? s.tagUrgente
                : s.tagComprar,
          ]}
        >
          <Text style={s.tagText}>
            {item.isUrgent ? "urgente" : "comprar"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
  },
  cardTicked: {
    backgroundColor: "#FAFAFA",
  },
  leftZone: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
  },
  rightZone: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxFilled: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#B5451B",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  nameTicked: {
    color: "#AAAAAA",
    textDecorationLine: "line-through",
  },
  quantity: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  quantityTicked: {
    color: "#CCCCCC",
    textDecorationLine: "line-through",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tagComprar: {
    backgroundColor: "#388E3C",
  },
  tagUrgente: {
    backgroundColor: "#D32F2F",
  },
  tagTicked: {
    backgroundColor: "#CCCCCC",
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
