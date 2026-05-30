'use client';

import React from 'react';
import Header from '../components/Header';
import Footer from '../../../src/components/Footer.astro';
import HeroSection from './components/HeroSection';
import WhatsAppButton from './components/WhatsAppButton';
import ShowcaseSection from './components/ShowcaseSection';
import StakeholderSection from './components/StakeholderSection';
import HowItWorksSection from './components/HowItWorksSection';
import FounderStripSection from './components/FounderStripSection';
import PilotSchoolBadge from './components/PilotSchoolBadge';
import DemoRequestForm from './components/DemoRequestForm';
import FAQSection from './components/FAQSection';
import CTAStripSection from './components/CTAStripSection';

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
