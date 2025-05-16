
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
  db, // Import db
  doc,  // Import doc
  setDoc, // Import setDoc
  getDoc, // Import getDoc
  Timestamp // Import Timestamp
} from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
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
    const { uid, email, displayName, photoURL } = firebaseUser;
    const createdAt = Timestamp.now();
    try {
      await setDoc(userDocRef, {
        uid,
        email,
        displayName: displayName || email?.split('@')[0] || 'User', // Fallback for displayName
        avatarUrl: photoURL,
        createdAt,
        // You can add any other initial user data here
      });
      console.log("User document created in Firestore for UID:", uid);
    } catch (error) {
      console.error("Error creating user document in Firestore:", error);
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
        setUser({
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email,
          displayName: currentFirebaseUser.displayName,
          avatarUrl: currentFirebaseUser.photoURL,
        });
        // Ensure user document exists in Firestore
        await createUserDocument(currentFirebaseUser);
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
      // onAuthStateChanged will handle user document creation
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setUser(null); // Ensure user is null on error
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
      // No need to setIsLoading(false) here if onAuthStateChanged handles it
    } finally {
      // Ensure loading is set to false if not handled by onAuthStateChanged on logout
      // but onAuthStateChanged should set it to false when user becomes null.
    }
  };

  const loginWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await firebaseSignInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user document creation
    } catch (error) {
      console.error("Error signing in with email and password:", error);
      setIsLoading(false);
    }
  };

  const signupWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user document creation
    } catch (error) {
      console.error("Error signing up with email and password:", error);
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
