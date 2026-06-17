import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ToastType } from '../types';
import { cn } from '../lib/utils';

const toastConfig: Record<ToastType, { bg: string; border: string; iconBg: string; icon: typeof CheckCircle2 }> = {
  success: {
    bg: 'bg-farm-success/15',
    border: 'border-farm-success/40',
    iconBg: 'bg-farm-success text-white',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-farm-warning/15',
    border: 'border-farm-warning/40',
    iconBg: 'bg-farm-warning text-white',
    icon: AlertCircle,
  },
  error: {
    bg: 'bg-farm-danger/15',
    border: 'border-farm-danger/40',
    iconBg: 'bg-farm-danger text-white',
    icon: XCircle,
  },
  info: {
    bg: 'bg-farm-info/15',
    border: 'border-farm-info/40',
    iconBg: 'bg-farm-info text-white',
    icon: Info,
  },
};

export default function ToastContainer() {
  const toast = useAppStore((state) => state.toast);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      setFadeOut(false);

      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 3000);

      const removeTimer = setTimeout(() => {
        setVisible(false);
      }, 3500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [toast]);

  if (!toast || !visible) return null;

  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-[100] w-full max-w-sm pointer-events-none">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl shadow-card-hover backdrop-blur-sm border transition-all duration-500 ease-out',
          config.bg,
          config.border,
          fadeOut ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'
        )}
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-medium text-gray-800">{toast.message}</p>
        </div>
        <button
          type="button"
          className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 transition-colors"
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => setVisible(false), 500);
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
