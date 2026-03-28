import { TaskTemplate, CreateTaskTemplateInput } from '../../types/vacation.types';

export interface ITaskTemplateRepository {
  getTaskTemplates(familyId: string): Promise<TaskTemplate[]>;
  createTaskTemplate(familyId: string, input: CreateTaskTemplateInput): Promise<TaskTemplate>;
  updateTaskTemplate(
    id: string,
    data: Partial<Pick<TaskTemplate, 'title' | 'deadlineDays' | 'isAllFamily' | 'active'>> & {
      profileIds?: string[];
      tagIds?: string[];
    }
  ): Promise<TaskTemplate>;
  deleteTaskTemplate(id: string): Promise<void>;
  applyTaskTemplates(
    familyId: string,
    vacationId: string,
    departureDate: string,
    participantProfileIds: string[],
    vacationTagIds: string[]
  ): Promise<number>;
}
