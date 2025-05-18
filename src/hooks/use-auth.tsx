
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { GoogleAuthProvider } from 'firebase/auth'; // Import class directly
import { 
  auth, 
  // GoogleAuthProvider, // Removed from here
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
  loginWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  signupWithEmailAndPassword: (email: string, password: string) => Promise<void>;
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

  if (!userDocSnap.exists()) {
    const { uid, email } = firebaseUser;
    const createdAt = Timestamp.now();
    let trialEndsAtTimestamp: Timestamp | null = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds);

    try {
      await setDoc(userDocRef, {
        uid,
        email,
        displayName: firebaseUser.displayName || email?.split('@')[0] || 'User',
        avatarUrl: firebaseUser.photoURL || null,
        createdAt,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: trialEndsAtTimestamp ? 'trialing' : 'none',
        trialEndsAt: trialEndsAtTimestamp,
        subscriptionEndsAt: null,
        trialExtensionUsed: false,
      });
      console.log("User document created in Firestore for UID:", uid);
    } catch (error) {
      console.error("Error creating user document in Firestore:", error);
    }
  } else {
    const existingData = userDocSnap.data();
    const updates: Partial<UserProfile> = {};
    
    if (firebaseUser.photoURL && existingData.avatarUrl !== firebaseUser.photoURL) {
      updates.avatarUrl = firebaseUser.photoURL;
    }
    if (firebaseUser.displayName && existingData.displayName !== firebaseUser.displayName) {
      updates.displayName = firebaseUser.displayName;
    }

    if (existingData.stripeCustomerId === undefined) updates.stripeCustomerId = null;
    if (existingData.stripeSubscriptionId === undefined) updates.stripeSubscriptionId = null;
    
    let currentSubscriptionStatus = existingData.subscriptionStatus;
    if (currentSubscriptionStatus === undefined) {
      updates.subscriptionStatus = 'none'; // Default to 'none' if not present
      currentSubscriptionStatus = 'none'; // for further logic
    }
    
    let currentTrialEndsAt = existingData.trialEndsAt;
    if (currentTrialEndsAt === undefined && (currentSubscriptionStatus === 'none')) {
      // If trialEndsAt is missing and they are not active/past_due etc., give them a trial
      const createdAt = existingData.createdAt instanceof Timestamp ? existingData.createdAt : Timestamp.now();
      currentTrialEndsAt = new Timestamp(createdAt.seconds + 7 * 24 * 60 * 60, createdAt.nanoseconds);
      updates.trialEndsAt = currentTrialEndsAt;
      if (currentSubscriptionStatus === 'none') { // Only set to trialing if they were 'none'
         updates.subscriptionStatus = 'trialing';
      }
    } else if (currentTrialEndsAt instanceof Timestamp && currentTrialEndsAt.toMillis() < Date.now() && currentSubscriptionStatus === 'trialing') {
      // If trial has expired and they were trialing, set to none (or handle upgrade)
      updates.subscriptionStatus = 'none'; 
    }


    if (existingData.subscriptionEndsAt === undefined) updates.subscriptionEndsAt = null;
    if (existingData.trialExtensionUsed === undefined) updates.trialExtensionUsed = false;


    if (Object.keys(updates).length > 0) {
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
        const firestoreUserData = userDocSnap.data();
        setUser({
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: firestoreUserData.displayName || currentFirebaseUser.displayName,
          avatarUrl: firestoreUserData.avatarUrl || currentFirebaseUser.photoURL,
          stripeCustomerId: firestoreUserData.stripeCustomerId || null,
          stripeSubscriptionId: firestoreUserData.stripeSubscriptionId || null,
          subscriptionStatus: firestoreUserData.subscriptionStatus || 'none',
          trialEndsAt: firestoreUserData.trialEndsAt || null,
          subscriptionEndsAt: firestoreUserData.subscriptionEndsAt || null,
          trialExtensionUsed: firestoreUserData.trialExtensionUsed || false,
        });
      } else {
         console.warn(`User document for ${currentFirebaseUser.uid} not found even after create attempt. Setting basic profile.`);
         setUser({ // Fallback if user doc still not found
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
      // After the initial fetch, if a user exists and their doc might have been just created/updated
      // we re-fetch to ensure the context has the very latest from Firestore, especially defaults.
      if (currentFirebaseUser) {
        await fetchAndSetUser(currentFirebaseUser);
      }
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
      const provider = new GoogleAuthProvider(); // Instantiate locally
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast({ title: "Login Failed", description: (error as Error).message || "Could not sign in with Google.", variant: "destructive"});
      setUser(null); 
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ title: "Logout Failed", description: (error as Error).message, variant: "destructive"});
      setIsLoading(false); 
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
      await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing up with email and password:", error);
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive"});
      setIsLoading(false);
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
