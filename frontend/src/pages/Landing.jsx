import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AuthBrandPanel } from '../components/AuthBrandPanel';
import { useApp } from '../components/AppContext';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Landing() {
  const navigate = useNavigate();
  const { login, register } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});

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

  function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (mode === 'login') {
      login(email, role, name);
    } else {
      register(name, email);
    }

    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                maxLength={PASSWORD_MAX}
                className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.password && <p className="text-[11px] text-destructive font-medium">{errors.password}</p>}
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground" htmlFor="confirm">Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  maxLength={PASSWORD_MAX}
                  className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                {errors.confirm && <p className="text-[11px] text-destructive font-medium">{errors.confirm}</p>}
              </div>
            )}

            {mode === 'login' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Sign in as</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold capitalize transition-all ${
                      role === 'student'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.9c2.79 0 5.437-.724 7.731-2.006a60.48 60.48 0 0 0-.491-6.347m-15.482 0a48.69 48.69 0 0 1 2.247-5.277m0 0a48.97 48.97 0 0 1 10.97 0m-10.97 0a49.144 49.144 0 0 1 2.247 5.277m10.97-5.277a48.967 48.967 0 0 1 2.247 5.277m0 0a48.967 48.967 0 0 1-2.247 5.277m0 0A48.624 48.624 0 0 1 12 16.5c-1.353 0-2.67-.1-3.957-.293m0 0a48.624 48.624 0 0 1-3.782-3.65" />
                    </svg>
                    student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold capitalize transition-all ${
                      role === 'admin'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.75 3.75 0 0 1 21 12z" />
                    </svg>
                    admin
                  </button>
                </div>
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