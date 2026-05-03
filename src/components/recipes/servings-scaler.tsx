import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface ServingsScalerProps {
  originalServings: number;
  targetServings: number;
  onChangeServings: (servings: number) => void;
}

export function ServingsScaler({
  originalServings,
  targetServings,
  onChangeServings,
}: ServingsScalerProps) {
  const isScaled = targetServings !== originalServings;

  return (
    <View style={s.container}>
      <Text style={s.label}>Porções</Text>
      <View style={s.controls}>
        <TouchableOpacity
          style={s.btn}
          onPress={() => onChangeServings(Math.max(1, targetServings - 1))}
        >
          <Text style={s.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.value}>{targetServings}</Text>
        <TouchableOpacity
          style={s.btn}
          onPress={() => onChangeServings(targetServings + 1)}
        >
          <Text style={s.btnText}>+</Text>
        </TouchableOpacity>
      </View>
      {isScaled && <Text style={s.note}>de {originalServings} porções</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    color: "#888888",
    textTransform: "uppercase",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: -1,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    minWidth: 24,
    textAlign: "center",
  },
  note: {
    fontSize: 10,
    color: "#B5451B",
    marginTop: 2,
  },
});
