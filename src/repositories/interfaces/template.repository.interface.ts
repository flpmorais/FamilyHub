import { TemplateItem, CreateTemplateItemInput } from '../../types/packing.types';

export interface ITemplateRepository {
  getTemplateItems(familyId: string): Promise<TemplateItem[]>;
  createTemplateItem(familyId: string, item: CreateTemplateItemInput): Promise<TemplateItem>;
  updateTemplateItem(
    id: string,
    data: Partial<Pick<TemplateItem, 'title' | 'categoryId' | 'iconId' | 'quantity' | 'isAllFamily'>> & { profileIds?: string[]; tagIds?: string[] }
  ): Promise<TemplateItem>;
  deleteTemplateItem(id: string): Promise<void>;
  applyTemplates(
    familyId: string,
    vacationId: string,
    participantProfileIds: string[],
    vacationTagIds: string[]
  ): Promise<number>;
}
