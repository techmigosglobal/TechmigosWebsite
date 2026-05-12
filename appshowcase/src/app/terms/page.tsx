import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export const metadata = {
  title: 'Terms of Service — SchoolDesk',
  description:
    'Terms of Service for SchoolDesk by Techmigos. Read our terms before using the platform.',
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: April 2026 &nbsp;·&nbsp; Effective: April 2026
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using SchoolDesk (&quot;the Platform&quot;), operated by Techmigos
              (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you agree to be bound by these
              Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do
              not use the Platform. These Terms apply to all users including school administrators,
              teachers, parents, and any other individuals accessing the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SchoolDesk is a cloud-based school management platform that provides tools for
              attendance tracking, fee management, academic records, parent communication, and
              administrative operations. We reserve the right to modify, suspend, or discontinue any
              aspect of the Platform at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">
              3. Account Registration and Security
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                You must provide accurate, complete, and current information when creating an
                account.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of your login credentials.
              </li>
              <li>
                You must notify us immediately of any unauthorized use of your account at{' '}
                <a href="mailto:info@techmigos.com" className="text-accent hover:underline">
                  info@techmigos.com
                </a>
                .
              </li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>Accounts are non-transferable without our prior written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Use the Platform for any unlawful purpose or in violation of any applicable laws or
                regulations
              </li>
              <li>Upload or transmit any harmful, offensive, or inappropriate content</li>
              <li>
                Attempt to gain unauthorized access to any part of the Platform or its related
                systems
              </li>
              <li>Interfere with or disrupt the integrity or performance of the Platform</li>
              <li>
                Collect or harvest any personally identifiable information from the Platform without
                authorization
              </li>
              <li>Use the Platform to send unsolicited communications (spam)</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Platform is also governed by our{' '}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. Schools acting as data
              controllers are responsible for ensuring they have appropriate legal bases for
              processing student and parent data through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Subscription and Payments</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access to certain features requires a paid subscription.</li>
              <li>Subscription fees are billed in advance on a monthly or annual basis.</li>
              <li>
                All fees are non-refundable except as required by applicable law or as expressly
                stated in our refund policy.
              </li>
              <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
              <li>Failure to pay may result in suspension or termination of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform, including its design, features, code, and content, is owned by Techmigos
              and protected by intellectual property laws. You are granted a limited, non-exclusive,
              non-transferable license to use the Platform solely for its intended purpose. You
              retain ownership of all data you upload to the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">
              8. Uptime and Service Availability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain 99.9% platform uptime. However, we do not guarantee
              uninterrupted access and are not liable for downtime caused by factors outside our
              reasonable control, including internet outages, third-party service failures, or
              scheduled maintenance. We will provide advance notice of planned maintenance where
              possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by applicable law, Techmigos shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages, including loss
              of data, revenue, or profits, arising from your use of or inability to use the
              Platform. Our total liability shall not exceed the amount paid by you in the 12 months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your access to the Platform at any time
              for violation of these Terms or for any other reason with reasonable notice. Upon
              termination, your right to use the Platform ceases immediately. You may request an
              export of your data within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India.
              Any disputes arising under these Terms shall be subject to the exclusive jurisdiction
              of the courts located in India.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on this page and updating the &quot;Last updated&quot; date.
              Continued use of the Platform after changes constitutes acceptance of the updated
              Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us:
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
