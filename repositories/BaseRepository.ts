import { ApiResponse, PaginatedResponse } from '../models';

export interface Repository<T> {
  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<T>>;
  getById(id: string): Promise<ApiResponse<T>>;
  getAll(filters?: Record<string, any>): Promise<ApiResponse<T[]>>;
  update(id: string, updates: Partial<T>): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getPaginated(page: number, limit: number, filters?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<T>>>;
}

export abstract class BaseRepository<T> implements Repository<T> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  abstract create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<T>>;
  abstract getById(id: string): Promise<ApiResponse<T>>;
  abstract getAll(filters?: Record<string, any>): Promise<ApiResponse<T[]>>;
  abstract update(id: string, updates: Partial<T>): Promise<ApiResponse<T>>;
  abstract delete(id: string): Promise<ApiResponse<void>>;
  abstract getPaginated(page: number, limit: number, filters?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<T>>>;

  protected createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
    };
  }

  protected createErrorResponse(error: string): ApiResponse<any> {
    return {
      success: false,
      error,
    };
  }
}
