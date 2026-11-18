import { cn } from '@/lib/cn';

type ContainerProps = {
  as?: 'div' | 'header' | 'footer' | 'nav';
  size?: 'page' | 'wide';
  className?: string;
  children?: React.ReactNode;
};

export function Container({ as: Tag = 'div', size = 'page', className, children }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-(--gutter)', size === 'wide' ? 'max-w-wide' : 'max-w-page', className)}>
      {children}
    </Tag>
  );
}
