import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Task, ApiResponse, PaginatedResponse } from '../models';
import { BaseRepository } from './BaseRepository';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super('tasks');
  }

  async create(item: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> {
    try {
      const now = new Date();
      const taskData = {
        ...item,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      const docRef = await addDoc(collection(db, this.collectionName), taskData);
      const createdTask: Task = {
        ...item,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };

      return this.createSuccessResponse(createdTask);
    } catch (error) {
      return this.createErrorResponse(`Failed to create task: ${error}`);
    }
  }

  async getById(id: string): Promise<ApiResponse<Task>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return this.createErrorResponse('Task not found');
      }

      const data = docSnap.data();
      const task: Task = {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        dueDate: data.dueDate?.toDate(),
        priority: data.priority,
        status: data.status,
        category: data.category,
        familyId: data.familyId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        completedAt: data.completedAt?.toDate(),
      };

      return this.createSuccessResponse(task);
    } catch (error) {
      return this.createErrorResponse(`Failed to get task: ${error}`);
    }
  }

  async getAll(filters?: Record<string, any>): Promise<ApiResponse<Task[]>> {
    try {
      let q = query(collection(db, this.collectionName));

      if (filters) {
        if (filters.familyId) {
          q = query(q, where('familyId', '==', filters.familyId));
        }
        if (filters.assignedTo) {
          q = query(q, where('assignedTo', '==', filters.assignedTo));
        }
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        }
        if (filters.priority) {
          q = query(q, where('priority', '==', filters.priority));
        }
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          dueDate: data.dueDate?.toDate(),
          priority: data.priority,
          status: data.status,
          category: data.category,
          familyId: data.familyId,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          completedAt: data.completedAt?.toDate(),
        });
      });

      return this.createSuccessResponse(tasks);
    } catch (error) {
      return this.createErrorResponse(`Failed to get tasks: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      await updateDoc(docRef, updateData);

      // Get updated task
      const result = await this.getById(id);
      return result;
    } catch (error) {
      return this.createErrorResponse(`Failed to update task: ${error}`);
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return this.createSuccessResponse(undefined);
    } catch (error) {
      return this.createErrorResponse(`Failed to delete task: ${error}`);
    }
  }

  async getPaginated(page: number, limitCount: number, filters?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<Task>>> {
    try {
      // This is a simplified implementation. In a real app, you'd need to implement cursor-based pagination
      const result = await this.getAll(filters);
      if (!result.success || !result.data) {
        return this.createErrorResponse('Failed to get tasks');
      }

      const startIndex = (page - 1) * limitCount;
      const endIndex = startIndex + limitCount;
      const paginatedItems = result.data.slice(startIndex, endIndex);

      const response: PaginatedResponse<Task> = {
        items: paginatedItems,
        total: result.data.length,
        page,
        limit: limitCount,
        hasMore: endIndex < result.data.length,
      };

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.createErrorResponse(`Failed to get paginated tasks: ${error}`);
    }
  }
}
