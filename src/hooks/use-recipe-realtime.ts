import { useEffect } from "react";
import { supabaseClient } from "../repositories/supabase/supabase.client";
import { logger } from "../utils/logger";

/**
 * Subscribes to Supabase Realtime postgres_changes on the `recipes` table
 * filtered by `family_id`. Calls `onRecipeChange` on any INSERT/UPDATE/DELETE.
 * Automatically cleans up subscription on unmount.
 */
export function useRecipeRealtime(
  familyId: string | undefined,
  onRecipeChange: () => void,
) {
  useEffect(() => {
    if (!familyId) return;

    const channel = supabaseClient
      .channel(`recipes-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipes",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          logger.info("RecipeRealtime", `${payload.eventType} event received`);
          onRecipeChange();
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [familyId, onRecipeChange]);
}
