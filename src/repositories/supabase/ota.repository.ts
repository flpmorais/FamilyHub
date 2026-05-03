import * as Updates from "expo-updates";
import { SupabaseClient } from "@supabase/supabase-js";
import { IOtaRepository } from "../interfaces/ota.repository.interface";
import { logger } from "../../utils/logger";

export class SupabaseOtaRepository implements IOtaRepository {
  constructor(private readonly _client: SupabaseClient) {}
  async checkForUpdate(onUpdateReady?: () => void): Promise<boolean> {
    if (__DEV__) return false;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        logger.info("OTA", "No update available");
        return false;
      }
      logger.info("OTA", "Update available, fetching...");
      await Updates.fetchUpdateAsync();
      logger.info("OTA", "Update fetched, reloading...");
      onUpdateReady?.();
      // Brief delay so the user sees the toast before reload
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await Updates.reloadAsync();
      return true;
    } catch {
      // Silently swallow — expected in dev, offline, or when EAS Update is unreachable
      logger.info("OTA", "Update check skipped or failed (non-fatal)");
      return false;
    }
  }

  async applyUpdate(): Promise<void> {
    // Full flow is handled by checkForUpdate — this is a manual trigger fallback
    await this.checkForUpdate();
  }
}
