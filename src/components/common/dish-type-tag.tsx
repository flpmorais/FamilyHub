import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import { useDishTypes } from "../../hooks/use-dish-types";
import type { DishTypeKey } from "../../types/dish-type.types";

export type DishTypeTagVariant = "filled" | "outlined";
export type DishTypeTagSize = "sm" | "md";

interface DishTypeTagProps {
  typeKey: DishTypeKey;
  variant?: DishTypeTagVariant;
  size?: DishTypeTagSize;
  /** Override the type's display label (defaults to the dish type name). */
  label?: string;
  /** Optional count badge appended after the label, e.g. for filter pills. */
  count?: number;
  onPress?: () => void;
}

export function DishTypeTag({
  typeKey,
  variant = "filled",
  size = "sm",
  label,
  count,
  onPress,
}: DishTypeTagProps) {
  const { resolve } = useDishTypes();
  const { name, color, icon } = resolve(typeKey);

  const isFilled = variant === "filled";
  const isMd = size === "md";

  const containerStyle = [
    styles.base,
    isMd ? styles.mdPad : styles.smPad,
    isFilled
      ? { backgroundColor: color, borderColor: color }
      : { backgroundColor: "#FFFFFF", borderColor: color },
  ];
  const textColor = isFilled ? "#FFFFFF" : color;
  const iconSize = isMd ? 14 : 12;
  const textSize = isMd ? 13 : 11;
  const displayLabel = label ?? name;
  const labelText =
    count !== undefined ? `${displayLabel} (${count})` : displayLabel;

  const content = (
    <View style={containerStyle}>
      <Icon source={icon} size={iconSize} color={textColor} />
      <Text style={[styles.label, { color: textColor, fontSize: textSize }]}>
        {labelText}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  smPad: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mdPad: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontWeight: "600",
  },
});
