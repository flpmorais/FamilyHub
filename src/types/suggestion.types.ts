export type SuggestionStatus =
  | "new"
  | "rejected"
  | "accepted"
  | "planned"
  | "implemented";

export interface Suggestion {
  id: string;
  familyId: string;
  title: string;
  description: string;
  status: SuggestionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuggestionInput {
  familyId: string;
  title: string;
  description: string;
  createdBy: string;
}

export interface SuggestionComment {
  id: string;
  suggestionId: string;
  profileId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionCommentWithProfile extends SuggestionComment {
  profileName: string;
  profileAvatarUrl: string | null;
}

export interface SuggestionStatusHistory {
  id: string;
  suggestionId: string;
  oldStatus: SuggestionStatus | null;
  newStatus: SuggestionStatus;
  changedBy: string;
  changedAt: string;
}

export interface SuggestionWithMeta extends Suggestion {
  creatorName: string;
  creatorAvatarUrl: string | null;
  commentCount: number;
}
