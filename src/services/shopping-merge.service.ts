import type { IShoppingRepository } from '../repositories/interfaces/shopping.repository.interface';
import type { IShoppingCategoryRepository } from '../repositories/interfaces/shopping-category.repository.interface';
import type { IClassificationRepository } from '../repositories/interfaces/classification.repository.interface';
import { OTHER_CATEGORY_NAME } from '../constants/shopping-defaults';
import { logger } from '../utils/logger';

interface MergeItem {
  name: string;
  quantity: string | null;
}

/**
 * Merge generated ingredient items into the existing shopping list.
 * - Existing ticked items: untick + update quantity
 * - Existing unticked items: update quantity
 * - New items: AI-categorize + create
 */
export async function mergeIntoShoppingList(
  items: MergeItem[],
  familyId: string,
  shoppingRepo: IShoppingRepository,
  shoppingCategoryRepo: IShoppingCategoryRepository,
  classificationRepo: IClassificationRepository,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Load categories for AI classification of new items
  const categories = await shoppingCategoryRepo.getAll(familyId);
  const activeCategoryNames = categories.filter((c) => c.active).map((c) => c.name);
  const otherCatId =
    categories.find((c) => c.name === OTHER_CATEGORY_NAME)?.id ?? categories[0]?.id;

  for (const item of items) {
    try {
      const existing = await shoppingRepo.findByName(familyId, item.name);

      if (existing) {
        // Existing item — untick if ticked, update quantity
        if (existing.isTicked) {
          await shoppingRepo.untickItem(existing.id);
        }
        if (item.quantity) {
          await shoppingRepo.editItem(existing.id, { quantityNote: item.quantity });
        }
        updated++;
      } else {
        // New item — classify and create
        let categoryId = otherCatId ?? '';
        try {
          const result = await classificationRepo.classifyItem(item.name, activeCategoryNames);
          const matched = categories.find((c) => c.name === result.category);
          if (matched) categoryId = matched.id;
        } catch {
          // Fallback to "Outros" on classification failure
        }

        await shoppingRepo.addItem({
          familyId,
          name: item.name,
          categoryId,
          quantityNote: item.quantity ?? undefined,
        });
        created++;
      }
    } catch (err) {
      logger.error('ShoppingMergeService', `merge failed for "${item.name}"`, err);
    }
  }

  return { created, updated };
}
