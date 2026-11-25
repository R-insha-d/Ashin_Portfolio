'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

type MonogramPhotoProps = { src: string; fallback: ReactNode };

/** Face crop inside the monogram's corner brackets; the initials come back if the file fails to load. */
export function MonogramPhoto({ src, fallback }: MonogramPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return (
    <span className="absolute inset-[5px] overflow-hidden rounded-[3px] bg-panel">
      <Image src={src} alt="" fill sizes="34px" className="object-cover" onError={() => setFailed(true)} />
    </span>
  );
}
