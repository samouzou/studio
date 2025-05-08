"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { MOCK_USER } from '@/data/mock-data';

// Define a more specific User type if needed, or use MOCK_USER's type directly
type UserType = typeof MOCK_USER | null;

interface MockAuthContextType {
  isAuthenticated: boolean;
  user: UserType;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

const AUTH_STATUS_KEY = 'soloLedgerLiteAuthStatus';

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAuthStatus = localStorage.getItem(AUTH_STATUS_KEY);
      if (storedAuthStatus === 'true') {
        setIsAuthenticated(true);
        setUser(MOCK_USER);
      }
    } catch (error) {
      // localStorage might not be available (e.g. SSR or private browsing)
      console.warn('Could not access localStorage for auth status.');
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    setUser(MOCK_USER);
    try {
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
    } catch (error) {
      console.warn('Could not access localStorage to set auth status.');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STATUS_KEY);
    } catch (error) {
      console.warn('Could not access localStorage to remove auth status.');
    }
  };

  return (
    <MockAuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}
