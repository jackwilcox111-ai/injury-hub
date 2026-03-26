import { PublicLayout } from '@/components/layout/PublicLayout';
import { HeroSection } from '@/components/landing/HeroSection';
import { MissionBanner } from '@/components/landing/MissionBanner';
import { TrustBar } from '@/components/landing/TrustBar';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ForProvidersSection } from '@/components/landing/ForProvidersSection';
import { ForAttorneysSection } from '@/components/landing/ForAttorneysSection';
import { ForFundersSection } from '@/components/landing/ForFundersSection';
import { CtaSection } from '@/components/landing/CtaSection';

export default function LandingPage() {
  return (
    <PublicLayout>
      <HeroSection />
      <TrustBar />
      <MissionBanner />
      <HowItWorksSection />
      <ForProvidersSection />
      <ForAttorneysSection />
      <ForFundersSection />
      <CtaSection />
    </PublicLayout>
  );
}
