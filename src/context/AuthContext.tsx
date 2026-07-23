import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle as googleSignIn,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  onAuthChange,
  getAuthErrorMessage,
} from '../services/authService';

// ─── Types ──────────────────────────────────────────────────────
interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  setErrorState: (msg: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Hook ───────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Provider ───────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // true until first auth check
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const { unsubscribe } = onAuthChange((supabaseUser, currentSession) => {
      setUser(supabaseUser);
      setSession(currentSession);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Clear error
  const clearError = useCallback(() => setError(null), []);
  const setErrorState = useCallback((msg: string) => setError(msg), []);

  // ─── Sign Up ────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error: signUpError } = await signUpWithEmail(email, password);
      if (signUpError) throw signUpError;
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Sign In ────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error: signInError } = await signInWithEmail(email, password);
      if (signInError) throw signInError;
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Google Sign In ─────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { error: signInError } = await googleSignIn();
      if (signInError) throw signInError;
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      setError(null);
      const { error: signOutError } = await authSignOut();
      if (signOutError) throw signOutError;
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  // ─── Password Reset ─────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null);
      const { error: resetError } = await authResetPassword(email);
      if (resetError) throw resetError;
    } catch (err: any) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    clearError,
    setErrorState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
