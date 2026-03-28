import {
  Vacation,
  CreateVacationInput,
  VacationParticipant,
  BookingTask,
  CreateBookingTaskInput,
} from '../../types/vacation.types';

export interface IVacationRepository {
  getVacations(familyId: string): Promise<Vacation[]>;
  createVacation(data: CreateVacationInput): Promise<Vacation>;
  updateVacation(
    id: string,
    data: Partial<Omit<Vacation, 'id' | 'createdAt' | 'updatedAt'>>,
    participantProfileIds?: string[],
    categoryIds?: string[],
    tagIds?: string[]
  ): Promise<Vacation>;
  deleteVacation(id: string): Promise<void>;
  getParticipants(vacationId: string): Promise<VacationParticipant[]>;
  getVacationCategories(vacationId: string): Promise<string[]>;
  getVacationTags(vacationId: string): Promise<string[]>;
  uploadCoverImage(vacationId: string, familyId: string, localUri: string): Promise<string>;
  getBookingTasks(vacationId: string): Promise<BookingTask[]>;
  createBookingTask(data: CreateBookingTaskInput): Promise<BookingTask>;
  updateBookingTask(
    id: string,
    data: Partial<Pick<BookingTask, 'title' | 'dueDate' | 'isComplete'>>
  ): Promise<BookingTask>;
  deleteBookingTask(id: string): Promise<void>;
}
