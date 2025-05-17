
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  googleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  type FirebaseUser,
  db,
  doc,
  setDoc,
  getDoc,
  Timestamp
} from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  // Subscription fields
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'none';
  trialEndsAt?: Timestamp | null;
  subscriptionEndsAt?: Timestamp | null;
  trialExtensionUsed?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  signupWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  getUserIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function createUserDocument(firebaseUser: FirebaseUser) {
  if (!firebaseUser) return;
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // Destructure for new user document creation
    const { uid, email, displayName, photoURL } = firebaseUser;
    const createdAt = Timestamp.now();
    const trialEndsAtTimestamp = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds); // 7 days from now

    try {
      await setDoc(userDocRef, {
        uid,
        email,
        displayName: displayName || email?.split('@')[0] || 'User',
        avatarUrl: photoURL,
        createdAt,
        // Initialize subscription fields for new user
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndsAtTimestamp,
        subscriptionEndsAt: null,
        trialExtensionUsed: false,
      });
      console.log("User document created in Firestore with trial info for UID:", uid);
    } catch (error) {
      console.error("Error creating user document in Firestore:", error);
    }
  } else {
    // For existing user, access properties directly from firebaseUser object
    const existingData = userDocSnap.data();
    const updates: Partial<UserProfile> = {};
    
    if (firebaseUser.photoURL && existingData.avatarUrl !== firebaseUser.photoURL) {
      updates.avatarUrl = firebaseUser.photoURL;
    }
    if (firebaseUser.displayName && existingData.displayName !== firebaseUser.displayName) {
      updates.displayName = firebaseUser.displayName;
    }
    // Ensure essential subscription fields are present if somehow missing (migration for old users)
    if (existingData.subscriptionStatus === undefined) updates.subscriptionStatus = 'none';
    if (existingData.trialEndsAt === undefined && existingData.subscriptionStatus !== 'active') { // Only set default trial if not already active
        const createdAt = existingData.createdAt instanceof Timestamp ? existingData.createdAt : Timestamp.now();
        updates.trialEndsAt = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds); 
        if (updates.subscriptionStatus === 'none') updates.subscriptionStatus = 'trialing';
    }


    if (Object.keys(updates).length > 0) {
      try {
        await setDoc(userDocRef, updates, { merge: true });
        console.log("User document updated for UID:", firebaseUser.uid, "with updates:", updates);
      } catch (error) {
        console.error("Error updating user document:", error);
      }
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUserInstance, setFirebaseUserInstance] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser: FirebaseUser | null) => {
      setFirebaseUserInstance(currentFirebaseUser);
      if (currentFirebaseUser) {
        await createUserDocument(currentFirebaseUser); 
        
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const firestoreUserData = userDocSnap.data();
          setUser({
            uid: currentFirebaseUser.uid,
            email: currentFirebaseUser.email,
            displayName: firestoreUserData.displayName || currentFirebaseUser.displayName, // Prioritize Firestore, then Auth
            avatarUrl: firestoreUserData.avatarUrl || currentFirebaseUser.photoURL,       // Prioritize Firestore, then Auth
            stripeCustomerId: firestoreUserData.stripeCustomerId || null,
            stripeSubscriptionId: firestoreUserData.stripeSubscriptionId || null,
            subscriptionStatus: firestoreUserData.subscriptionStatus || 'none',
            trialEndsAt: firestoreUserData.trialEndsAt || null,
            subscriptionEndsAt: firestoreUserData.subscriptionEndsAt || null,
            trialExtensionUsed: firestoreUserData.trialExtensionUsed || false,
          });
        } else {
           // This case should ideally not happen if createUserDocument works correctly,
           // but as a fallback:
           console.warn(`User document for ${currentFirebaseUser.uid} not found after createUserDocument call. Setting basic user profile.`);
           setUser({
            uid: currentFirebaseUser.uid,
            email: currentFirebaseUser.email,
            displayName: currentFirebaseUser.displayName,
            avatarUrl: currentFirebaseUser.photoURL,
            subscriptionStatus: 'none', 
            trialEndsAt: null, 
            trialExtensionUsed: false,
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setUser(null); 
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      setUser(null);
      setFirebaseUserInstance(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const loginWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await firebaseSignInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing in with email and password:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive"});
      setIsLoading(false);
    }
  };

  const signupWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing up with email and password:", error);
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive"});
      setIsLoading(false);
    }
  };

  const getUserIdToken = async (): Promise<string | null> => {
    if (firebaseUserInstance) {
      try {
        return await firebaseUserInstance.getIdToken(true); // Force refresh
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    console.warn("getUserIdToken called but no Firebase user instance is available.");
    return null;
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loginWithGoogle,
      logout,
      loginWithEmailAndPassword,
      signupWithEmailAndPassword,
      isLoading,
      getUserIdToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper for toast - assuming useToast is available globally or imported elsewhere
// This is a simplified version, in a real app, you'd import useToast
declare function toast(options: { title: string; description: string; variant?: "default" | "destructive"; duration?: number }): void;

