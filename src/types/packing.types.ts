export type PackingStatus = 'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed';

export interface PackingItem {
  id: string;
  vacationId: string;
  name: string;
  status: PackingStatus;
  quantity: number;
  categoryId: string | null;
  assignedProfileId: string | null;
  isAllFamily: boolean;
  notes: string | null;
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
  assignedProfileId?: string;
  isAllFamily?: boolean;
  notes?: string;
  familyId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  sortOrder: number;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
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
  quantity?: number;
  isAllFamily?: boolean;
  tagIds?: string[];
}
