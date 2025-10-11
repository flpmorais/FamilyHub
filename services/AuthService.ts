import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserProfile } from '../models';

export class AuthService {
  private static instance: AuthService;
  private currentUser: FirebaseUser | null = null;

  private constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user with email and password
   */
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user document in Firestore
      const userData: User = {
        id: user.uid,
        email: user.email!,
        displayName: displayName || user.displayName || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      return userData;
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      return userDoc.data() as User;
    } catch (error) {
      throw new Error(`Sign in failed: ${error}`);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(`Sign out failed: ${error}`);
    }
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  /**
   * Get current user data from Firestore
   */
  async getCurrentUserData(): Promise<User | null> {
    if (!this.currentUser) {
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (!userDoc.exists()) {
        return null;
      }
      return userDoc.data() as User;
    } catch (error) {
      throw new Error(`Failed to get user data: ${error}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      await setDoc(doc(db, 'userProfiles', this.currentUser.uid), {
        ...profileData,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      throw new Error(`Failed to update profile: ${error}`);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
