import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LinkButton } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ProjectOrbit } from '@/components/work/orbit/project-orbit';
import { profile } from '@/content/profile';
import { galleryProjects } from '@/lib/projects';

const pp = profile.copy.projectsPage;

export const metadata: Metadata = {
  title: pp.metaTitle,
  description: pp.metaDescription,
  alternates: { canonical: '/projects' },
  openGraph: {
    type: 'website',
    url: '/projects',
    siteName: profile.copy.meta.siteName,
    title: pp.metaTitle,
    description: pp.metaDescription,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: pp.metaTitle, description: pp.metaDescription },
};

/**
 * Every project from portfolio.json on ORBIT: a 3D ring of video screens (WebGL), with a reel
 * index, category jumps and the video player. Motion paused or no WebGL: a film-strip rail.
 */
export default function ProjectsPage() {
  const projects = galleryProjects();
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="pb-(--section-y) pt-[calc(var(--header-h)+1.25rem)]">
        <Container size="wide">
          {/* "/#top": always land on the hero, even when the home page was left scrolled down. */}
          <LinkButton href="/#top" variant="quiet" size="sm" icon={ArrowLeft}>
            {pp.back}
          </LinkButton>

          {/* Slim heading: the 3D stage is the hero of this page. */}
          <div className="mt-5 flex flex-col gap-3 md:mt-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="flex flex-col gap-3">
              <p className="label-caps flex items-center gap-3 text-ash">
                <span aria-hidden="true" className="h-px w-6 bg-amber" />
                {pp.eyebrow}
                <span aria-hidden="true">·</span>
                <span className="tc">{String(projects.length).padStart(2, '0')}</span>
              </p>
              <h1 className="wdth-115 text-feature text-balance text-paper lg:whitespace-nowrap">
                {pp.display.lead}
                <span className="cut">{pp.display.cut}</span>
              </h1>
            </div>
            <p className="max-w-[40ch] text-body text-smoke lg:pb-1 lg:text-right">{pp.intro}</p>
          </div>
        </Container>

        <div className="mt-6 md:mt-8">
          <ProjectOrbit projects={projects} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
