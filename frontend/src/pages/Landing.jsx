import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
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
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (mode === 'register' && name.trim().length < 2) {
      e.name = 'Please enter your full name.';
    }
    if (!email.trim()) {
      e.email = 'Email is required.';
    } else if (!emailRe.test(email)) {
      e.email = 'Enter a valid email address.';
    }
    if (!password) {
      e.password = 'Password is required.';
    } else if (password.length < 6) {
      e.password = 'Password must be at least 6 characters.';
    }
    if (mode === 'register' && confirm !== password) {
      e.confirm = 'Passwords do not match.';
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
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-card border-b lg:border-b-0 lg:border-r border-border px-8 py-10 lg:w-[46%] lg:px-14 lg:py-14">
        {/* Top bar with logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-light.png" alt="QueueSmart" className="h-9 w-9 object-contain rounded-[8px]" />
            <span className="text-lg font-extrabold tracking-tighter text-foreground">QueueSmart</span>
          </div>
        </div>

        {/* Central Brand statement */}
        <div className="my-12 max-w-md lg:my-auto">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.9c2.79 0 5.437-.724 7.731-2.006a60.48 60.48 0 0 0-.491-6.347m-15.482 0a48.69 48.69 0 0 1 2.247-5.277m0 0a48.97 48.97 0 0 1 10.97 0m-10.97 0a49.144 49.144 0 0 1 2.247 5.277m10.97-5.277a48.967 48.967 0 0 1 2.247 5.277m0 0a48.967 48.967 0 0 1-2.247 5.277m0 0A48.624 48.624 0 0 1 12 16.5c-1.353 0-2.67-.1-3.957-.293m0 0a48.624 48.624 0 0 1-3.782-3.65m5.466 5.96a48.118 48.118 0 0 0 4.545 0m-4.545 0a48.624 48.624 0 0 1-3.782-3.65m8.327 3.65a48.624 48.624 0 0 0 3.782-3.65m-7.316-6.103a48.243 48.243 0 0 0-3.327 0m0 0a48.243 48.243 0 0 0 0 6.654m0-6.654a48.337 48.337 0 0 1 3.327 0m0 0a48.337 48.337 0 0 1 0 6.654m-3.327-6.654C8.75 6.75 10.33 6 12 6c1.67 0 3.25.75 4.316 2.054m-8.632 0A48.967 48.967 0 0 1 12 9.5a48.967 48.967 0 0 1 4.316-1.446" />
            </svg>
            Student Advising Offices
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight lg:text-4xl">
            Skip the line. Know your wait. Get advised.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Join advising queues remotely, watch your position update live, and get notified the
            moment your turn is near.
          </p>

          <ul className="mt-8 space-y-4 text-sm font-medium">
            {[
              { text: "Real-time position and estimated wait times" },
              { text: "In-app alerts as your turn approaches" },
              { text: "Staff tools to manage demand and priorities" },
            ].map(({ text }, idx) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-primary">
                  {idx === 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.75 3.75 0 0 1 21 12z" />
                    </svg>
                  )}
                </span>
                <span className="text-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-xs text-muted-foreground lg:block">
          &copy; 2026 QueueSmart · University Advising Services
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to view your queues and appointments.'
                : 'Register with your student email to get started.'}
            </p>
          </div>

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
                className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.email && <p className="text-[11px] text-destructive font-medium">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

            <Button
              type="submit"
              className="w-full mt-4 h-11 text-sm font-bold"
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

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
