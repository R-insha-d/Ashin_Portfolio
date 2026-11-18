import { profile, type Photo } from '@/content/profile';
import { SITE_URL, absoluteUrl } from '@/lib/site';

/** schema.org Person built from CV facts in `profile` only. No street address, no nationality, no worksFor. */
export function buildPersonJsonLd(photo: Photo | null) {
  const diploma = profile.education.find((e) => e.id === 'diploma');
  const disciplines = profile.skillGroups.map((g) => g.title);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    description: profile.copy.meta.description,
    url: `${SITE_URL}/`,
    email: profile.contact.email,
    telephone: profile.contact.phone.e164,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.locality,
      addressRegion: profile.location.region,
      addressCountry: profile.location.countryCode,
    },
    sameAs: [profile.contact.linkedin.href],
    knowsLanguage: profile.languages.map((l) => l.name),
    knowsAbout: [...profile.tools.map((t) => t.name), ...disciplines, ...profile.otherSkills],
    ...(diploma
      ? {
          alumniOf: {
            '@type': 'EducationalOrganization',
            name: diploma.institution,
            ...(diploma.place ? { address: { '@type': 'PostalAddress', addressLocality: diploma.place } } : {}),
          },
          hasCredential: {
            '@type': 'EducationalOccupationalCredential',
            credentialCategory: 'Diploma',
            name: diploma.qualification,
          },
        }
      : {}),
    ...(photo ? { image: absoluteUrl(photo.src) } : {}),
  };
}
