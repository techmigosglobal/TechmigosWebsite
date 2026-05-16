'use client';

import React, { useState, useRef, useEffect } from 'react';

interface FormState {
  name: string;
  school: string;
  phone: string;
}

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    throw new Error('Demo request API is not configured.');
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function DemoRequestForm() {
  const [form, setForm] = useState<FormState>({ name: '', school: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.reveal').forEach((item, i) => {
              setTimeout(() => item.classList.add('active'), i * 100);
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.school.trim() || !form.phone.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    // Basic phone validation (at least 10 digits)
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/leads/demo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          school: form.school.trim(),
          phone: form.phone.trim(),
          sourcePath: '/showcase',
        }),
      });
      const result = await response
        .json()
        .catch(() => ({ ok: false, error: 'Unexpected server response.' }));

      if (!response.ok || !result.ok) {
        setError('Something went wrong. Please try again or WhatsApp us directly.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="demo"
      className="border-b border-border bg-background py-14 sm:py-20 overflow-hidden"
    >
      <div ref={sectionRef} className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="reveal">
            <p className="text-xs font-mono uppercase tracking-widest text-accent mb-3">
              Book a Demo
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              See SchoolDesk running <span className="text-accent">in your school.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
              Our team will walk you through a live demo tailored to your school size and needs — no
              slides, no sales pitch. Just the product.
            </p>
            <ul className="space-y-2.5">
              {[
                '30-minute live walkthrough',
                'Customised to your school type',
                'Free onboarding support included',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-[10px]">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form */}
          <div className="reveal rounded-2xl border border-border bg-card p-6 sm:p-8">
            {submitted ? (
              <div
                className="flex flex-col items-center justify-center gap-4 py-8 text-center"
                aria-live="polite"
              >
                <span className="text-4xl">🎉</span>
                <h3 className="text-lg font-bold text-foreground">Request Received!</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Our team will reach out within 24 hours to schedule your demo. Check WhatsApp too!
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: '', school: '', phone: '' });
                  }}
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Request a Free Demo
                </h3>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="demo-name"
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    Your Name
                  </label>
                  <input
                    id="demo-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.name}
                    onChange={handleChange}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    required
                  />
                </div>

                {/* School */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="demo-school"
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    School Name
                  </label>
                  <input
                    id="demo-school"
                    name="school"
                    type="text"
                    autoComplete="organization"
                    placeholder="e.g. Sunrise Public School"
                    value={form.school}
                    onChange={handleChange}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="demo-phone"
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    Phone / WhatsApp
                  </label>
                  <input
                    id="demo-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    required
                  />
                </div>

                {error && (
                  <p
                    className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Book My Free Demo →'
                  )}
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  No spam. We&apos;ll only contact you about your demo.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
