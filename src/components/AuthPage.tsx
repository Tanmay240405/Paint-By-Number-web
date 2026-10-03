import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  checkPasswordStrength,
  isValidEmail,
  PasswordStrength,
} from '../services/authService';
import './AuthPage.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

type AuthMode = 'signin' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, resetPassword, user, session } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/profile';

  // State
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (mode === 'signup' && password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password, mode]);

  // Redirect if logged in
  useEffect(() => {
    if (user && session) {
      const dest = (from === '/login' || from === '/login/') ? '/profile' : from;
      navigate(dest, { replace: true });
    }
  }, [user, session, navigate, from]);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || isLocked || isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccessMessage('Account created! Please check your email to verify your account.');
      } else if (mode === 'signin') {
        await signIn(email, password);
        // Effects will catch the session and check MFA or redirect
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage('Password reset email sent!');
      }

      setFailedAttempts(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');

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


  return (
    <div className="auth-page">
      <button className="auth-back-btn" onClick={() => navigate('/')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="auth-card">
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

        {errorMessage && <div className="auth-message error" role="alert">{errorMessage}</div>}
        {successMessage && <div className="auth-message success" role="status">{successMessage}</div>}

        {isLocked && (
          <div className="rate-limit-warning" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Too many failed attempts. Try again in {lockoutRemaining}s
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                {emailError && <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{emailError}</span>}
              </div>

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
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {mode === 'signup' && passwordStrength && password && (
                    <div className="password-strength">
                      <div className="strength-bar-track">
                        <div className="strength-bar-fill" style={{ width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: passwordStrength.color }} />
                      </div>
                      <div className="strength-label"><span>{passwordStrength.label}</span></div>
                    </div>
                  )}
                </div>
              )}

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
                  </div>
                  {confirmError && <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{confirmError}</span>}
                </div>
              )}

              {mode === 'signin' && (
                <div className="auth-forgot-link">
                  <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>
                </div>
              )}

          <button id="auth-submit-btn" type="submit" className="auth-submit-btn" disabled={!isFormValid() || isSubmitting || isLocked}>
            {isSubmitting ? <div className="auth-spinner" /> : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'signin' && (
            <>Don't have an account? <button type="button" onClick={() => setMode('signup')}>Sign up</button></>
          )}
          {mode === 'signup' && (
            <>Already have an account? <button type="button" onClick={() => setMode('signin')}>Sign in</button></>
          )}
          {mode === 'forgot' && (
            <>Back to login? <button type="button" onClick={() => setMode('signin')}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
