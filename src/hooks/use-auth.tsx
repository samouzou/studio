
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { GoogleAuthProvider } from 'firebase/auth'; // Import class directly
import { 
  auth, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  type FirebaseUser,
  db,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  storage, // Ensure storage is imported if used by other parts of the hook, though not directly here
  ref as storageRef, // Ensure storageRef is imported
  uploadBytes, // Ensure uploadBytes is imported
  getDownloadURL // Ensure getDownloadURL is imported
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";


export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
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
  loginWithEmailAndPassword: (email: string, password: string) => Promise<string | null>;
  signupWithEmailAndPassword: (email: string, password: string) => Promise<string | null>;
  sendPasswordReset: (email: string) => Promise<void>;
  isLoading: boolean;
  getUserIdToken: () => Promise<string | null>;
  refreshAuthUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createUserDocument = async (firebaseUser: FirebaseUser) => {
  if (!firebaseUser) return;
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  const updates: Partial<UserProfile> = {};
  let needsUpdate = false;

  if (!userDocSnap.exists()) {
    const { uid, email } = firebaseUser;
    const createdAt = Timestamp.now();
    let trialEndsAtTimestamp: Timestamp | null = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds);

    updates.uid = uid;
    updates.email = email;
    updates.displayName = firebaseUser.displayName || email?.split('@')[0] || 'User';
    updates.avatarUrl = firebaseUser.photoURL || null;
    updates.createdAt = createdAt;
    updates.stripeCustomerId = null;
    updates.stripeSubscriptionId = null;
    updates.subscriptionStatus = trialEndsAtTimestamp ? 'trialing' : 'none';
    updates.trialEndsAt = trialEndsAtTimestamp;
    updates.subscriptionEndsAt = null;
    updates.trialExtensionUsed = false;
    needsUpdate = true;

    try {
      await setDoc(userDocRef, updates);
      console.log("User document created in Firestore for UID:", uid);
    } catch (error) {
      console.error("Error creating user document in Firestore:", error);
    }
  } else {
    const existingData = userDocSnap.data() as UserProfile; // Assume UserProfile structure
    
    if (firebaseUser.photoURL && existingData.avatarUrl !== firebaseUser.photoURL) {
      updates.avatarUrl = firebaseUser.photoURL;
      needsUpdate = true;
    }
    if (firebaseUser.displayName && existingData.displayName !== firebaseUser.displayName) {
      updates.displayName = firebaseUser.displayName;
      needsUpdate = true;
    }

    if (existingData.stripeCustomerId === undefined) {
      updates.stripeCustomerId = null;
      needsUpdate = true;
    }
    if (existingData.stripeSubscriptionId === undefined) {
      updates.stripeSubscriptionId = null;
      needsUpdate = true;
    }
    
    let currentSubscriptionStatus = existingData.subscriptionStatus;
    if (currentSubscriptionStatus === undefined) {
      updates.subscriptionStatus = 'none'; 
      currentSubscriptionStatus = 'none'; 
      needsUpdate = true;
    }
    
    let currentTrialEndsAt = existingData.trialEndsAt;
    if (currentTrialEndsAt === undefined && (currentSubscriptionStatus === 'none' || currentSubscriptionStatus === 'trialing')) {
      const createdAt = existingData.createdAt || Timestamp.now();
      currentTrialEndsAt = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds);
      updates.trialEndsAt = currentTrialEndsAt;
      if (currentSubscriptionStatus === 'none') { 
         updates.subscriptionStatus = 'trialing';
      }
      needsUpdate = true;
    } else if (currentTrialEndsAt && currentTrialEndsAt.toMillis() < Date.now() && currentSubscriptionStatus === 'trialing') {
      updates.subscriptionStatus = 'none'; 
      needsUpdate = true;
    }

    if (existingData.subscriptionEndsAt === undefined) {
      updates.subscriptionEndsAt = null;
      needsUpdate = true;
    }
    if (existingData.trialExtensionUsed === undefined) {
      updates.trialExtensionUsed = false;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await setDoc(userDocRef, updates, { merge: true });
        console.log("User document updated for UID:", firebaseUser.uid, "with updates:", updates);
      } catch (error) {
        console.error("Error updating user document:", error);
      }
    }
  }
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUserInstance, setFirebaseUserInstance] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();

  const fetchAndSetUser = useCallback(async (currentFirebaseUser: FirebaseUser | null) => {
    if (currentFirebaseUser) {
      setFirebaseUserInstance(currentFirebaseUser);
      await createUserDocument(currentFirebaseUser); 
      
      const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const firestoreUserData = userDocSnap.data() as UserProfile;
        setUser({
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: firestoreUserData.displayName || currentFirebaseUser.displayName,
          avatarUrl: firestoreUserData.avatarUrl || currentFirebaseUser.photoURL,
          stripeCustomerId: firestoreUserData.stripeCustomerId,
          stripeSubscriptionId: firestoreUserData.stripeSubscriptionId,
          subscriptionStatus: firestoreUserData.subscriptionStatus,
          trialEndsAt: firestoreUserData.trialEndsAt,
          subscriptionEndsAt: firestoreUserData.subscriptionEndsAt,
          trialExtensionUsed: firestoreUserData.trialExtensionUsed,
        });
      } else {
         console.warn(`User document for ${currentFirebaseUser.uid} not found even after create attempt. Setting basic profile.`);
         setUser({ 
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: currentFirebaseUser.displayName,
          avatarUrl: currentFirebaseUser.photoURL,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: 'none', 
          trialEndsAt: null, 
          subscriptionEndsAt: null,
          trialExtensionUsed: false,
        });
      }
    } else {
      setUser(null);
      setFirebaseUserInstance(null);
    }
    setIsLoading(false);
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      await fetchAndSetUser(currentFirebaseUser);
    });
    return () => unsubscribe();
  }, [fetchAndSetUser]);

  const refreshAuthUser = useCallback(async () => {
    const currentFbUser = auth.currentUser;
    setIsLoading(true);
    await fetchAndSetUser(currentFbUser);
  }, [fetchAndSetUser]);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider(); 
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and clearing loading state
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ title: "Login Failed", description: error.message || "Could not sign in with Google.", variant: "destructive"});
      setUser(null); 
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      // onAuthStateChanged will set user to null and clear loading state
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ title: "Logout Failed", description: error.message, variant: "destructive"});
      setIsLoading(false); 
    }
  };

  const loginWithEmailAndPassword = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and clearing loading state
      // For explicit feedback, we can set isLoading(false) here but onAuthStateChanged is preferred for consistency
      // For now, we rely on onAuthStateChanged to set isLoading(false) after fetchAndSetUser
      return null; // Success
    } catch (error: any) {
      console.error("Error signing in with email and password:", error);
      setUser(null); // Ensure user state is cleared on error
      setIsLoading(false); // Explicitly set loading to false on error
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return 'Invalid email or password. Please try again.';
        case 'auth/invalid-email':
          return 'The email address is not valid.';
        default:
          return error.message || "An unexpected error occurred during login.";
      }
    }
  };

  const signupWithEmailAndPassword = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      await firebaseCreateUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and clearing loading state
      return null; // Success
    } catch (error: any) {
      console.error("Error signing up with email and password:", error);
      setUser(null); // Ensure user state is cleared on error
      setIsLoading(false); // Explicitly set loading to false on error
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'This email address is already in use.';
        case 'auth/invalid-email':
          return 'The email address is not valid.';
        case 'auth/weak-password':
          return 'The password is too weak. It must be at least 6 characters.';
        default:
          return error.message || "An unexpected error occurred during sign up.";
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    setIsLoading(true);
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const getUserIdToken = async (): Promise<string | null> => {
    if (firebaseUserInstance) {
      try {
        return await firebaseUserInstance.getIdToken(true);
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
      sendPasswordReset,
      isLoading,
      getUserIdToken,
      refreshAuthUser 
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
