import { memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useReorderableDrag, useIsActive } from "react-native-reorderable-list";

interface IngredientRowCellProps {
  index: number;
  name: string;
  quantity: string;
  showRemove: boolean;
  onChangeName: (index: number, value: string) => void;
  onChangeQuantity: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

export const IngredientRowCell = memo(function IngredientRowCell({
  index,
  name,
  quantity,
  showRemove,
  onChangeName,
  onChangeQuantity,
  onRemove,
}: IngredientRowCellProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View style={[s.row, isActive && s.rowActive]}>
      <TouchableOpacity onLongPress={drag} style={s.dragHandle}>
        <Text style={s.dragHandleText}>{"\u2261"}</Text>
      </TouchableOpacity>
      <View style={s.inputs}>
        <TextInput
          style={[s.input, s.ingredientName]}
          value={name}
          onChangeText={(v) => onChangeName(index, v)}
          placeholder="Ingrediente"
          placeholderTextColor="#CCCCCC"
        />
        <TextInput
          style={[s.input, s.ingredientQty]}
          value={quantity}
          onChangeText={(v) => onChangeQuantity(index, v)}
          placeholder="Qtd"
          placeholderTextColor="#CCCCCC"
        />
      </View>
      {showRemove && (
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Text style={s.removeBtn}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

interface StepRowCellProps {
  index: number;
  text: string;
  showRemove: boolean;
  onChangeText: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

export const StepRowCell = memo(function StepRowCell({
  index,
  text,
  showRemove,
  onChangeText,
  onRemove,
}: StepRowCellProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View style={[s.row, isActive && s.rowActive]}>
      <TouchableOpacity onLongPress={drag} style={s.dragHandle}>
        <Text style={s.dragHandleText}>{"\u2261"}</Text>
      </TouchableOpacity>
      <View style={s.stepNumberContainer}>
        <Text style={s.stepNumber}>{index + 1}.</Text>
      </View>
      <TextInput
        style={[s.input, s.stepInput]}
        value={text}
        onChangeText={(v) => onChangeText(index, v)}
        placeholder={`Passo ${index + 1}`}
        placeholderTextColor="#CCCCCC"
        multiline
      />
      {showRemove && (
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Text style={s.removeBtn}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
    backgroundColor: "#FFFFFF",
  },
  rowActive: {
    backgroundColor: "#FFF5F0",
    borderRadius: 8,
    elevation: 4,
  },
  inputs: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dragHandleText: {
    fontSize: 20,
    color: "#AAAAAA",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A1A1A",
  },
  ingredientName: {
    flex: 2,
  },
  ingredientQty: {
    flex: 1,
  },
  stepNumberContainer: {
    width: 24,
    alignItems: "center",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888",
  },
  stepInput: {
    flex: 1,
  },
  removeBtn: {
    fontSize: 16,
    color: "#D32F2F",
    paddingHorizontal: 4,
  },
});
