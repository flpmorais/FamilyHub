import { ShoppingItem, CreateShoppingItemInput, UpdateShoppingItemInput } from "../../types/shopping.types";

export interface IShoppingRepository {
  addItem(data: CreateShoppingItemInput): Promise<ShoppingItem>;
  tickItem(id: string): Promise<ShoppingItem>;
  untickItem(id: string): Promise<ShoppingItem>;
  editItem(id: string, data: UpdateShoppingItemInput): Promise<ShoppingItem>;
  setUrgent(id: string, isUrgent: boolean): Promise<ShoppingItem>;
  deleteItem(id: string): Promise<void>;
  getItems(familyId: string): Promise<ShoppingItem[]>;
  getUnchecked(familyId: string): Promise<ShoppingItem[]>;
  getCheckedPaginated(familyId: string, limit: number, offset: number): Promise<ShoppingItem[]>;
  findByName(familyId: string, name: string): Promise<ShoppingItem | null>;
}
