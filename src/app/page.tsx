import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { MenuSpotlight } from "@/components/landing/menu-spotlight";
import { FinalCta, SiteFooter } from "@/components/landing/final-cta";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <MenuSpotlight />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
