import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Note, ApiResponse, PaginatedResponse } from '../models';
import { BaseRepository } from './BaseRepository';

export class NoteRepository extends BaseRepository<Note> {
  constructor() {
    super('notes');
  }

  async create(item: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Note>> {
    try {
      const now = new Date();
      const noteData = {
        ...item,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, this.collectionName), noteData);
      const createdNote: Note = {
        ...item,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };

      return this.createSuccessResponse(createdNote);
    } catch (error) {
      return this.createErrorResponse(`Failed to create note: ${error}`);
    }
  }

  async getById(id: string): Promise<ApiResponse<Note>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return this.createErrorResponse('Note not found');
      }

      const data = docSnap.data();
      const note: Note = {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        familyId: data.familyId,
        tags: data.tags || [],
        isPinned: data.isPinned || false,
        isShared: data.isShared || false,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };

      return this.createSuccessResponse(note);
    } catch (error) {
      return this.createErrorResponse(`Failed to get note: ${error}`);
    }
  }

  async getAll(filters?: Record<string, any>): Promise<ApiResponse<Note[]>> {
    try {
      let q = query(collection(db, this.collectionName));

      if (filters) {
        if (filters.familyId) {
          q = query(q, where('familyId', '==', filters.familyId));
        }
        if (filters.authorId) {
          q = query(q, where('authorId', '==', filters.authorId));
        }
        if (filters.isPinned !== undefined) {
          q = query(q, where('isPinned', '==', filters.isPinned));
        }
        if (filters.isShared !== undefined) {
          q = query(q, where('isShared', '==', filters.isShared));
        }
        if (filters.tags && filters.tags.length > 0) {
          q = query(q, where('tags', 'array-contains-any', filters.tags));
        }
      }

      // Order by pinned first, then by updated date
      q = query(q, orderBy('isPinned', 'desc'), orderBy('updatedAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const notes: Note[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          familyId: data.familyId,
          tags: data.tags || [],
          isPinned: data.isPinned || false,
          isShared: data.isShared || false,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return this.createSuccessResponse(notes);
    } catch (error) {
      return this.createErrorResponse(`Failed to get notes: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Note>): Promise<ApiResponse<Note>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updateData);

      // Get updated note
      const result = await this.getById(id);
      return result;
    } catch (error) {
      return this.createErrorResponse(`Failed to update note: ${error}`);
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return this.createSuccessResponse(undefined);
    } catch (error) {
      return this.createErrorResponse(`Failed to delete note: ${error}`);
    }
  }

  async getPaginated(page: number, limitCount: number, filters?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<Note>>> {
    try {
      const result = await this.getAll(filters);
      if (!result.success || !result.data) {
        return this.createErrorResponse('Failed to get notes');
      }

      const startIndex = (page - 1) * limitCount;
      const endIndex = startIndex + limitCount;
      const paginatedItems = result.data.slice(startIndex, endIndex);

      const response: PaginatedResponse<Note> = {
        items: paginatedItems,
        total: result.data.length,
        page,
        limit: limitCount,
        hasMore: endIndex < result.data.length,
      };

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.createErrorResponse(`Failed to get paginated notes: ${error}`);
    }
  }

  // Note-specific methods
  async togglePin(id: string): Promise<ApiResponse<Note>> {
    try {
      const currentNote = await this.getById(id);
      if (!currentNote.success || !currentNote.data) {
        return this.createErrorResponse('Note not found');
      }

      return this.update(id, {
        isPinned: !currentNote.data.isPinned,
      });
    } catch (error) {
      return this.createErrorResponse(`Failed to toggle pin: ${error}`);
    }
  }

  async toggleShare(id: string): Promise<ApiResponse<Note>> {
    try {
      const currentNote = await this.getById(id);
      if (!currentNote.success || !currentNote.data) {
        return this.createErrorResponse('Note not found');
      }

      return this.update(id, {
        isShared: !currentNote.data.isShared,
      });
    } catch (error) {
      return this.createErrorResponse(`Failed to toggle share: ${error}`);
    }
  }

  async addTags(id: string, tags: string[]): Promise<ApiResponse<Note>> {
    try {
      const currentNote = await this.getById(id);
      if (!currentNote.success || !currentNote.data) {
        return this.createErrorResponse('Note not found');
      }

      const existingTags = currentNote.data.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates

      return this.update(id, {
        tags: newTags,
      });
    } catch (error) {
      return this.createErrorResponse(`Failed to add tags: ${error}`);
    }
  }

  async removeTags(id: string, tags: string[]): Promise<ApiResponse<Note>> {
    try {
      const currentNote = await this.getById(id);
      if (!currentNote.success || !currentNote.data) {
        return this.createErrorResponse('Note not found');
      }

      const existingTags = currentNote.data.tags || [];
      const newTags = existingTags.filter(tag => !tags.includes(tag));

      return this.update(id, {
        tags: newTags,
      });
    } catch (error) {
      return this.createErrorResponse(`Failed to remove tags: ${error}`);
    }
  }
}
