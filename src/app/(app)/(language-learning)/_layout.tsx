import { View } from "react-native";
import { Stack } from "expo-router";
import { ConnectionStatusBar } from "../../../components/language-learning";
import { useLearningConnection } from "../../../hooks/use-learning-connection";

export default function LanguageLearningLayout() {
  useLearningConnection();

  return (
    <View style={{ flex: 1 }}>
      <ConnectionStatusBar />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
