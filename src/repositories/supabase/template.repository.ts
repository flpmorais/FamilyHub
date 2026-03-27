import { SupabaseClient } from '@supabase/supabase-js';
import { ITemplateRepository } from '../interfaces/template.repository.interface';
import { Template, CreateTemplateInput } from '../../types/packing.types';

export class SupabaseTemplateRepository implements ITemplateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getTemplates(_familyId: string): Promise<Template[]> {
    throw new Error('SupabaseTemplateRepository.getTemplates: not implemented (Story 4.2)');
  }

  async createTemplate(_data: CreateTemplateInput): Promise<Template> {
    throw new Error('SupabaseTemplateRepository.createTemplate: not implemented (Story 4.2)');
  }

  async deleteTemplate(_id: string): Promise<void> {
    throw new Error('SupabaseTemplateRepository.deleteTemplate: not implemented (Story 4.2)');
  }

  async applyTemplate(_templateId: string, _vacationId: string): Promise<void> {
    throw new Error('SupabaseTemplateRepository.applyTemplate: not implemented (Story 4.3)');
  }
}
