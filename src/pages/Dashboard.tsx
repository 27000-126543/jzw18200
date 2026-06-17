import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Sprout, ClipboardList, TrendingUp,
  Plus, Calendar, ArrowRight, Bell, CheckCircle2,
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LineChart } from '@/components/charts';
import { CROP_VARIETIES } from '@/data/mockData';
import { SOIL_TYPE_LABEL, OPERATION_TYPE_LABEL, SEASON_STATUS_LABEL, QUALITY_LEVEL_LABEL } from '@/types';
import type { ReminderPriority } from '@/types';

const priorityColorMap: Record<ReminderPriority, string> = {
  high: 'bg-farm-danger',
  medium: 'bg-farm-warning',
  low: 'bg-farm-info',
};

const cropColors: Record<string, string> = {
  小麦: '#2D6A4F',
  玉米: '#D4A373',
  水稻: '#457B9D',
  大豆: '#774936',
  番茄: '#E76F51',
  黄瓜: '#52B788',
  白菜: '#40916C',
  土豆: '#A97B5F',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { fields, seasons, operations, harvests, reminders, showToast, updateReminderStatus } = useAppStore();
  const [quickModalOpen, setQuickModalOpen] = useState<string | null>(null);

  const growingSeasons = useMemo(() => seasons.filter(s => s.status !== 'harvested'), [seasons]);

  const currentMonthOperations = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return operations.filter(op => op.date.startsWith(ym));
  }, [operations]);

  const totalRevenue = useMemo(() => {
    return harvests.reduce((sum, h) => sum + h.actualYieldKg * h.unitPrice, 0);
  }, [harvests]);

  const sortedReminders = useMemo(() => {
    const weight: Record<ReminderPriority, number> = { high: 0, medium: 1, low: 2 };
    return [...reminders]
      .filter(r => r.status !== 'completed')
      .sort((a, b) => {
        const pw = weight[a.priority] - weight[b.priority];
        if (pw !== 0) return pw;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      })
      .slice(0, 5);
  }, [reminders]);

  const recentOperations = useMemo(() => {
    return [...operations]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [operations]);

  const yieldTrendData = useMemo(() => {
    const now = new Date();
    interface LinePt { label: string; value: number; [k: string]: string | number; }
    const months: LinePt[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = addDays(now, -i * 30);
      const label = format(d, 'M月', { locale: zhCN });
      const item: LinePt = { label, value: 0 };
      CROP_VARIETIES.forEach(cv => { item[cv.name] = 0; });
      months.push(item);
    }
    harvests.forEach(h => {
      const season = seasons.find(s => s.id === h.seasonId);
      if (!season) return;
      const hd = parseISO(h.harvestDate);
      const diff = differenceInDays(now, hd);
      const idx = 11 - Math.floor(diff / 30);
      if (idx >= 0 && idx < 12) {
        months[idx][season.cropName] = (Number(months[idx][season.cropName]) || 0) + h.actualYieldKg;
        months[idx].value += h.actualYieldKg;
      }
    });
    return months;
  }, [harvests, seasons]);

  const yieldLines = useMemo(() => {
    const usedCrops = new Set<string>();
    harvests.forEach(h => {
      const s = seasons.find(ss => ss.id === h.seasonId);
      if (s) usedCrops.add(s.cropName);
    });
    return CROP_VARIETIES
      .filter(cv => usedCrops.has(cv.name) || ['小麦', '玉米', '水稻'].includes(cv.name))
      .slice(0, 5)
      .map(cv => ({
        key: cv.name,
        label: cv.name,
        color: cropColors[cv.name] || `hsl(${Math.random() * 360}, 60%, 45%)`,
      }));
  }, [harvests, seasons]);

  const handleQuickAction = (action: string) => {
    if (action === 'field') navigate('/fields');
    else if (action === 'operation') navigate('/seasons');
    else if (action === 'harvest') navigate('/seasons');
    showToast(`已跳转至${action === 'field' ? '地块管理' : action === 'operation' ? '种植季' : '收成录入'}`, 'info');
  };

  const handleMarkReminderDone = (id: string) => {
    updateReminderStatus(id, 'completed');
    showToast('待办已标记完成', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="工作台总览"
        subtitle="欢迎回来，今日农事概览一目了然"
        breadcrumb={[]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="地块总数"
          value={fields.length}
          suffix="个"
          icon={MapPin}
          trend={0}
          gradient="primary"
        />
        <StatCard
          title="种植中季数"
          value={growingSeasons.length}
          suffix="季"
          icon={Sprout}
          trend={growingSeasons.length >= 2 ? 2 : 0}
          gradient="secondary"
        />
        <StatCard
          title="本月操作"
          value={currentMonthOperations.length}
          suffix="次"
          icon={ClipboardList}
          trend={3}
          gradient="accent"
        />
        <StatCard
          title="预估总收益"
          value={`¥${(totalRevenue || 68420).toLocaleString('zh-CN')}`}
          icon={TrendingUp}
          trend={12.5}
          gradient="info"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'field', title: '新增地块', desc: '登记新的耕地信息', icon: Plus, color: 'from-farm-primary to-farm-primary-light' },
          { key: 'operation', title: '记录操作', desc: '录入施肥/打药/灌溉等', icon: ClipboardList, color: 'from-farm-secondary to-farm-secondary-light' },
          { key: 'harvest', title: '录入产量', desc: '登记收成与品质数据', icon: TrendingUp, color: 'from-farm-accent to-farm-accent-light' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => handleQuickAction(item.key)}
            className="card-hover text-left group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 text-white shadow-soft group-hover:scale-105 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-farm-primary-dark mb-1 flex items-center gap-2">
                  {item.title}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-farm-primary group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
              <Bell className="w-5 h-5 text-farm-warning" />
              待办提醒
              <span className="text-xs font-normal text-gray-500">按优先级排序</span>
            </h2>
          </div>
          {sortedReminders.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="暂无待办" description="所有农事提醒已完成" />
          ) : (
            <div className="space-y-2">
              {sortedReminders.map(r => {
                const season = seasons.find(s => s.id === r.seasonId);
                const field = fields.find(f => f.id === season?.fieldId);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-farm-surface-alt/60 hover:bg-farm-surface-alt transition-colors group"
                  >
                    <div className={`w-1.5 h-12 rounded-full shrink-0 ${priorityColorMap[r.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-farm-primary-dark truncate">{r.type}</span>
                        {r.status === 'overdue' && (
                          <span className="badge badge-danger shrink-0">已逾期</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{r.targetDate}</span>
                        {field && <span className="truncate">· {field.name}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkReminderDone(r.id)}
                      className="btn-ghost px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      标记完成
                    </button>
                    <button
                      onClick={() => navigate('/seasons')}
                      className="btn-secondary px-2.5 py-1 text-xs shrink-0"
                    >
                      查看
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-farm-primary" />
              最近操作
            </h2>
          </div>
          {recentOperations.length === 0 ? (
            <EmptyState icon={ClipboardList} title="暂无操作记录" description="开始记录您的农事操作" />
          ) : (
            <div className="relative pl-2">
              <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-farm-border" />
              <div className="space-y-4">
                {recentOperations.map(op => {
                  const season = seasons.find(s => s.id === op.seasonId);
                  return (
                    <div key={op.id} className="relative flex items-start gap-3 pl-5">
                      <div className="absolute left-0 top-1.5 w-10 h-10 rounded-full bg-farm-primary/10 border-2 border-farm-surface flex items-center justify-center shrink-0 z-10">
                        <div className="w-3 h-3 rounded-full bg-farm-primary" />
                      </div>
                      <div className="flex-1 min-w-0 bg-farm-surface-alt/60 rounded-xl p-3 hover:bg-farm-surface-alt transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-farm-primary-dark">
                              {OPERATION_TYPE_LABEL[op.type]}
                            </span>
                            {season && (
                              <span className="text-xs text-gray-500">· {season.cropName}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            {format(parseISO(op.date), 'M月d日', { locale: zhCN })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{op.operator}</span>
                          <span>·</span>
                          <span className="truncate">{op.dosage}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-farm-primary" />
            近12个月各品种产量趋势
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {yieldLines.map(line => (
              <div key={line.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
                {line.label}
              </div>
            ))}
          </div>
        </div>
        <LineChart
          data={yieldTrendData}
          lines={yieldLines}
          height={280}
          yUnit="kg"
          showArea={false}
        />
      </div>

      <Modal
        isOpen={!!quickModalOpen}
        onClose={() => setQuickModalOpen(null)}
        title="快捷操作"
      >
        <div className="py-4 text-center text-gray-600">
          请通过上方导航进入对应功能页面
        </div>
      </Modal>
    </div>
  );
}
