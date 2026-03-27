import { Template, CreateTemplateInput } from '../../types/packing.types';

export interface ITemplateRepository {
  getTemplates(familyId: string): Promise<Template[]>;
  createTemplate(data: CreateTemplateInput): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  applyTemplate(templateId: string, vacationId: string): Promise<void>;
}
