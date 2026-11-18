import { cn } from '@/lib/cn';
import { formatTimecode } from '@/lib/timecode';

type TimecodeProps = { frames: number; decorative?: boolean; className?: string };

/** Static timecode readout. Live timecodes write `textContent` through refs instead. */
export function Timecode({ frames, decorative = true, className }: TimecodeProps) {
  return (
    <span aria-hidden={decorative || undefined} className={cn('tc tc-fixed', className)}>
      {formatTimecode(frames)}
    </span>
  );
}
