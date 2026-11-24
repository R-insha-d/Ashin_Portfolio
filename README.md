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

All text and data live in one JSON file: `src/content/portfolio.json`. That covers contact details, roles, education, tools, services, skills, projects and every heading and button label. Add, change or delete entries there and save; `npm run dev` reloads the page. The file follows the website from top to bottom, with a `// ==========` heading and a short explanation for each section, plus copy-paste examples in section 9.

`src/content/profile.ts` only loads and type-checks the JSON, so you don't need to edit it. If an edit breaks the expected shape (a missing field, or text where a number belongs), `npm run build` fails and names the field.

**Add the profile photo**

1. Put the photo in `public/images/`, for example `public/images/ashin-portrait.jpg`.
2. In `portfolio.json`, replace `"photo": null` with:

   ```json
   "photo": { "src": "/images/ashin-portrait.jpg", "alt": "Portrait of Ashin N", "focus": "50% 30%" }
   ```

Until a photo file exists, the About section shows a colour-bars placeholder.

**Showreel and work samples**: fill `showreel` and `projects` in the same file (examples are in section 9 of the file). The Work section, its nav link and the hero's showreel button appear only once they have content.

## Deploy

Deploys as-is to Vercel or any Node host. Set `NEXT_PUBLIC_SITE_URL` (for example `https://ashin.example.com`) so the sitemap, canonical URL and social share image use the real domain.

## Notes

- Smooth scrolling (Lenis) and animations switch off for visitors who prefer reduced motion, and when the header's REC / Standby toggle is set to Standby.
- The 3D reel loads after the page is idle on desktop, or on first interaction on touch devices. It falls back to a drawn poster when WebGL is unavailable or the device is too slow.
- The site never shows Ashin's street address; contact is email, phone / WhatsApp and LinkedIn.
