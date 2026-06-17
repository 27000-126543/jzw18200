import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Sprout,
  ClipboardList,
  Bell,
  Wheat,
  Wallet,
  BarChart3,
  CloudSun,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import ToastContainer from './Toast';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/', label: '首页仪表板', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/fields', label: '地块管理', icon: <MapPin className="w-5 h-5" /> },
  { path: '/seasons', label: '种植季管理', icon: <Sprout className="w-5 h-5" /> },
  { path: '/operations', label: '农事操作', icon: <ClipboardList className="w-5 h-5" /> },
  { path: '/reminders', label: '智能提醒', icon: <Bell className="w-5 h-5" />, badge: 0 },
  { path: '/harvest', label: '收成管理', icon: <Wheat className="w-5 h-5" /> },
  { path: '/finance', label: '成本与收益', icon: <Wallet className="w-5 h-5" /> },
  { path: '/reports', label: '分析报告', icon: <BarChart3 className="w-5 h-5" /> },
  { path: '/weather', label: '气象信息', icon: <CloudSun className="w-5 h-5" /> },
];

const breadcrumbMap: Record<string, string> = {
  '/': '首页仪表板',
  '/fields': '地块管理',
  '/seasons': '种植季管理',
  '/operations': '农事操作',
  '/reminders': '智能提醒',
  '/harvest': '收成管理',
  '/finance': '成本与收益',
  '/reports': '分析报告',
  '/weather': '气象信息',
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const reminders = useAppStore((state) => state.reminders);
  const pendingCount = reminders.filter((r) => r.status === 'pending').length;

  const itemsWithBadge = navItems.map((item) =>
    item.path === '/reminders' ? { ...item, badge: pendingCount } : item
  );

  return (
    <div className="min-h-screen bg-farm-bg">
      <aside className="fixed left-0 top-0 z-40 w-64 h-screen bg-farm-surface border-r border-farm-border/60 flex flex-col">
        <div className="px-5 py-6 border-b border-farm-border/60">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌾</span>
            <div>
              <h1 className="text-xl font-display font-bold bg-gradient-to-r from-farm-primary to-farm-primary-light bg-clip-text text-transparent leading-tight">
                智慧农场
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Smart Farm System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {itemsWithBadge.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(isActive ? 'nav-item-active' : 'nav-item')}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {typeof item.badge !== undefined && item.badge > 0 && (
                  <span className="badge badge-danger shrink-0">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-farm-border/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-farm-surface-alt/60">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">农户管理员</p>
              <p className="text-xs text-gray-500 truncate">farm@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="mr-0 md:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 bg-farm-bg/80 backdrop-blur-md border-b border-farm-border/40 px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-farm-primary transition-colors">
              🌾 智慧农场
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-farm-primary font-medium">
              {breadcrumbMap[location.pathname] || '首页'}
            </span>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
