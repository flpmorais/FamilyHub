import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface PackingCompletionStateProps {
  vacationTitle: string;
  totalItems: number;
  onShowAll: () => void;
}

export function PackingCompletionState({
  vacationTitle,
  totalItems,
  onShowAll,
}: PackingCompletionStateProps) {
  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.emoji}>🧳</Text>
        <Text style={s.heading}>Pronto para partir</Text>
        <Text style={s.vacationName}>{vacationTitle}</Text>
        <Text style={s.stats}>
          {totalItems} {totalItems === 1 ? "item embalado" : "itens embalados"}
        </Text>
        <TouchableOpacity style={s.button} onPress={onShowAll}>
          <Text style={s.buttonText}>Ver lista completa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFDBCF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7A2800",
    marginBottom: 8,
  },
  vacationName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9D3510",
    marginBottom: 16,
    textAlign: "center",
  },
  stats: {
    fontSize: 14,
    color: "#77574C",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#B5451B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
