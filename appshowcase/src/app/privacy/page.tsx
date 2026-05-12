import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export const metadata = {
  title: 'Privacy Policy — SchoolDesk',
  description:
    'Privacy Policy for SchoolDesk by Techmigos. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <AppLogo size={28} className="group-hover:scale-105 transition-transform duration-200" />
          <span className="font-bold text-sm tracking-tight text-foreground">SchoolDesk</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* Title */}
        <div className="mb-10">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-3">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: April 2026 &nbsp;·&nbsp; Effective: April 2026
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Techmigos (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates SchoolDesk, a
              school management platform. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform. By accessing or
              using SchoolDesk, you agree to the terms of this Privacy Policy.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              If you have questions or concerns, please contact us at{' '}
              <a href="mailto:info@techmigos.com" className="text-accent hover:underline">
                info@techmigos.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account Information:</strong> Name, email
                address, and password when you register or log in.
              </li>
              <li>
                <strong className="text-foreground">School Data:</strong> Student records,
                attendance data, fee information, and academic records entered by school
                administrators and teachers.
              </li>
              <li>
                <strong className="text-foreground">Usage Data:</strong> Log files, IP addresses,
                browser type, pages visited, and time spent on the platform.
              </li>
              <li>
                <strong className="text-foreground">Device Information:</strong> Device type,
                operating system, and unique device identifiers.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> Messages sent through
                the platform between teachers, parents, and administrators.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Provide, operate, and maintain the SchoolDesk platform</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative notifications, updates, and security alerts</li>
              <li>Respond to comments, questions, and requests for customer support</li>
              <li>Monitor and analyze usage patterns to improve the platform</li>
              <li>
                Detect, investigate, and prevent fraudulent transactions and other illegal
                activities
              </li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">
              4. Data Sharing and Disclosure
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We do not sell, trade, or rent your personal information to third parties. We may
              share information in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">Service Providers:</strong> Trusted third-party
                vendors who assist in operating our platform (e.g., cloud hosting, payment
                processing), bound by confidentiality agreements.
              </li>
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> When required by
                law, court order, or governmental authority.
              </li>
              <li>
                <strong className="text-foreground">Business Transfers:</strong> In connection with
                a merger, acquisition, or sale of assets, with prior notice to users.
              </li>
              <li>
                <strong className="text-foreground">With Your Consent:</strong> For any other
                purpose with your explicit consent.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including SSL/TLS encryption,
              role-based access controls, automated cloud backups, and OTP-based verification to
              protect your data. However, no method of transmission over the internet is 100%
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to
              provide services. School data is retained for the duration of the subscription and for
              a reasonable period thereafter for legal and audit purposes. You may request deletion
              of your data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              SchoolDesk is designed for use by educational institutions. Student data is collected
              and managed by the school (the data controller). We process student data only on
              behalf of the school and in accordance with their instructions. Schools are
              responsible for obtaining appropriate consents from parents or guardians as required
              by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@techmigos.com" className="text-accent hover:underline">
                info@techmigos.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on
              SchoolDesk. Essential cookies are required for the platform to function. You can
              control non-essential cookies through your browser settings. Disabling cookies may
              affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page and updating the &quot;Last
              updated&quot; date. Continued use of SchoolDesk after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please
              contact us:
            </p>
            <div className="mt-3 p-4 rounded-xl border border-border bg-secondary/30">
              <p className="text-sm font-semibold text-foreground">Techmigos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Email:{' '}
                <a href="mailto:info@techmigos.com" className="text-accent hover:underline">
                  info@techmigos.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 SchoolDesk by Techmigos ·{' '}
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
