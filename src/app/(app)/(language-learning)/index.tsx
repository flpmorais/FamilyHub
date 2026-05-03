import { View, Text, StyleSheet } from "react-native";

export default function LanguageLearningScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Idiomas</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
