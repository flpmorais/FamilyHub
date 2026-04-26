import {
  Vacation,
  CreateVacationInput,
  VacationParticipant,
  VacationBag,
  BookingTask,
  CreateBookingTaskInput,
} from '../../types/vacation.types';

export interface VacationListFilters {
  search?: string;
  profileId?: string | null;
  tagId?: string | null;
}

export interface IVacationRepository {
  getVacations(familyId: string): Promise<Vacation[]>;
  getVacationsPaginated(
    familyId: string,
    limit: number,
    offset: number,
    filters: VacationListFilters,
  ): Promise<Vacation[]>;
  createVacation(data: CreateVacationInput): Promise<Vacation>;
  updateVacation(
    id: string,
    data: Partial<Omit<Vacation, 'id' | 'createdAt' | 'updatedAt'>>,
    participantProfileIds?: string[],
    tagIds?: string[]
  ): Promise<Vacation>;
  deleteVacation(id: string): Promise<void>;
  getParticipants(vacationId: string): Promise<VacationParticipant[]>;
  getVacationTags(vacationId: string): Promise<string[]>;
  uploadCoverImage(vacationId: string, familyId: string, localUri: string): Promise<string>;
  getBookingTasks(vacationId: string): Promise<BookingTask[]>;
  createBookingTask(data: CreateBookingTaskInput): Promise<BookingTask>;
  updateBookingTask(
    id: string,
    data: Partial<Pick<BookingTask, 'title' | 'dueDate' | 'isComplete' | 'profileId'>>
  ): Promise<BookingTask>;
  deleteBookingTask(id: string): Promise<void>;
  getVacationBags(vacationId: string): Promise<VacationBag[]>;
  addVacationBag(vacationId: string, bagTemplateId: string, isTopLevel: boolean): Promise<VacationBag>;
  removeVacationBag(vacationBagId: string): Promise<void>;
  updateVacationBagTopLevel(vacationBagId: string, isTopLevel: boolean): Promise<void>;
}
