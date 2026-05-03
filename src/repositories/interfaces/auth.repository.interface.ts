import { UserAccount } from "../../types/profile.types";

export interface IAuthRepository {
  signInWithGoogle(): Promise<UserAccount>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<UserAccount | null>;
}
