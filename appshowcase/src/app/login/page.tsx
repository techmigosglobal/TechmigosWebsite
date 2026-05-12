'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2 group">
              <AppLogo
                size={32}
                className="group-hover:scale-105 transition-transform duration-200"
              />
              <span className="font-bold text-base tracking-tight text-foreground">SchoolDesk</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeftIcon" size={12} />
              Back
            </Link>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
            {/* Back link (desktop) */}
            <div className="hidden lg:flex justify-end mb-6">
              <Link
                href="/"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="ArrowLeftIcon" size={12} />
                Back to site
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name="LockClosedIcon" size={22} className="text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to your admin account to manage SchoolDesk
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-foreground uppercase tracking-wider"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Icon name="EnvelopeIcon" size={15} aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@schooldesk.com"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-foreground uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Icon name="LockClosedIcon" size={15} aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                  <Icon
                    name="ExclamationCircleIcon"
                    size={14}
                    className="text-red-500 flex-shrink-0"
                  />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In to Admin
                    <Icon name="ArrowRightIcon" size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Admin access only · Not a public registration page
          </p>
        </div>
      </div>
    </div>
  );
}
