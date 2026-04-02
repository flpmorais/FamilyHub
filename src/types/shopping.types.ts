export interface ShoppingCategory {
  id: string;
  familyId: string;
  name: string;
  active: boolean;
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
  isUrgent: boolean;
  isTicked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingItemInput {
  familyId: string;
  name: string;
  categoryId: string;
  quantityNote?: string;
  isUrgent?: boolean;
}

export interface UpdateShoppingItemInput {
  name?: string;
  categoryId?: string;
  quantityNote?: string | null;
  isUrgent?: boolean;
}

export interface CreateShoppingCategoryInput {
  familyId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateShoppingCategoryInput {
  name?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface ShoppingWidgetData {
  openItemCount: number;
}
