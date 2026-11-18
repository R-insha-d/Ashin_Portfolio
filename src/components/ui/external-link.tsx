import { ArrowUpRight } from 'lucide-react';
import { profile } from '@/content/profile';

type ExternalLinkProps = {
  href: string;
  showIcon?: boolean;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>;

export function ExternalLink({ href, showIcon = true, children, ...rest }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      {showIcon ? <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" /> : null}
      <span className="sr-only"> {profile.copy.a11y.newTab}</span>
    </a>
  );
}
