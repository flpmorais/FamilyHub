import { Category, CreateCategoryInput } from '../../types/packing.types';

export interface ICategoryRepository {
  getCategories(familyId: string): Promise<Category[]>;
  createCategory(data: CreateCategoryInput): Promise<Category>;
  updateCategory(id: string, data: Partial<Pick<Category, 'name' | 'icon'>>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  countItemsUsingCategory(categoryId: string): Promise<number>;
  setActive(id: string, active: boolean): Promise<Category>;
}
