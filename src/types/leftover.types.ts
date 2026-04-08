export type LeftoverStatus = "active" | "closed";
export type LeftoverType = "meal" | "main" | "side" | "soup" | "dessert" | "other";

export interface Leftover {
  id: string;
  familyId: string;
  name: string;
  type: LeftoverType;
  totalDoses: number;
  dosesEaten: number;
  dosesThrownOut: number;
  expiryDays: number;
  dateAdded: string;
  expiryDate: string;
  status: LeftoverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeftoverInput {
  familyId: string;
  name: string;
  type?: LeftoverType;
  totalDoses: number;
  expiryDays?: number;
}

export interface UpdateLeftoverInput {
  name?: string;
  type?: LeftoverType;
  totalDoses?: number;
  expiryDate?: string;
  dosesEaten?: number;
  dosesThrownOut?: number;
}

export interface LeftoverWidgetData {
  activeMeals: number;
  totalActiveDoses: number;
  nearestExpiry: { name: string; expiryDate: string } | null;
}
