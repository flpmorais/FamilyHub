export type DishTypeKey =
  | 'meal'
  | 'main'
  | 'side'
  | 'soup'
  | 'dessert'
  | 'other'
  | 'appetizer';

export interface DishType {
  id: string;
  familyId: string;
  key: DishTypeKey;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
}

export const DISH_TYPE_KEYS: readonly DishTypeKey[] = [
  'appetizer',
  'soup',
  'meal',
  'main',
  'side',
  'dessert',
  'other',
];
