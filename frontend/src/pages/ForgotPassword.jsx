import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AuthBrandPanel } from '../components/AuthBrandPanel';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (email.trim().length > EMAIL_MAX) return `Email must be ${EMAIL_MAX} characters or fewer.`;
    if (!emailRe.test(email)) return 'Enter a valid email address.';
    return '';
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const err = validate();
    setError(err);
    if (err) return;

    // No backend yet — this just simulates a successful request.
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-background lg:flex-row text-foreground font-sans">
      <AuthBrandPanel
        heading="Forgot your password?"
        subtitle="No worries — we'll help you get back into your account."
      />

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:w-3/5">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your account email and we'll send you a link to reset your password.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6 p-6 sm:p-7">
              {submitted ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-foreground">
                    If an account exists for <span className="font-semibold">{email}</span>, we've sent a reset link.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (This is a placeholder — no email is actually sent yet.)
                  </p>
                  <Button className="w-full h-11 text-sm font-bold" onClick={() => navigate('/login')}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      maxLength={EMAIL_MAX}
                      className="w-full px-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                    {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-bold">
                    Send reset link
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Remembered your password?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}