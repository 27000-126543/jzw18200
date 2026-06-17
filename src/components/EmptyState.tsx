import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  variant?: 'empty' | 'no-match';
  onClearFilter?: () => void;
  size?: 'sm' | 'md';
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  variant = 'empty',
  onClearFilter,
  size = 'md',
}: EmptyStateProps) {
  const isIconComponent = (icon: LucideIcon | ReactNode): icon is LucideIcon =>
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon);

  const displayIcon = variant === 'no-match' ? SearchX : Icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        size === 'sm' ? 'py-8 px-4' : 'py-16 px-6'
      )}
    >
      <div
        className={cn(
          'rounded-3xl flex items-center justify-center border',
          size === 'sm' ? 'w-16 h-16 mb-4' : 'w-24 h-24 mb-6',
          variant === 'no-match'
            ? 'bg-gradient-to-br from-gray-100 to-gray-50 border-gray-200'
            : 'bg-gradient-to-br from-farm-primary/10 to-farm-primary-light/10 border-farm-primary/10'
        )}
      >
        {isIconComponent(displayIcon) ? (
          <EmptyIcon
            icon={displayIcon}
            className={cn(
              size === 'sm' ? 'w-7 h-7' : 'w-12 h-12',
              variant === 'no-match' ? 'text-gray-400' : 'text-farm-primary/70'
            )}
          />
        ) : (
          <div className={size === 'sm' ? 'text-3xl' : 'text-5xl'}>{displayIcon}</div>
        )}
      </div>

      <h3
        className={cn(
          'font-semibold font-display',
          size === 'sm' ? 'text-base mb-1' : 'text-xl mb-2',
          variant === 'no-match' ? 'text-gray-600' : 'text-farm-primary-dark'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-sm text-gray-500 max-w-sm leading-relaxed',
            size === 'sm' ? 'mb-4' : 'mb-6'
          )}
        >
          {description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {actionText && onAction && (
          <button type="button" className="btn-primary" onClick={onAction}>
            {actionText}
          </button>
        )}
        {variant === 'no-match' && onClearFilter && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onClearFilter}
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyIcon({
  icon,
  className,
}: {
  icon: LucideIcon | ReactNode;
  className?: string;
}) {
  const Tag = icon as LucideIcon;
  return <Tag className={className} />;
}
