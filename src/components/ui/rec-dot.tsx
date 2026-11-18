import { cn } from '@/lib/cn';

/** Blinking Rec light. In Standby it becomes a steady stop square. */
export function RecDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full bg-rec shadow-glow-rec animate-blink transition-[border-radius,background-color] duration-quick stby:animate-none stby:rounded-[1px] stby:bg-ash stby:shadow-none',
        className,
      )}
    />
  );
}
