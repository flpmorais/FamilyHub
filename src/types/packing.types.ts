export type PackingStatus = 'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed';

export interface PackingItem {
  id: string;
  vacationId: string;
  name: string;
  status: PackingStatus;
  quantity: number;
  categoryId: string | null;
  assignedProfileId: string | null;
  notes: string | null;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackingItemInput {
  vacationId: string;
  name: string;
  quantity?: number;
  categoryId?: string;
  assignedProfileId?: string;
  notes?: string;
  familyId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  active: boolean;
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
  active: boolean;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  templateId: string;
  name: string;
  quantity: number;
  categoryId: string | null;
}

export interface Template {
  id: string;
  name: string;
  familyId: string;
  items: TemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  familyId: string;
  items: Omit<TemplateItem, 'id' | 'templateId'>[];
}
