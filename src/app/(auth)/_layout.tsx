import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAuthStore } from "../../stores/auth.store";

export default function AuthLayout() {
  const { userAccount } = useAuthStore();

  useEffect(() => {
    if (userAccount !== null) {
      router.replace("/(app)");
    }
  }, [userAccount]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
