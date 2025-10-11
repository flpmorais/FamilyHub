export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  purchased: boolean;
  purchasedBy?: string; // userId
  purchasedAt?: Date;
  addedBy: string; // userId
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdBy: string; // userId
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
