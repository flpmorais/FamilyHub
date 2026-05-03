export type PackingStatus =
  | "new"
  | "buy"
  | "ready"
  | "issue"
  | "last_minute"
  | "packed";

export interface IconEntry {
  id: string;
  name: string;
  tags: string;
}

export interface PackingItem {
  id: string;
  vacationId: string;
  name: string;
  status: PackingStatus;
  quantity: number;
  categoryId: string | null;
  iconId: string;
  assignedProfileId: string | null;
  isAllFamily: boolean;
  notes: string | null;
  vacationBagId: string | null;
  familyId: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackingItemInput {
  vacationId: string;
  name: string;
  quantity?: number;
  categoryId?: string;
  iconId?: string;
  assignedProfileId?: string;
  isAllFamily?: boolean;
  notes?: string;
  vacationBagId?: string;
  familyId: string;
}

export interface Category {
  id: string;
  name: string;
  iconId: string;
  iconName: string;
  active: boolean;
  sortOrder: number;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  iconId: string;
  familyId: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string;
  active: boolean;
  sortOrder: number;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  familyId: string;
  title: string;
  profileIds: string[];
  categoryId: string;
  iconId: string;
  quantity: number;
  isAllFamily: boolean;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
}

export interface CreateTemplateItemInput {
  title: string;
  profileIds?: string[];
  categoryId: string;
  iconId: string;
  quantity?: number;
  isAllFamily?: boolean;
  tagIds?: string[];
}

export interface BagTemplate {
  id: string;
  familyId: string;
  name: string;
  color: string;
  sizeLiters: number;
  isTopLevel: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBagTemplateInput {
  name: string;
  color: string;
  sizeLiters: number;
  isTopLevel: boolean;
  familyId: string;
}
