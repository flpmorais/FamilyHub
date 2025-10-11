export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  familyId?: string;
  role: 'parent' | 'child';
  createdAt: Date;
  updatedAt: Date;
}
