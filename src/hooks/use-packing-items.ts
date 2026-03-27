import { PackingItem, PackingStatus } from '../types/packing.types';

// Story 0.3 stub — PowerSync useQuery wired in Story 0.4
export function usePackingItems(
  _vacationId: string,

  _filters?: PackingStatus[]
): { items: PackingItem[]; isLoading: boolean } {
  return { items: [], isLoading: false };
}
