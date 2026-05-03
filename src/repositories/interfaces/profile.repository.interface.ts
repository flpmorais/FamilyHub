import { Profile, ProfileStatus, UserRole } from "../../types/profile.types";

export interface IProfileRepository {
  getProfilesByFamily(familyId: string): Promise<Profile[]>;
  createProfile(
    displayName: string,
    avatarUrl: string | null,
    familyId: string,
    email?: string | null,
    role?: UserRole,
  ): Promise<Profile>;
  updateProfile(
    id: string,
    data: Partial<
      Pick<Profile, "displayName" | "avatarUrl" | "email" | "role">
    >,
  ): Promise<Profile>;
  setProfileStatus(id: string, status: ProfileStatus): Promise<Profile>;
  uploadAvatar(
    profileId: string,
    familyId: string,
    localUri: string,
  ): Promise<string>;
  deleteProfile(id: string): Promise<void>;
  reorderProfile(id: string, newOrder: number): Promise<void>;
  batchReorder(items: { id: string; sortOrder: number }[]): Promise<void>;
}
