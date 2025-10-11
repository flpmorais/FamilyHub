export interface Note {
  id: string;
  title: string;
  content: string;
  authorId: string; // userId
  familyId: string;
  tags: string[];
  isPinned: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteTag {
  id: string;
  name: string;
  color: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}
