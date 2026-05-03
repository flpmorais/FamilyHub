import { SupabaseClient } from "@supabase/supabase-js";
import { IRecipeTagRepository } from "../interfaces/recipe-tag.repository.interface";
import type {
  RecipeTag,
  CreateRecipeTagInput,
  UpdateRecipeTagInput,
} from "../../types/recipe.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapRecipeTag(row: any): RecipeTag {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseRecipeTagRepository implements IRecipeTagRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(familyId: string): Promise<RecipeTag[]> {
    try {
      const { data, error } = await this.client
        .from("recipe_tags")
        .select("*")
        .eq("family_id", familyId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapRecipeTag);
    } catch (err) {
      logger.error("RecipeTagRepository", "getAll failed", err);
      throw new Error(
        `Não foi possível carregar as etiquetas: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async create(input: CreateRecipeTagInput): Promise<RecipeTag> {
    const id = uuid();
    const ts = now();

    try {
      const { data, error } = await this.client
        .from("recipe_tags")
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRecipeTag(data);
    } catch (err) {
      logger.error("RecipeTagRepository", "create failed", err);
      throw new Error(
        `Não foi possível criar a etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async edit(id: string, input: UpdateRecipeTagInput): Promise<RecipeTag> {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    updates.updated_at = now();

    try {
      const { data, error } = await this.client
        .from("recipe_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapRecipeTag(data);
    } catch (err) {
      logger.error("RecipeTagRepository", "edit failed", err);
      throw new Error(
        `Não foi possível editar a etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("recipe_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      logger.error("RecipeTagRepository", "delete failed", err);
      throw new Error(
        `Não foi possível eliminar a etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async countRecipesUsingTag(tagId: string): Promise<number> {
    const { count, error } = await this.client
      .from("recipe_tag_assignments")
      .select("*", { count: "exact", head: true })
      .eq("tag_id", tagId);
    if (error) throw error;
    return count ?? 0;
  }
}
