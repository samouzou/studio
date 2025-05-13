"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, googleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type FirebaseUser } from '@/lib/firebase';

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          avatarUrl: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true); // Set loading before attempting sign-in
      await signInWithPopup(auth, googleAuthProvider);
      // onAuthStateChanged will handle setting the user and clearing loading state
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setUser(null); // Ensure user is null on error
      setIsLoading(false); // Clear loading on error
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true); // Set loading before attempting sign-out
      await signOut(auth);
      setUser(null);
      // onAuthStateChanged will set loading to false
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false); // Clear loading on error
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loginWithGoogle, logout, isLoading }}>
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
