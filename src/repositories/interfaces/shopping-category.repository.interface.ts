import { ShoppingCategory, CreateShoppingCategoryInput, UpdateShoppingCategoryInput } from "../../types/shopping.types";

export interface IShoppingCategoryRepository {
  getAll(familyId: string): Promise<ShoppingCategory[]>;
  create(data: CreateShoppingCategoryInput): Promise<ShoppingCategory>;
  edit(id: string, data: UpdateShoppingCategoryInput): Promise<ShoppingCategory>;
  delete(id: string): Promise<void>;
}
