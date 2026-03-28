export type UserRole = 'admin' | 'maid' | 'child';
export type ProfileStatus = 'active' | 'invited' | 'enrolled' | 'inactive';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  familyId: string;
  status: ProfileStatus;
  email: string | null;
  role: UserRole;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  googleId: string;
  email: string;
  familyId: string;
  profileId: string | null;
  createdAt: string;
  updatedAt: string;
}
