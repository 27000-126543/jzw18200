import { useEffect } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
}: ConfirmDialogProps) {
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

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : AlertCircle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full max-w-md bg-farm-surface rounded-2xl shadow-card-hover',
          'border border-farm-border/60 p-6 animate-fade-in'
        )}
        style={{
          animation: 'fadeIn 0.25s ease-out both, modalScaleIn 0.25s ease-out both',
        }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className={cn(
              'w-12 h-12 rounded-xl shrink-0 flex items-center justify-center',
              isDanger
                ? 'bg-farm-danger/15 text-farm-danger'
                : 'bg-farm-primary/15 text-farm-primary'
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3
              id="confirm-title"
              className="text-lg font-semibold font-display text-farm-primary-dark mb-1"
            >
              {title}
            </h3>
            <p
              id="confirm-message"
              className="text-sm text-gray-600 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(isDanger ? 'btn-danger' : 'btn-primary')}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
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
