import { SupabaseClient } from "@supabase/supabase-js";
import type { IRecipeRatingRepository } from "../interfaces/recipe-rating.repository.interface";
import type {
  RecipeRatingWithProfile,
  RecipeRatingSummary,
} from "../../types/recipe.types";

export class SupabaseRecipeRatingRepository implements IRecipeRatingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getRatingsForRecipe(
    recipeId: string,
  ): Promise<RecipeRatingWithProfile[]> {
    const { data, error } = await this.client
      .from("recipe_ratings")
      .select(
        "id, recipe_id, profile_id, rating, created_at, updated_at, profiles(display_name, avatar_url)",
      )
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      profileId: row.profile_id,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profileName: row.profiles?.display_name ?? "",
      profileAvatarUrl: row.profiles?.avatar_url ?? null,
    }));
  }

  async getSummary(recipeId: string): Promise<RecipeRatingSummary> {
    const { data, error } = await this.client
      .from("recipe_ratings")
      .select("rating")
      .eq("recipe_id", recipeId);

    if (error) throw error;

    const ratings = data ?? [];
    if (ratings.length === 0) return { average: null, count: 0 };

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  }

  async getSummariesForRecipes(
    recipeIds: string[],
  ): Promise<Map<string, RecipeRatingSummary>> {
    if (recipeIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from("recipe_ratings")
      .select("recipe_id, rating")
      .in("recipe_id", recipeIds);

    if (error) throw error;

    const grouped = new Map<string, number[]>();
    for (const row of data ?? []) {
      const list = grouped.get(row.recipe_id) ?? [];
      list.push(row.rating);
      grouped.set(row.recipe_id, list);
    }

    const result = new Map<string, RecipeRatingSummary>();
    for (const id of recipeIds) {
      const ratings = grouped.get(id);
      if (!ratings || ratings.length === 0) {
        result.set(id, { average: null, count: 0 });
      } else {
        const sum = ratings.reduce((a, b) => a + b, 0);
        result.set(id, {
          average: Math.round((sum / ratings.length) * 10) / 10,
          count: ratings.length,
        });
      }
    }
    return result;
  }

  async upsertRating(
    recipeId: string,
    profileId: string,
    rating: number,
  ): Promise<void> {
    const { error } = await this.client.from("recipe_ratings").upsert(
      {
        recipe_id: recipeId,
        profile_id: profileId,
        rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "recipe_id,profile_id" },
    );

    if (error) throw error;
  }

  async deleteRating(recipeId: string, profileId: string): Promise<void> {
    const { error } = await this.client
      .from("recipe_ratings")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("profile_id", profileId);

    if (error) throw error;
  }
}
