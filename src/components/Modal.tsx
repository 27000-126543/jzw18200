import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full',
          maxWidth,
          'bg-farm-surface rounded-2xl shadow-card-hover border border-farm-border/60',
          'flex flex-col max-h-[85vh] overflow-hidden',
          'transition-all duration-300 ease-out',
          'animate-fade-in'
        )}
        style={{
          animation: 'fadeIn 0.25s ease-out both, modalScaleIn 0.25s ease-out both',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-farm-border/60 shrink-0">
          <h2
            id="modal-title"
            className="text-lg font-semibold font-display text-farm-primary-dark"
          >
            {title}
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-farm-border/60 bg-farm-surface-alt/40 shrink-0">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalScaleIn {
          0% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
