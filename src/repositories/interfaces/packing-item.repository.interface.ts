import {
  PackingItem,
  CreatePackingItemInput,
  PackingStatus,
} from "../../types/packing.types";

export interface IPackingItemRepository {
  getPackingItems(vacationId: string): Promise<PackingItem[]>;
  createPackingItem(data: CreatePackingItemInput): Promise<PackingItem>;
  updatePackingItem(
    id: string,
    data: Partial<Omit<PackingItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<PackingItem>;
  deletePackingItem(id: string): Promise<void>;
  bulkUpdateStatus(ids: string[], status: PackingStatus): Promise<void>;
}
