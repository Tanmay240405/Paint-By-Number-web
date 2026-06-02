import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  checkPasswordStrength,
  isValidEmail,
  PasswordStrength,
} from '../services/authService';
import './AuthPage.css';

// ─── Rate Limiting Config ────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds

type AuthMode = 'signin' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signInWithGoogle, resetPassword, user } = useAuth();

  // If user is already logged in, redirect to where they came from
  const from = (location.state as any)?.from?.pathname || '/create';
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // ─── Form State ─────────────────────────────────────────────
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── UI State ───────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Validation State ───────────────────────────────────────
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  // ─── Rate Limiting ──────────────────────────────────────────
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup lockout timer
  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, []);

  // Start lockout countdown
  const startLockout = useCallback(() => {
    setIsLocked(true);
    setLockoutRemaining(LOCKOUT_DURATION_MS / 1000);

    lockoutTimerRef.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutTimerRef.current!);
          lockoutTimerRef.current = null;
          setIsLocked(false);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── Password Strength Check ────────────────────────────────
  useEffect(() => {
    if (mode === 'signup' && password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password, mode]);

  // ─── Clear messages on mode change ──────────────────────────
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

  // ─── Validation ─────────────────────────────────────────────
  const emailError = emailTouched && email && !isValidEmail(email)
    ? 'Please enter a valid email address'
    : null;

  const passwordError =
    mode === 'signup' && passwordTouched && password && passwordStrength && passwordStrength.score < 3
      ? 'Password needs to be stronger'
      : null;

  const confirmError =
    mode === 'signup' && confirmPassword && password !== confirmPassword
      ? 'Passwords do not match'
      : null;

  const isFormValid = () => {
    if (!email || !isValidEmail(email)) return false;
    if (mode === 'forgot') return true;
    if (!password) return false;
    if (mode === 'signup') {
      if (!passwordStrength || passwordStrength.score < 3) return false;
      if (password !== confirmPassword) return false;
    }
    return true;
  };

  // ─── Submit Handler ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isLocked || isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccessMessage(
          'Account created! A verification email has been sent. Please check your inbox.'
        );
      } else if (mode === 'signin') {
        await signIn(email, password);
        // Will auto-redirect via the useEffect above
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage(
          'Password reset email sent! Check your inbox and follow the link to reset your password.'
        );
      }

      // Reset failed attempts on success
      setFailedAttempts(0);
    } catch (err: any) {
      setErrorMessage(err.message);

      // Increment failed attempts for sign-in
      if (mode === 'signin') {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          startLockout();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Google Sign-In Handler ─────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (isLocked || isGoogleLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="auth-page">
      {/* Back Button */}
      <button className="auth-back-btn" onClick={() => navigate('/')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">PaintByNumbers.AI</div>
          <h1>
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset password'}
          </h1>
          <p>
            {mode === 'signin' && 'Sign in to continue creating amazing art'}
            {mode === 'signup' && 'Start transforming photos into paint-by-numbers'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="auth-message error" role="alert">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="auth-message success" role="status">{successMessage}</div>
        )}

        {/* Rate Limit Warning */}
        {isLocked && (
          <div className="rate-limit-warning" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Too many failed attempts. Try again in {lockoutRemaining}s
          </div>
        )}

        {/* Google Sign-In (not shown in forgot mode) */}
        {mode !== 'forgot' && (
          <>
            <button
              id="google-sign-in-btn"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLocked}
              type="button"
            >
              {isGoogleLoading ? (
                <div className="auth-spinner" />
              ) : (
                <>
                  {/* Google "G" logo SVG */}
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="auth-divider">or</div>
          </>
        )}

        {/* Email/Password Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="auth-input-group">
            <label htmlFor="auth-email">Email address</label>
            <div className="auth-input-wrapper">
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                onBlur={() => setEmailTouched(true)}
                className={emailError ? 'input-error' : ''}
                autoComplete="email"
                disabled={isLocked}
              />
            </div>
            {emailError && (
              <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {emailError}
              </span>
            )}
          </div>

          {/* Password (not shown in forgot mode) */}
          {mode !== 'forgot' && (
            <div className="auth-input-group">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min. 8 characters, mixed case' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className={passwordError ? 'input-error' : ''}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  disabled={isLocked}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Meter (sign up only) */}
              {mode === 'signup' && passwordStrength && password && (
                <div className="password-strength">
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-fill"
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <div className="strength-label">
                    <span>{passwordStrength.label}</span>
                  </div>
                  <div className="strength-checks">
                    <span className={`strength-check ${passwordStrength.checks.minLength ? 'passed' : ''}`}>
                      <span className="strength-check-icon">{passwordStrength.checks.minLength ? '✓' : '○'}</span>
                      8+ chars
                    </span>
                    <span className={`strength-check ${passwordStrength.checks.hasUppercase ? 'passed' : ''}`}>
                      <span className="strength-check-icon">{passwordStrength.checks.hasUppercase ? '✓' : '○'}</span>
                      Uppercase
                    </span>
                    <span className={`strength-check ${passwordStrength.checks.hasLowercase ? 'passed' : ''}`}>
                      <span className="strength-check-icon">{passwordStrength.checks.hasLowercase ? '✓' : '○'}</span>
                      Lowercase
                    </span>
                    <span className={`strength-check ${passwordStrength.checks.hasNumber ? 'passed' : ''}`}>
                      <span className="strength-check-icon">{passwordStrength.checks.hasNumber ? '✓' : '○'}</span>
                      Number
                    </span>
                    <span className={`strength-check ${passwordStrength.checks.hasSpecial ? 'passed' : ''}`}>
                      <span className="strength-check-icon">{passwordStrength.checks.hasSpecial ? '✓' : '○'}</span>
                      Special char
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password (sign up only) */}
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label htmlFor="auth-confirm-password">Confirm password</label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={confirmError ? 'input-error' : ''}
                  autoComplete="new-password"
                  disabled={isLocked}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmError && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {confirmError}
                </span>
              )}
            </div>
          )}

          {/* Forgot Password Link (sign in only) */}
          {mode === 'signin' && (
            <div className="auth-forgot-link">
              <button type="button" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={!isFormValid() || isSubmitting || isLocked}
          >
            {isSubmitting ? (
              <div className="auth-spinner" />
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        {/* Toggle between modes */}
        <div className="auth-toggle">
          {mode === 'signin' && (
            <>
              Don't have an account?
              <button type="button" onClick={() => setMode('signup')}>Sign up</button>
            </>
          )}
          {mode === 'signup' && (
            <>
              Already have an account?
              <button type="button" onClick={() => setMode('signin')}>Sign in</button>
            </>
          )}
          {mode === 'forgot' && (
            <>
              Remember your password?
              <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
