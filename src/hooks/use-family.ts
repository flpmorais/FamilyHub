import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabaseClient } from "../repositories/supabase/supabase.client";
import { useAuthStore } from "../stores/auth.store";
import type { Family } from "../types/profile.types";

export function useFamily(): Family | null {
  const { userAccount } = useAuthStore();
  const [family, setFamily] = useState<Family | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userAccount?.familyId) return;
      (async () => {
        try {
          const { data } = await supabaseClient
            .from("families")
            .select("*")
            .eq("id", userAccount.familyId)
            .single();
          if (data) {
            setFamily({
              id: data.id,
              name: data.name,
              bannerUrl: data.banner_url ?? null,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            });
          }
        } catch {
          // Silently fail
        }
      })();
    }, [userAccount?.familyId]),
  );

  return family;
}
