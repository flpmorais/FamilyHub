import { BookingTask } from '../types/vacation.types';

// Story 0.3 stub — PowerSync useQuery wired in Story 0.4
export function useBookingTasks(_vacationId: string): { tasks: BookingTask[]; isLoading: boolean } {
  return { tasks: [], isLoading: false };
}
