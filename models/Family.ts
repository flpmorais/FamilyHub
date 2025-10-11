export interface Family {
  id: string;
  name: string;
  description?: string;
  createdBy: string; // userId
  members: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  invitedBy?: string; // userId
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  email: string;
  invitedBy: string; // userId
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
