import { SupabaseClient } from '@supabase/supabase-js';
import { IClassificationRepository, ClassificationResult } from "../interfaces/classification.repository.interface";
import { OTHER_CATEGORY_NAME } from "../../constants/shopping-defaults";
import { logger } from "../../utils/logger";

const FALLBACK = (itemName: string): ClassificationResult => ({
  category: OTHER_CATEGORY_NAME,
  parsedName: itemName,
  quantityNote: null,
});

export class SupabaseClassificationRepository implements IClassificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async classifyItem(itemName: string, categories: string[]): Promise<ClassificationResult> {
    try {
      const { data, error } = await this.client.functions.invoke('classify-item', {
        body: { itemName, categories },
      });

      if (error) {
        logger.warn("ClassificationRepository", "Edge Function error, using fallback", error);
        return FALLBACK(itemName);
      }

      const category = data?.category;
      const validCategory = typeof category === "string" && categories.includes(category)
        ? category
        : OTHER_CATEGORY_NAME;

      return {
        category: validCategory,
        parsedName: data?.parsedName || itemName,
        quantityNote: data?.quantityNote ?? null,
      };
    } catch (err) {
      logger.warn("ClassificationRepository", "classify failed, using fallback", err);
      return FALLBACK(itemName);
    }
  }
}
