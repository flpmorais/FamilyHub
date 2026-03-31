import { BagTemplate, CreateBagTemplateInput } from '../../types/packing.types';

export interface IBagTemplateRepository {
  getBagTemplates(familyId: string): Promise<BagTemplate[]>;
  createBagTemplate(input: CreateBagTemplateInput): Promise<BagTemplate>;
  updateBagTemplate(
    id: string,
    data: Partial<Pick<BagTemplate, 'name' | 'color' | 'sizeLiters' | 'isTopLevel'>>
  ): Promise<BagTemplate>;
  deleteBagTemplate(id: string): Promise<void>;
  countItemsUsingBag(bagId: string): Promise<number>;
  setActive(id: string, active: boolean): Promise<BagTemplate>;
  reorderBagTemplate(id: string, newOrder: number): Promise<void>;
}
