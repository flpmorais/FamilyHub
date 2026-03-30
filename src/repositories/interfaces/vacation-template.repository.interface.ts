import {
  VacationTemplate,
  CreateVacationTemplateInput,
} from '../../types/vacation.types';

export interface IVacationTemplateRepository {
  getVacationTemplates(familyId: string, activeOnly?: boolean): Promise<VacationTemplate[]>;
  getVacationTemplateById(id: string): Promise<VacationTemplate | null>;
  createVacationTemplate(data: CreateVacationTemplateInput): Promise<VacationTemplate>;
  updateVacationTemplate(
    id: string,
    data: Partial<Omit<VacationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'participantProfileIds' | 'tagIds'>>,
    participantProfileIds?: string[],
    tagIds?: string[]
  ): Promise<VacationTemplate>;
  deleteVacationTemplate(id: string): Promise<void>;
  uploadCoverImage(templateId: string, familyId: string, localUri: string): Promise<string>;
}
