import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SectionId } from '@/lib/sections';
import { profile } from '@/content/profile';
import type { IconComponent } from './brand-icons';
import { SectionLink } from './section-link';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

type VisualProps = {
  variant?: Variant;
  size?: Size;
  icon?: IconComponent;
  iconEnd?: IconComponent;
  fullWidth?: boolean;
};

export type ButtonProps = VisualProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export type LinkButtonProps = VisualProps & {
  href: string;
  external?: boolean;
  download?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'download' | 'className' | 'children'>;

const BASE =
  'group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-button border font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-hover ease-standard active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-60';

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-small',
  md: 'h-11 px-5 text-small',
  lg: 'h-12 px-6 text-body',
};

const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

const VARIANTS: Record<Variant, string> = {
  primary: 'border-transparent bg-amber text-void hover:bg-amber-hi',
  secondary: 'border-edge text-paper hover:border-paper hover:bg-panel',
  quiet: 'border-transparent text-smoke hover:text-paper',
};

const BRACKET =
  'pointer-events-none absolute inset-y-2 w-1.5 border-y border-current opacity-0 transition-[opacity,transform] duration-hover ease-standard group-hover/btn:translate-x-0 group-hover/btn:opacity-100 group-focus-visible/btn:translate-x-0 group-focus-visible/btn:opacity-100';

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string }): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && 'w-full', className);
}

function ButtonInner({
  size = 'md',
  icon: Icon,
  iconEnd: IconEnd,
  children,
}: {
  size?: Size;
  icon?: IconComponent;
  iconEnd?: IconComponent;
  children?: React.ReactNode;
}) {
  const s = ICON_SIZE[size];
  return (
    <>
      <span aria-hidden="true" className={cn(BRACKET, 'left-1.5 translate-x-1 border-l')} />
      {Icon ? <Icon size={s} strokeWidth={1.5} aria-hidden="true" className="shrink-0" /> : null}
      {children}
      {IconEnd ? <IconEnd size={s} strokeWidth={1.5} aria-hidden="true" className="shrink-0" /> : null}
      <span aria-hidden="true" className={cn(BRACKET, 'right-1.5 -translate-x-1 border-r')} />
    </>
  );
}

export function Button({
  variant,
  size = 'md',
  icon,
  iconEnd,
  fullWidth,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <ButtonInner size={size} icon={icon} iconEnd={iconEnd}>
        {children}
      </ButtonInner>
    </button>
  );
}

export function LinkButton({
  variant,
  size = 'md',
  icon,
  iconEnd,
  fullWidth,
  href,
  external,
  download,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });

  if (href.startsWith('#')) {
    return (
      <SectionLink to={href.slice(1) as SectionId} className={classes} {...rest}>
        <ButtonInner size={size} icon={icon} iconEnd={iconEnd}>
          {children}
        </ButtonInner>
      </SectionLink>
    );
  }

  // Another page of this site (e.g. /projects): client-side navigation, no full reload.
  if (href.startsWith('/') && !href.startsWith('//') && !external && !download) {
    return (
      <Link href={href} className={classes} {...rest}>
        <ButtonInner size={size} icon={icon} iconEnd={iconEnd}>
          {children}
        </ButtonInner>
      </Link>
    );
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        <ButtonInner size={size} icon={icon} iconEnd={iconEnd ?? ArrowUpRight}>
          {children}
          <span className="sr-only"> {profile.copy.a11y.newTab}</span>
        </ButtonInner>
      </a>
    );
  }

  return (
    <a href={href} download={download || undefined} className={classes} {...rest}>
      <ButtonInner size={size} icon={icon} iconEnd={iconEnd}>
        {children}
      </ButtonInner>
    </a>
  );
}
