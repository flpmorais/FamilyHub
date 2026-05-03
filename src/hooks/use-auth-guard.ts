import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../stores/auth.store";

// Redirects to sign-in if no session. No-op while loading (prevents flash redirect on cold launch).
export function useAuthGuard(): void {
  const { userAccount, isLoading } = useAuthStore();
  useEffect(() => {
    if (!isLoading && (userAccount === null || !userAccount.profileId)) {
      router.replace("/(auth)/sign-in");
    }
  }, [userAccount, isLoading]);
}
