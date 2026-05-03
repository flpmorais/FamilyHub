import {
  ShoppingCategory,
  CreateShoppingCategoryInput,
  UpdateShoppingCategoryInput,
} from "../../types/shopping.types";

export interface IShoppingCategoryRepository {
  getAll(familyId: string): Promise<ShoppingCategory[]>;
  create(data: CreateShoppingCategoryInput): Promise<ShoppingCategory>;
  edit(
    id: string,
    data: UpdateShoppingCategoryInput,
  ): Promise<ShoppingCategory>;
  delete(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  reorder(id: string, sortOrder: number): Promise<void>;
  batchReorder(items: { id: string; sortOrder: number }[]): Promise<void>;
  countItemsUsingCategory(categoryId: string): Promise<number>;
}
