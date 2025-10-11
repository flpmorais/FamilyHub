import * as SQLite from 'expo-sqlite';
import { GroceryCategory, TaskCategory, NoteTag } from '../models';

export class SQLiteService {
  private static instance: SQLiteService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  /**
   * Initialize the database and create tables
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('familyhub.db');
      await this.createTables();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Grocery categories table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS grocery_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        family_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);

    // Task categories table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        family_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);

    // Note tags table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS note_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        family_id TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_grocery_categories_family_id 
      ON grocery_categories(family_id);
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_task_categories_family_id 
      ON task_categories(family_id);
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_note_tags_family_id 
      ON note_tags(family_id);
    `);
  }

  /**
   * Get all grocery categories for a family
   */
  async getGroceryCategories(familyId: string): Promise<GroceryCategory[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getAllAsync(
      'SELECT * FROM grocery_categories WHERE family_id = ? ORDER BY name',
      [familyId]
    );

    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      icon: row.icon as string,
      familyId: row.family_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  /**
   * Save grocery categories
   */
  async saveGroceryCategories(categories: GroceryCategory[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.withTransactionAsync(async () => {
      for (const category of categories) {
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO grocery_categories 
           (id, name, color, icon, family_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.name,
            category.color,
            category.icon,
            category.familyId,
            category.createdAt.toISOString(),
            category.updatedAt.toISOString(),
          ]
        );
      }
    });
  }

  /**
   * Get all task categories for a family
   */
  async getTaskCategories(familyId: string): Promise<TaskCategory[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getAllAsync(
      'SELECT * FROM task_categories WHERE family_id = ? ORDER BY name',
      [familyId]
    );

    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      icon: row.icon as string,
      familyId: row.family_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  /**
   * Save task categories
   */
  async saveTaskCategories(categories: TaskCategory[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.withTransactionAsync(async () => {
      for (const category of categories) {
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO task_categories 
           (id, name, color, icon, family_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.name,
            category.color,
            category.icon,
            category.familyId,
            category.createdAt.toISOString(),
            category.updatedAt.toISOString(),
          ]
        );
      }
    });
  }

  /**
   * Get all note tags for a family
   */
  async getNoteTags(familyId: string): Promise<NoteTag[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getAllAsync(
      'SELECT * FROM note_tags WHERE family_id = ? ORDER BY name',
      [familyId]
    );

    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      familyId: row.family_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  /**
   * Save note tags
   */
  async saveNoteTags(tags: NoteTag[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.withTransactionAsync(async () => {
      for (const tag of tags) {
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO note_tags 
           (id, name, color, family_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            tag.id,
            tag.name,
            tag.color,
            tag.familyId,
            tag.createdAt.toISOString(),
            tag.updatedAt.toISOString(),
          ]
        );
      }
    });
  }

  /**
   * Clear all data for a family
   */
  async clearFamilyData(familyId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM grocery_categories WHERE family_id = ?', [familyId]);
      await this.db!.runAsync('DELETE FROM task_categories WHERE family_id = ?', [familyId]);
      await this.db!.runAsync('DELETE FROM note_tags WHERE family_id = ?', [familyId]);
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Export singleton instance
export const sqliteService = SQLiteService.getInstance();
