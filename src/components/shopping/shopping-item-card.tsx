import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import type { ShoppingItem } from "../../types/shopping.types";

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onPress: (item: ShoppingItem) => void;
  onLongPress: (item: ShoppingItem) => void;
}

export function ShoppingItemCard({
  item,
  onPress,
  onLongPress,
}: ShoppingItemCardProps) {
  return (
    <TouchableOpacity
      style={[s.card, item.isTicked && s.cardTicked]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={s.row}>
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
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cardTicked: {
    backgroundColor: "#FAFAFA",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
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
});
