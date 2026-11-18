import { cn } from '@/lib/cn';

export function GrainOverlay({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('grain-layer absolute inset-0', className)} />;
}
