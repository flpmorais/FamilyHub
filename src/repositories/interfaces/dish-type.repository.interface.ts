import type { DishType } from '../../types/dish-type.types';

export interface IDishTypeRepository {
  getByFamilyId(familyId: string): Promise<DishType[]>;
}
