import { cn } from '@/lib/cn';

type StableLabelProps = { options: readonly string[]; value: string; className?: string };

/** Stacks every option in one grid cell so the width is always the widest option. */
export function StableLabel({ options, value, className }: StableLabelProps) {
  return (
    <span className={cn('inline-grid', className)}>
      {options.map((option) => (
        <span key={option} className={cn('col-start-1 row-start-1', option !== value && 'invisible')}>
          {option}
        </span>
      ))}
    </span>
  );
}
