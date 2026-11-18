import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { Preloader } from '@/components/preloader/preloader';
import { Providers } from '@/components/ui/providers';
import { profile } from '@/content/profile';
import { MOTION_BOOT_SCRIPT } from '@/lib/motion-boot';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],              // wght 100–900 is included automatically; wdth 62–125
  display: 'swap',
  variable: '--font-archivo',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],          // variable wght 100–800
  display: 'swap',
  variable: '--font-jetbrains-mono',
  preload: false,
});

const { meta } = profile.copy;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: meta.title,
  description: meta.description,
  applicationName: meta.siteName,
  authors: [{ name: profile.name, url: profile.contact.linkedin.href }],
  creator: profile.name,
  keywords: [...meta.keywords],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: meta.siteName,
    title: meta.title,
    description: meta.description,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: meta.title, description: meta.description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en-IN"
      className={`${archivo.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      </head>
      <body>
        <Preloader />
        <Providers>{children}</Providers>
        <div id="announcer" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
