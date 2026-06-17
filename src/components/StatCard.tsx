import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

type GradientType = 'primary' | 'secondary' | 'accent' | 'info' | 'warning';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon | ReactNode;
  trend?: number;
  gradient?: GradientType;
  suffix?: string;
}

const gradientMap: Record<GradientType, string> = {
  primary: 'bg-gradient-primary',
  secondary: 'bg-gradient-secondary',
  accent: 'bg-gradient-accent',
  info: 'bg-gradient-to-br from-farm-info to-blue-500',
  warning: 'bg-gradient-to-br from-farm-warning to-amber-500',
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient = 'primary',
  suffix,
}: StatCardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;
  const isIconComponent =
    typeof Icon === 'function' ||
    (typeof Icon === 'object' && Icon !== null && '$$typeof' in Icon);

  return (
    <div className={cn('stat-card', gradientMap[gradient])}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white/80 text-sm font-medium">{title}</h3>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            {isIconComponent ? (
              <IconComponent icon={Icon} className="w-6 h-6 text-white" />
            ) : (
              <span className="text-2xl">{Icon as ReactNode}</span>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            {value}
          </span>
          {suffix && (
            <span className="text-lg font-medium text-white/70">{suffix}</span>
          )}
        </div>

        {typeof trend === 'number' && (
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold',
                'bg-white/20 text-white'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{isPositive ? '+' : ''}{trend}%</span>
            </div>
            <span className="text-xs text-white/60">同比变化</span>
          </div>
        )}
      </div>

      <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 pointer-events-none">
        {isIconComponent ? (
          <IconComponent icon={Icon} className="w-full h-full text-white" strokeWidth={1.2} />
        ) : null}
      </div>
    </div>
  );
}

function IconComponent({
  icon,
  className,
  strokeWidth,
}: {
  icon: LucideIcon | ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  const IconTag = icon as LucideIcon;
  if (strokeWidth !== undefined) {
    return <IconTag className={className} strokeWidth={strokeWidth} />;
  }
  return <IconTag className={className} />;
}
