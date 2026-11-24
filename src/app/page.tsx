import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { About } from '@/components/sections/about';
import { Contact } from '@/components/sections/contact';
import { Education } from '@/components/sections/education';
import { Experience } from '@/components/sections/experience';
import { Hero } from '@/components/sections/hero';
import { Highlight } from '@/components/sections/highlight';
import { Services } from '@/components/sections/services';
import { Skills } from '@/components/sections/skills';
import { Work } from '@/components/sections/work';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { profile } from '@/content/profile';
import { buildPersonJsonLd } from '@/lib/json-ld';
import { resolvePhoto } from '@/lib/photo';

export default function Page() {
  const jsonLd = buildPersonJsonLd(resolvePhoto(profile.photo));
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Services />
        <Work />
        <Skills />
        <Experience />
        <Highlight />
        <Education />
        <Contact />
        {/* Entrance animations for every section ([data-rv] markers in the section components). */}
        <ScrollReveal />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  );
}
