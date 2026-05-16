'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/app/components/HeroSection';
import WhatsAppButton from '@/app/components/WhatsAppButton';
import ShowcaseSection from '@/app/components/ShowcaseSection';
import StakeholderSection from '@/app/components/StakeholderSection';
import HowItWorksSection from '@/app/components/HowItWorksSection';
import FounderStripSection from '@/app/components/FounderStripSection';
import PilotSchoolBadge from '@/app/components/PilotSchoolBadge';
import DemoRequestForm from '@/app/components/DemoRequestForm';
import FAQSection from '@/app/components/FAQSection';
import CTAStripSection from '@/app/components/CTAStripSection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <ShowcaseSection />
      <HowItWorksSection />
      <StakeholderSection />
      <PilotSchoolBadge />
      <FounderStripSection />
      <DemoRequestForm />
      <FAQSection />
      <CTAStripSection />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
