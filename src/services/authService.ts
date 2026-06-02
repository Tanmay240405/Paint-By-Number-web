import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

// ─── Google OAuth Provider ───────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
// Request email scope for Google sign-in
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ─── Sign Up with Email & Password ──────────────────────────────
// Creates a new account and sends a verification email
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Send verification email
  if (credential.user) {
    await sendEmailVerification(credential.user);
  }

  return credential;
};

// ─── Sign In with Email & Password ──────────────────────────────
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

// ─── Sign In with Google (OAuth Popup) ──────────────────────────
export const signInWithGoogle = async (): Promise<UserCredential> => {
  return signInWithPopup(auth, googleProvider);
};

// ─── Sign Out ───────────────────────────────────────────────────
export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

// ─── Password Reset ─────────────────────────────────────────────
// Sends a password reset link to the user's email
export const resetPassword = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

// ─── Auth State Observer ────────────────────────────────────────
// Subscribes to auth state changes. Returns an unsubscribe function.
export const onAuthChange = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// ─── Password Strength Validation ───────────────────────────────
export interface PasswordStrength {
  score: number;       // 0-4 (0 = very weak, 4 = very strong)
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

// ─── Firebase Error Messages ────────────────────────────────────
// Translates cryptic Firebase error codes into friendly messages
export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please use at least 8 characters.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a moment before trying again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups for this site.',
    'auth/cancelled-popup-request': 'Only one sign-in popup can be open at a time.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  };

  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
};
