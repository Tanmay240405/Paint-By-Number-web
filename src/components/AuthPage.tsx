import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  checkPasswordStrength,
  isValidEmail,
  PasswordStrength,
  checkMFA,
  challengeMFA,
  verifyMFA,
} from '../services/authService';
import './AuthPage.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify-mfa';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signInWithGoogle, resetPassword, user, session } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/profile';

  // State
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  // Check if MFA is required for this session
  useEffect(() => {
    const verifyAAL = async () => {
      if (user && session && mode !== 'verify-mfa') {
        try {
          const { currentLevel, nextLevel } = await checkMFA();
          const hasMfa = user.factors && user.factors.length > 0;
          
          if (hasMfa && currentLevel === 'aal1' && nextLevel === 'aal2') {
            setMode('verify-mfa');
            const factor = user.factors?.find((f: any) => f.status === 'verified');
            if (factor) {
              setMfaFactorId(factor.id);
              challengeMFA(factor.id).then((challenge) => {
                setMfaChallengeId(challenge.id);
              }).catch(() => {
                setErrorMessage('Failed to initiate 2FA. Please try again.');
              });
            }
          } else {
            // Fully authenticated or no MFA setup
            const dest = (from === '/login' || from === '/login/') ? '/profile' : from;
            navigate(dest, { replace: true });
          }
        } catch (err) {
          console.error('Failed to check MFA level, redirecting anyway:', err);
          const dest = (from === '/login' || from === '/login/') ? '/profile' : from;
          navigate(dest, { replace: true });
        }
      }
    };
    verifyAAL();
  }, [user, session, navigate, from, mode]);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    if (mode !== 'verify-mfa') {
      setPassword('');
      setConfirmPassword('');
      setMfaCode('');
    }
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
    if (mode === 'verify-mfa') return mfaCode.length === 6;
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
      } else if (mode === 'verify-mfa') {
        await verifyMFA(mfaFactorId, mfaChallengeId, mfaCode);
        navigate(from, { replace: true });
      }

      setFailedAttempts(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');

      if (mode === 'signin' || mode === 'verify-mfa') {
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

  const handleGoogleSignIn = async () => {
    if (isLocked || isGoogleLoading) return;
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGoogleLoading(false);
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
            {mode === 'verify-mfa' && 'Two-Factor Authentication'}
          </h1>
          <p>
            {mode === 'signin' && 'Sign in to continue creating amazing art'}
            {mode === 'signup' && 'Start transforming photos into paint-by-numbers'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link"}
            {mode === 'verify-mfa' && "Enter the 6-digit code from your authenticator app"}
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

        {mode !== 'forgot' && mode !== 'verify-mfa' && (
          <>
            <button
              id="google-sign-in-btn"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLocked}
              type="button"
            >
              {isGoogleLoading ? <div className="auth-spinner" /> : (
                <>
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

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'verify-mfa' ? (
            <div className="auth-input-group">
              <label htmlFor="auth-mfa">6-Digit Code</label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-mfa"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isLocked}
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          <button id="auth-submit-btn" type="submit" className="auth-submit-btn" disabled={!isFormValid() || isSubmitting || isLocked}>
            {isSubmitting ? <div className="auth-spinner" /> : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                {mode === 'verify-mfa' && 'Verify 2FA'}
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
          {(mode === 'forgot' || mode === 'verify-mfa') && (
            <>Back to login? <button type="button" onClick={() => setMode('signin')}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
