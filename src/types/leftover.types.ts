export type LeftoverStatus = "active" | "closed";

export interface Leftover {
  id: string;
  familyId: string;
  name: string;
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
  totalDoses: number;
  expiryDays?: number;
}

export interface UpdateLeftoverInput {
  name?: string;
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
