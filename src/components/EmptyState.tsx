import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  const isIconComponent =
    typeof Icon === 'function' ||
    (typeof Icon === 'object' && Icon !== null && '$$typeof' in Icon);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div
        className={cn(
          'w-24 h-24 mb-6 rounded-3xl',
          'bg-gradient-to-br from-farm-primary/10 to-farm-primary-light/10',
          'flex items-center justify-center',
          'border border-farm-primary/10'
        )}
      >
        {isIconComponent ? (
          <EmptyIcon icon={Icon} className="w-12 h-12 text-farm-primary/70" />
        ) : (
          <div className="text-5xl">{Icon}</div>
        )}
      </div>

      <h3 className="text-xl font-semibold font-display text-farm-primary-dark mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {actionText && onAction && (
        <button
          type="button"
          className="btn-primary"
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
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
