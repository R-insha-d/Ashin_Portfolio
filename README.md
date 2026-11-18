# Ashin N — portfolio

One-page portfolio for Ashin N, Video Editor & 3D Artist (Kannur, Kerala). Dark "editing suite" look with an interactive 3D film reel in the hero, an editing-timeline view of experience, and Lenis smooth scrolling.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, motion, three.js and Lenis.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Edit the content

All text, contact details, roles and education live in one file: `src/content/profile.ts`.

**Add the profile photo**

1. Put the photo in `public/images/`, for example `public/images/ashin-portrait.jpg`.
2. In `src/content/profile.ts`, replace `photo: null` with:

   ```ts
   photo: { src: '/images/ashin-portrait.jpg', alt: 'Portrait of Ashin N', focus: '50% 30%' },
   ```

Until a photo file exists, the About section shows a colour-bars placeholder.

**Showreel and work samples**: fill `showreel` and `projects` in the same file. The Work section, its nav link and the hero's showreel button appear only once they have content.

## Deploy

Deploys as-is to Vercel or any Node host. Set `NEXT_PUBLIC_SITE_URL` (for example `https://ashin.example.com`) so the sitemap, canonical URL and social share image use the real domain.

## Notes

- Smooth scrolling (Lenis) and animations switch off for visitors who prefer reduced motion, and when the header's REC / Standby toggle is set to Standby.
- The 3D reel loads after the page is idle on desktop, or on first interaction on touch devices. It falls back to a drawn poster when WebGL is unavailable or the device is too slow.
- The site never shows Ashin's street address; contact is email, phone / WhatsApp and LinkedIn.
