'use client';

import React, { useState, useEffect } from 'react';
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
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const [showcaseData, setShowcaseData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('feature_sections')
          .select('*')
          .eq('is_active', true)
          .order('section_order', { ascending: true });

        if (error) throw error;
        setShowcaseData(data || []);
      } catch (e) {
        console.error('Error fetching showcase sections:', e);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <ShowcaseSection initialData={showcaseData} />
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
