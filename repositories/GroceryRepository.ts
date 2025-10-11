import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GroceryItem, GroceryList, ApiResponse, PaginatedResponse } from '../models';
import { BaseRepository } from './BaseRepository';

export class GroceryRepository extends BaseRepository<GroceryItem> {
  constructor() {
    super('groceryItems');
  }

  async create(item: Omit<GroceryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<GroceryItem>> {
    try {
      const now = new Date();
      const groceryData = {
        ...item,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, this.collectionName), groceryData);
      const createdItem: GroceryItem = {
        ...item,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };

      return this.createSuccessResponse(createdItem);
    } catch (error) {
      return this.createErrorResponse(`Failed to create grocery item: ${error}`);
    }
  }

  async getById(id: string): Promise<ApiResponse<GroceryItem>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return this.createErrorResponse('Grocery item not found');
      }

      const data = docSnap.data();
      const item: GroceryItem = {
        id: docSnap.id,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        purchased: data.purchased,
        purchasedBy: data.purchasedBy,
        purchasedAt: data.purchasedAt?.toDate(),
        addedBy: data.addedBy,
        familyId: data.familyId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };

      return this.createSuccessResponse(item);
    } catch (error) {
      return this.createErrorResponse(`Failed to get grocery item: ${error}`);
    }
  }

  async getAll(filters?: Record<string, any>): Promise<ApiResponse<GroceryItem[]>> {
    try {
      let q = query(collection(db, this.collectionName));

      if (filters) {
        if (filters.familyId) {
          q = query(q, where('familyId', '==', filters.familyId));
        }
        if (filters.purchased !== undefined) {
          q = query(q, where('purchased', '==', filters.purchased));
        }
        if (filters.category) {
          q = query(q, where('category', '==', filters.category));
        }
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const items: GroceryItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          category: data.category,
          purchased: data.purchased,
          purchasedBy: data.purchasedBy,
          purchasedAt: data.purchasedAt?.toDate(),
          addedBy: data.addedBy,
          familyId: data.familyId,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return this.createSuccessResponse(items);
    } catch (error) {
      return this.createErrorResponse(`Failed to get grocery items: ${error}`);
    }
  }

  async update(id: string, updates: Partial<GroceryItem>): Promise<ApiResponse<GroceryItem>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);

      // Get updated item
      const result = await this.getById(id);
      return result;
    } catch (error) {
      return this.createErrorResponse(`Failed to update grocery item: ${error}`);
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return this.createSuccessResponse(undefined);
    } catch (error) {
      return this.createErrorResponse(`Failed to delete grocery item: ${error}`);
    }
  }

  async getPaginated(page: number, limitCount: number, filters?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<GroceryItem>>> {
    try {
      const result = await this.getAll(filters);
      if (!result.success || !result.data) {
        return this.createErrorResponse('Failed to get grocery items');
      }

      const startIndex = (page - 1) * limitCount;
      const endIndex = startIndex + limitCount;
      const paginatedItems = result.data.slice(startIndex, endIndex);

      const response: PaginatedResponse<GroceryItem> = {
        items: paginatedItems,
        total: result.data.length,
        page,
        limit: limitCount,
        hasMore: endIndex < result.data.length,
      };

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.createErrorResponse(`Failed to get paginated grocery items: ${error}`);
    }
  }

  // Grocery-specific methods
  async markAsPurchased(id: string, purchasedBy: string): Promise<ApiResponse<GroceryItem>> {
    return this.update(id, {
      purchased: true,
      purchasedBy,
      purchasedAt: new Date(),
    });
  }

  async markAsUnpurchased(id: string): Promise<ApiResponse<GroceryItem>> {
    return this.update(id, {
      purchased: false,
      purchasedBy: undefined,
      purchasedAt: undefined,
    });
  }
}
