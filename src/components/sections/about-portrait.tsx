'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

type AboutPortraitProps = { src: string; alt: string; focus: string };

/** Dissolves in over 600ms once loaded (instant in Standby); the colour bars stay underneath until then. */
export function AboutPortrait({ src, alt, focus }: AboutPortraitProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 28vw, (min-width: 768px) 36vw, 100vw"
      className={cn(
        // 600ms = DURATION.dissolve; no matching duration token.
        'object-cover transition-opacity duration-[600ms] ease-linear stby:transition-none',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
      style={{ objectPosition: focus }}
      onLoad={() => setLoaded(true)}
    />
  );
}
