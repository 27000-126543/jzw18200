import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in-up">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-4 text-sm" aria-label="breadcrumb">
          <Link
            to="/"
            className="flex items-center gap-1 text-gray-500 hover:text-farm-primary transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>首页</span>
          </Link>
          {breadcrumb.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {index === breadcrumb.length - 1 ? (
                <span className="text-farm-primary font-medium">{item}</span>
              ) : (
                <span className="text-gray-500">{item}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-farm-primary-dark mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-base text-gray-500 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
