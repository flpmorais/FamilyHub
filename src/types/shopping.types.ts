export interface ShoppingCategory {
  id: string;
  familyId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  categoryId: string;
  quantityNote: string | null;
  isTicked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingItemInput {
  familyId: string;
  name: string;
  categoryId: string;
  quantityNote?: string;
}

export interface UpdateShoppingItemInput {
  name?: string;
  categoryId?: string;
  quantityNote?: string | null;
}

export interface CreateShoppingCategoryInput {
  familyId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateShoppingCategoryInput {
  name?: string;
  sortOrder?: number;
}

export interface ShoppingWidgetData {
  openItemCount: number;
}
