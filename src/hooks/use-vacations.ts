import { Vacation } from '../types/vacation.types';

// Story 0.3 stub — PowerSync useQuery wired in Story 0.4
export function useVacations(): { vacations: Vacation[]; isLoading: boolean } {
  return { vacations: [], isLoading: false };
}
