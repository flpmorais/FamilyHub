export type VacationLifecycle =
  | 'planning'
  | 'upcoming'
  | 'active'
  | 'packing'
  | 'completed'
  | 'cancelled';
export type BookingTaskType =
  | 'flights'
  | 'hotel'
  | 'car'
  | 'insurance'
  | 'document_check'
  | 'custom';

export interface Vacation {
  id: string;
  title: string;
  countryCode: string;
  destination: string | null;
  coverImageUrl: string | null;
  departureDate: string;
  returnDate: string;
  lifecycle: VacationLifecycle;
  isPinned: boolean;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVacationInput {
  title: string;
  countryCode: string;
  destination: string | null;
  departureDate: string;
  returnDate: string;
  familyId: string;
  participantProfileIds: string[];
  tagIds?: string[];
}

export interface VacationParticipant {
  vacationId: string;
  profileId: string;
  createdAt: string;
}

export interface BookingTask {
  id: string;
  vacationId: string;
  familyId: string;
  title: string;
  taskType: BookingTaskType;
  deadlineDays: number | null;
  dueDate: string | null;
  isComplete: boolean;
  profileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingTaskInput {
  vacationId: string;
  familyId: string;
  title: string;
  taskType: BookingTaskType;
  deadlineDays?: number | null;
  dueDate?: string | null;
  profileId?: string | null;
}

export interface TaskTemplate {
  id: string;
  familyId: string;
  title: string;
  deadlineDays: number;
  isAllFamily: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
  profileIds: string[];
}

export interface CreateTaskTemplateInput {
  title: string;
  deadlineDays: number;
  isAllFamily?: boolean;
  tagIds?: string[];
  profileIds?: string[];
}

export interface VacationTemplateBag {
  bagTemplateId: string;
  isTopLevel: boolean;
}

export interface VacationBag {
  id: string;
  bagTemplateId: string;
  isTopLevel: boolean;
}

export interface VacationTemplate {
  id: string;
  familyId: string;
  title: string;
  countryCode: string;
  coverImageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  participantProfileIds: string[];
  tagIds: string[];
  bags: VacationTemplateBag[];
}

export interface CreateVacationTemplateInput {
  title: string;
  countryCode: string;
  familyId: string;
  participantProfileIds: string[];
  tagIds?: string[];
  bags?: VacationTemplateBag[];
}
