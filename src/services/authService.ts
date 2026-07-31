import { supabase } from '../supabase/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────
export type SupabaseUser = User;

// ─── Sign Up with Email & Password ──────────────────────────────
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/profile`,
    },
  });
  return { user: data?.user || null, session: data?.session || null, error };
};

// ─── Sign In with Email & Password ──────────────────────────────
export const signInWithEmail = async (
  email: string,
  password: string
) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

// ─── Sign In with Google (OAuth) ────────────────────────────────
export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
};

// ─── Sign Out ───────────────────────────────────────────────────
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  return await supabase.auth.signOut();
};

// ─── Password Reset ─────────────────────────────────────────────
export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};

// ─── Auth State Observer ────────────────────────────────────────
export const onAuthChange = (
  callback: (user: User | null, session: Session | null) => void
): { unsubscribe: () => void } => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
};

// ─── Password Strength Validation ───────────────────────────────
export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: 'Very Weak', color: '#ef4444' },
    1: { label: 'Weak', color: '#f97316' },
    2: { label: 'Fair', color: '#eab308' },
    3: { label: 'Good', color: '#22c55e' },
    4: { label: 'Strong', color: '#10b981' },
    5: { label: 'Very Strong', color: '#059669' },
  };

  const { label, color } = labels[score] || labels[0];

  return { score, label, color, checks };
};

// ─── Email Validation ───────────────────────────────────────────
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ─── Supabase Error Messages ────────────────────────────────────
export const getAuthErrorMessage = (error: AuthError | null | any): string => {
  if (!error) return 'An unexpected error occurred.';
  const msg = error.message || error.error_description || error;
  
  // Custom friendly mapping can be added here
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password. Please try again.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  
  return msg;
};

// ─── 2FA (Multi-Factor Authentication) ──────────────────────────
export const checkMFA = async () => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
};

export const enrollMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return data;
};

export const challengeMFA = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
};

export const verifyMFA = async (factorId: string, challengeId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return data;
};

export const unenrollMFA = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  return data;
};
