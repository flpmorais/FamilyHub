import { SupabaseClient } from "@supabase/supabase-js";
import type { ISuggestionRepository } from "../interfaces/suggestion.repository.interface";
import type {
  Suggestion,
  SuggestionWithMeta,
  CreateSuggestionInput,
  SuggestionStatus,
  SuggestionCommentWithProfile,
  SuggestionStatusHistory,
} from "../../types/suggestion.types";

function mapSuggestion(row: any): Suggestion {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapComment(row: any): SuggestionCommentWithProfile {
  return {
    id: row.id,
    suggestionId: row.suggestion_id,
    profileId: row.profile_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profileName: row.profiles?.display_name ?? "",
    profileAvatarUrl: row.profiles?.avatar_url ?? null,
  };
}

function mapHistory(row: any): SuggestionStatusHistory {
  return {
    id: row.id,
    suggestionId: row.suggestion_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  };
}

export class SupabaseSuggestionRepository implements ISuggestionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSuggestions(familyId: string): Promise<SuggestionWithMeta[]> {
    const { data, error } = await this.client
      .from("suggestions")
      .select("*, profiles!created_by(display_name, avatar_url)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get comment counts
    const ids = (data ?? []).map((r: any) => r.id);
    let countMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: countData } = await this.client
        .from("suggestion_comments")
        .select("suggestion_id")
        .in("suggestion_id", ids);

      for (const row of (countData ?? []) as any[]) {
        countMap[row.suggestion_id] = (countMap[row.suggestion_id] ?? 0) + 1;
      }
    }

    return (data ?? []).map((row: any) => ({
      ...mapSuggestion(row),
      creatorName: row.profiles?.display_name ?? "",
      creatorAvatarUrl: row.profiles?.avatar_url ?? null,
      commentCount: countMap[row.id] ?? 0,
    }));
  }

  async getSuggestionById(id: string): Promise<Suggestion | null> {
    const { data, error } = await this.client
      .from("suggestions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return mapSuggestion(data);
  }

  async createSuggestion(input: CreateSuggestionInput): Promise<Suggestion> {
    const { data, error } = await this.client
      .from("suggestions")
      .insert({
        family_id: input.familyId,
        title: input.title,
        description: input.description,
        created_by: input.createdBy,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapSuggestion(data);
  }

  async updateSuggestion(
    id: string,
    updates: Partial<Pick<Suggestion, "title" | "description">>,
  ): Promise<Suggestion> {
    const { data, error } = await this.client
      .from("suggestions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapSuggestion(data);
  }

  async updateSuggestionStatus(
    id: string,
    newStatus: SuggestionStatus,
    changedBy: string,
  ): Promise<Suggestion> {
    // Fetch current status
    const { data: current, error: fetchErr } = await this.client
      .from("suggestions")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    const oldStatus = current?.status ?? null;

    // Insert history entry
    const { error: histErr } = await this.client
      .from("suggestion_status_history")
      .insert({
        suggestion_id: id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
      });

    if (histErr) throw histErr;

    // Update suggestion status
    const { data, error } = await this.client
      .from("suggestions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapSuggestion(data);
  }

  async deleteSuggestion(id: string): Promise<void> {
    const { error } = await this.client
      .from("suggestions")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  // ── Comments ─────────────────────────────────────────────────────────────

  async getComments(
    suggestionId: string,
  ): Promise<SuggestionCommentWithProfile[]> {
    const { data, error } = await this.client
      .from("suggestion_comments")
      .select(
        "id, suggestion_id, profile_id, content, created_at, updated_at, profiles(display_name, avatar_url)",
      )
      .eq("suggestion_id", suggestionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapComment);
  }

  async createComment(
    suggestionId: string,
    profileId: string,
    content: string,
  ): Promise<SuggestionCommentWithProfile> {
    const { data, error } = await this.client
      .from("suggestion_comments")
      .insert({ suggestion_id: suggestionId, profile_id: profileId, content })
      .select(
        "id, suggestion_id, profile_id, content, created_at, updated_at, profiles(display_name, avatar_url)",
      )
      .single();

    if (error) throw error;
    return mapComment(data);
  }

  async updateComment(commentId: string, content: string): Promise<void> {
    const { error } = await this.client
      .from("suggestion_comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) throw error;
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await this.client
      .from("suggestion_comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;
  }

  // ── Status history ───────────────────────────────────────────────────────

  async getStatusHistory(
    suggestionId: string,
  ): Promise<SuggestionStatusHistory[]> {
    const { data, error } = await this.client
      .from("suggestion_status_history")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .order("changed_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapHistory);
  }
}
