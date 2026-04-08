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
 *
 * Performance: loads all existing items once, then batches operations.
 */
export async function mergeIntoShoppingList(
  items: MergeItem[],
  familyId: string,
  shoppingRepo: IShoppingRepository,
  shoppingCategoryRepo: IShoppingCategoryRepository,
  classificationRepo: IClassificationRepository,
): Promise<{ created: number; updated: number }> {
  if (items.length === 0) return { created: 0, updated: 0 };

  // 1. Load all existing items and categories in parallel (2 queries instead of N)
  const [existingItems, categories] = await Promise.all([
    shoppingRepo.getItems(familyId),
    shoppingCategoryRepo.getAll(familyId),
  ]);

  const existingByName = new Map(
    existingItems.map((item) => [item.name.toLowerCase(), item]),
  );
  const activeCategoryNames = categories.filter((c) => c.active).map((c) => c.name);
  const otherCatId =
    categories.find((c) => c.name === OTHER_CATEGORY_NAME)?.id ?? categories[0]?.id;

  // 2. Partition items into updates vs creates
  const toUpdate: { id: string; isTicked: boolean; quantity: string | null }[] = [];
  const toCreate: MergeItem[] = [];

  for (const item of items) {
    const existing = existingByName.get(item.name.toLowerCase());
    if (existing) {
      toUpdate.push({ id: existing.id, isTicked: existing.isTicked, quantity: item.quantity });
    } else {
      toCreate.push(item);
    }
  }

  // 3. Batch update existing items
  await Promise.all(
    toUpdate.map(async (upd) => {
      try {
        if (upd.isTicked) {
          await shoppingRepo.untickItem(upd.id);
        }
        if (upd.quantity) {
          await shoppingRepo.editItem(upd.id, { quantityNote: upd.quantity });
        }
      } catch (err) {
        logger.error('ShoppingMergeService', `update failed for item ${upd.id}`, err);
      }
    }),
  );

  // 4. Classify and create new items in parallel
  await Promise.all(
    toCreate.map(async (item) => {
      try {
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
      } catch (err) {
        logger.error('ShoppingMergeService', `create failed for "${item.name}"`, err);
      }
    }),
  );

  return { created: toCreate.length, updated: toUpdate.length };
}
