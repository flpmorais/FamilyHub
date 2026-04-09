import type {
  Suggestion,
  SuggestionWithMeta,
  CreateSuggestionInput,
  SuggestionStatus,
  SuggestionCommentWithProfile,
  SuggestionStatusHistory,
} from "../../types/suggestion.types";

export interface SuggestionListFilters {
  search?: string;
  status?: SuggestionStatus | null;
}

export interface ISuggestionRepository {
  getSuggestions(familyId: string): Promise<SuggestionWithMeta[]>;
  getSuggestionsPaginated(
    familyId: string,
    limit: number,
    offset: number,
    filters: SuggestionListFilters,
  ): Promise<SuggestionWithMeta[]>;
  getSuggestionById(id: string): Promise<Suggestion | null>;
  createSuggestion(data: CreateSuggestionInput): Promise<Suggestion>;
  updateSuggestion(
    id: string,
    data: Partial<Pick<Suggestion, "title" | "description">>,
  ): Promise<Suggestion>;
  updateSuggestionStatus(
    id: string,
    newStatus: SuggestionStatus,
    changedBy: string,
  ): Promise<Suggestion>;
  deleteSuggestion(id: string): Promise<void>;

  getComments(suggestionId: string): Promise<SuggestionCommentWithProfile[]>;
  createComment(
    suggestionId: string,
    profileId: string,
    content: string,
  ): Promise<SuggestionCommentWithProfile>;
  updateComment(commentId: string, content: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;

  getStatusHistory(suggestionId: string): Promise<SuggestionStatusHistory[]>;
}
