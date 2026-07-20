import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AuthBrandPanel } from '../components/AuthBrandPanel';
import { useApp } from '../components/AppContext';
import { Eye, EyeOff } from 'lucide-react';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Landing() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, user, authLoading } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  const NAME_MAX = 100;
  const EMAIL_MAX = 254;
  const PASSWORD_MIN = 8;
  const PASSWORD_MAX = 64;

  function validate() {
    const e = {};

    if (mode === 'register') {
      if (!name.trim()) {
        e.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        e.name = 'Please enter your full name.';
      } else if (name.trim().length > NAME_MAX) {
        e.name = `Name must be ${NAME_MAX} characters or fewer.`;
      }
    }

    if (!email.trim()) {
      e.email = 'Email is required.';
    } else if (email.trim().length > EMAIL_MAX) {
      e.email = `Email must be ${EMAIL_MAX} characters or fewer.`;
    } else if (!emailRe.test(email)) {
      e.email = 'Enter a valid email address.';
    }

    if (!password) {
      e.password = 'Password is required.';
    } else if (password.length < PASSWORD_MIN) {
      e.password = `Password must be at least ${PASSWORD_MIN} characters.`;
    } else if (password.length > PASSWORD_MAX) {
      e.password = `Password must be ${PASSWORD_MAX} characters or fewer.`;
    }

    if (mode === 'register') {
      if (!confirm) {
        e.confirm = 'Please confirm your password.';
      } else if (confirm !== password) {
        e.confirm = 'Passwords do not match.';
      }
    }

    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setErrors({ email: err.message });
    }
  }

  async function handleGoogleLogin() {
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrors({ email: err.message });
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-background lg:flex-row text-foreground font-sans">
      <AuthBrandPanel />

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:w-3/5">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to join a queue.'
                : 'Register with your university email to get started.'}
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6 p-6 sm:p-7">
              {/* Mode toggle tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                  }}
                  className={`h-9 rounded-lg text-xs font-bold capitalize transition-all ${
                    mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrors({});
                  }}
                  className={`h-9 rounded-lg text-xs font-bold capitalize transition-all ${
                    mode === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground" htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Alvarez"
                  maxLength={NAME_MAX}
                  className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                maxLength={EMAIL_MAX}
                className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.email && <p className="text-[11px] text-destructive font-medium">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground" htmlFor="password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  maxLength={PASSWORD_MAX}
                  className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-destructive font-medium">{errors.password}</p>}
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground" htmlFor="confirm">Confirm password</label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    maxLength={PASSWORD_MAX}
                    className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-[11px] text-destructive font-medium">{errors.confirm}</p>}
              </div>
            )}

            {mode === 'register' && (
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 size-3.5 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                />
                <span>
                  I agree to the{' '}
                  <button type="button" onClick={() => navigate('/terms')} className="font-semibold text-primary hover:underline">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" onClick={() => navigate('/privacy')} className="font-semibold text-primary hover:underline">
                    Privacy Policy
                  </button>
                </span>
              </label>
            )}

            <Button
              type="submit"
              className="w-full mt-4 h-11 text-sm font-bold"
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>

            <div className="relative mt-6 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-11 text-sm font-bold bg-white text-black border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google
            </button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === 'login' ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrors({});
              }}
              className="font-bold text-primary hover:underline"
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}