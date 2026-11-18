'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { announce } from '@/lib/announce';
import { profile } from '@/content/profile';
import { buttonClasses } from './button';
import { StableLabel } from './stable-label';

type CopyButtonProps = {
  value: string;
  srSuffix?: string;
  announcement: string;
  size?: 'sm' | 'md';
  className?: string;
};

type Status = 'idle' | 'done' | 'failed';

async function writeClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    /* fall back below */
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

export function CopyButton({ value, srSuffix, announcement, size = 'sm', className }: CopyButtonProps) {
  const c = profile.copy.copyButton;
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    window.clearTimeout(timer.current);
    try {
      await writeClipboard(value);
      setStatus('done');
      announce(announcement);
    } catch {
      setStatus('failed');
      announce(`${c.failed}. ${value}`);
    }
    timer.current = window.setTimeout(() => setStatus('idle'), 2000);
  };

  const Icon = status === 'done' ? Check : status === 'failed' ? X : Copy;
  const iconSize = size === 'sm' ? 16 : 18;
  const label = status === 'done' ? c.done : status === 'failed' ? c.failed : c.idle;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        size === 'sm'
          ? buttonClasses({ variant: 'quiet', size, className }).replace('border-transparent', 'border-hairline')
          : buttonClasses({ variant: 'secondary', size, className })
      }
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 left-1.5 w-1.5 translate-x-1 border-y border-l border-current opacity-0 transition-[opacity,transform] duration-hover ease-standard group-hover/btn:translate-x-0 group-hover/btn:opacity-100 group-focus-visible/btn:translate-x-0 group-focus-visible/btn:opacity-100" />
      <Icon size={iconSize} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
      <StableLabel options={[c.idle, c.done, c.failed]} value={label} />
      {srSuffix ? <span className="sr-only"> {srSuffix}</span> : null}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 right-1.5 w-1.5 -translate-x-1 border-y border-r border-current opacity-0 transition-[opacity,transform] duration-hover ease-standard group-hover/btn:translate-x-0 group-hover/btn:opacity-100 group-focus-visible/btn:translate-x-0 group-focus-visible/btn:opacity-100" />
    </button>
  );
}
