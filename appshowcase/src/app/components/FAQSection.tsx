'use client';

import React, { useState, useRef, useEffect } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Is SchoolDesk compatible with our existing systems?',
    answer:
      'Yes. SchoolDesk is designed to work alongside your current tools. We support data import from most common school management formats, and our team assists with migration so you never lose historical records.',
  },
  {
    question: 'How long does onboarding take?',
    answer:
      'Most schools are fully onboarded within 3–5 working days. Our team handles the setup, staff training, and initial data migration — so your team can focus on running the school, not configuring software.',
  },
  {
    question: 'Is there a free trial available?',
    answer:
      "We offer a guided demo session tailored to your school's size and needs. After the demo, we can set up a pilot period so your staff can experience SchoolDesk hands-on before committing.",
  },
  {
    question: 'How secure is student and parent data?',
    answer:
      'Data security is our top priority. All information is encrypted in transit and at rest, stored on secure cloud infrastructure, and access is role-based — only authorised staff can view sensitive records.',
  },
  {
    question: 'Can parents and teachers access SchoolDesk on mobile?',
    answer:
      'Absolutely. SchoolDesk is fully mobile-responsive and works on any smartphone browser. Parents receive real-time notifications, attendance updates, and fee reminders directly on their phones — no app download required.',
  },
  {
    question: 'What kind of support do you provide after launch?',
    answer:
      'Every school gets a dedicated support contact. We provide WhatsApp support, video call assistance, and regular check-ins during the first month. Ongoing support is available via chat and email with a typical response time under 4 hours.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Single IntersectionObserver just to fade-in the section — completely separate
  // from the accordion open/close logic so they never conflict.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <section
      ref={sectionRef}
      className={`bg-background py-16 sm:py-20 border-t border-border transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-2">
            Got questions?
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Everything schools typically ask before getting started with SchoolDesk.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-accent bg-card shadow-md shadow-accent/5'
                    : 'border-border bg-card hover:border-accent/40'
                }`}
              >
                {/* Question button */}
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                >
                  <span className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                    {faq.question}
                  </span>
                  {/* Animated +/× icon */}
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isOpen
                        ? 'bg-accent text-primary-foreground rotate-45'
                        : 'bg-muted text-foreground group-hover:bg-accent/10 group-hover:text-accent'
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </span>
                </button>

                {/* Answer panel — uses grid rows trick for smooth height animation */}
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          Still have questions?{' '}
          <a href="#demo" className="text-accent font-semibold hover:underline underline-offset-4">
            Book a free demo →
          </a>
        </p>
      </div>
    </section>
  );
}
