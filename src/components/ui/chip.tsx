import { cn } from '@/lib/cn';

type ChipProps = {
  variant?: 'label' | 'tag' | 'ext' | 'amber';
  as?: 'span' | 'li';
  lang?: string;
  className?: string;
  children?: React.ReactNode;
};

const VARIANTS = {
  label: 'inline-flex h-6 items-center rounded-clip border border-rule px-2 micro-caps text-smoke',
  tag: 'inline-flex min-h-8 items-center rounded-clip border border-hairline bg-track px-3 text-small text-paper',
  ext: 'inline-flex h-6 items-center rounded-clip border border-rule bg-void px-2 font-mono text-[0.75rem] tracking-[0.02em] text-smoke',
  amber: 'inline-flex h-6 items-center rounded-clip bg-amber-wash px-2 micro-caps text-amber',
} as const;

export function Chip({ variant = 'label', as: Tag = 'span', lang, className, children }: ChipProps) {
  return (
    <Tag lang={lang} className={cn(VARIANTS[variant], className)}>
      {children}
    </Tag>
  );
}
