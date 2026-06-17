import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { CROP_VARIETIES } from '@/data/mockData';
import {
  REMINDER_PRIORITY_LABEL,
  OPERATION_TYPE_EMOJI,
  type ReminderStatus,
  type ReminderPriority,
  type CropVariety,
} from '@/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Settings,
  Bell,
  Check,
  ArrowRight,
  AlertTriangle,
  Clock,
  MapPin,
  Leaf,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabKey = 'all' | 'pending' | 'completed' | 'overdue';

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待办' },
  { key: 'completed', label: '已完成' },
  { key: 'overdue', label: '逾期' },
];

export default function Reminders() {
  const reminders = useAppStore((s) => s.reminders);
  const seasons = useAppStore((s) => s.seasons);
  const fields = useAppStore((s) => s.fields);
  const updateReminderStatus = useAppStore((s) => s.updateReminderStatus);
  const showToast = useAppStore((s) => s.showToast);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cropVarieties, setCropVarieties] = useState<CropVariety[]>(CROP_VARIETIES);
  const [advanceDays, setAdvanceDays] = useState(2);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey | null;
    if (tabFromUrl && ['all', 'pending', 'completed', 'overdue'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    const seasonFromUrl = searchParams.get('season');
    if (seasonFromUrl) setSeasonFilter(seasonFromUrl);
  }, [searchParams]);

  const today = useMemo(() => new Date(), []);

  const getDaysInfo = (targetDate: string, status: ReminderStatus) => {
    if (status === 'completed') {
      return { label: '已完成', color: 'bg-farm-success/15 text-farm-success border-farm-success/30' };
    }
    const diff = differenceInDays(parseISO(targetDate), today);
    if (diff < 0) {
      return {
        label: `逾期${Math.abs(diff)}天`,
        color: 'bg-farm-danger/15 text-farm-danger border-farm-danger/30 animate-pulse-soft',
      };
    }
    if (diff === 0) {
      return { label: '今天', color: 'bg-farm-warning/15 text-farm-warning border-farm-warning/30' };
    }
    if (diff <= 3) {
      return { label: `${diff}天后`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: `${diff}天后`, color: 'bg-farm-success/15 text-farm-primary-dark border-farm-success/30' };
  };

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (seasonFilter !== 'all' && r.seasonId !== seasonFilter) return false;
      if (activeTab === 'all') return true;
      if (activeTab === 'overdue') {
        const diff = differenceInDays(parseISO(r.targetDate), today);
        return diff < 0 && r.status !== 'completed';
      }
      if (activeTab === 'pending') {
        const diff = differenceInDays(parseISO(r.targetDate), today);
        return diff >= 0 && r.status !== 'completed';
      }
      return r.status === activeTab;
    });
  }, [reminders, activeTab, today, seasonFilter]);

  const hasFilter = useMemo(() =>
    activeTab !== 'all' || seasonFilter !== 'all',
    [activeTab, seasonFilter]);

  const clearFilters = () => {
    setActiveTab('all');
    setSeasonFilter('all');
  };

  const groupedByPriority = useMemo(() => {
    const groups: Record<ReminderPriority, typeof reminders> = {
      high: [],
      medium: [],
      low: [],
    };
    filteredReminders.forEach((r) => {
      groups[r.priority].push(r);
    });
    return groups;
  }, [filteredReminders]);

  const getSeasonInfo = (seasonId: string) => {
    const season = seasons.find((s) => s.id === seasonId);
    const field = fields.find((f) => f.id === season?.fieldId);
    return { season, field };
  };

  const getOperationEmoji = (type: string) => {
    const typeKey = type as keyof typeof OPERATION_TYPE_EMOJI;
    return OPERATION_TYPE_EMOJI[typeKey] ?? '📋';
  };

  const handleComplete = (id: string) => {
    updateReminderStatus(id, 'completed');
    showToast('已标记为完成', 'success');
  };

  const handleGoToRecord = (seasonId: string, type: string) => {
    showToast(`跳转至记录页面：${type}`, 'info');
  };

  const handleUpdateKeyNode = (cropIdx: number, nodeIdx: number, value: number) => {
    setCropVarieties((prev) => {
      const next = [...prev];
      const nodes = [...next[cropIdx].keyNodes];
      nodes[nodeIdx] = { ...nodes[nodeIdx], daysAfterSowing: value };
      next[cropIdx] = { ...next[cropIdx], keyNodes: nodes };
      return next;
    });
  };

  const handleSaveSettings = () => {
    showToast(`提醒设置已保存（提前${advanceDays}天提醒）`, 'success');
    setIsSettingsOpen(false);
  };

  const PrioritySection = ({
    title,
    priority,
    items,
    gradient,
  }: {
    title: string;
    priority: ReminderPriority;
    items: typeof reminders;
    gradient: string;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="card overflow-hidden p-0 mb-6">
        <div className={cn('px-5 py-4 flex items-center justify-between', gradient)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg font-display">{title}</h3>
              <p className="text-white/75 text-xs">共 {items.length} 条{REMINDER_PRIORITY_LABEL[priority]}优先级提醒</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold backdrop-blur-sm">
            {items.length}
          </span>
        </div>
        <div className="divide-y divide-farm-border/60">
          {items.map((r) => {
            const { season, field } = getSeasonInfo(r.seasonId);
            const daysInfo = getDaysInfo(r.targetDate, r.status);
            const isOverdue = r.status !== 'completed' && differenceInDays(parseISO(r.targetDate), today) < 0;
            return (
              <div
                key={r.id}
                className={cn(
                  'p-4 hover:bg-farm-surface-alt/40 transition-colors',
                  isOverdue && 'animate-pulse-soft'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl',
                      r.status === 'completed'
                        ? 'bg-farm-success/15'
                        : isOverdue
                        ? 'bg-farm-danger/15'
                        : r.priority === 'high'
                        ? 'bg-red-50'
                        : r.priority === 'medium'
                        ? 'bg-amber-50'
                        : 'bg-green-50'
                    )}
                  >
                    {r.status === 'completed' ? (
                      <Check className="w-5 h-5 text-farm-success" />
                    ) : (
                      <span>{getOperationEmoji(r.type)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4
                        className={cn(
                          'font-semibold text-base',
                          r.status === 'completed'
                            ? 'text-gray-400 line-through'
                            : 'text-farm-primary-dark'
                        )}
                      >
                        {season?.cropName ?? '未知作物'} - {r.type}
                      </h4>
                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                          daysInfo.color
                        )}
                      >
                        {r.status === 'completed' ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : isOverdue ? (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {daysInfo.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-farm-secondary" />
                        {field?.name ?? '未知地块'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Leaf className="w-3.5 h-3.5 text-farm-primary" />
                        {season?.cropName ?? '-'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-farm-info" />
                        建议 {format(parseISO(r.targetDate), 'M月d日 EEE', { locale: zhCN })}
                      </span>
                    </div>
                    {r.status !== 'completed' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-primary !py-1.5 !px-3 text-xs"
                          onClick={() => handleComplete(r.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          标记完成
                        </button>
                        <button
                          className="btn-secondary !py-1.5 !px-3 text-xs"
                          onClick={() => handleGoToRecord(r.seasonId, r.type)}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          跳转记录
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="智能提醒中心"
        subtitle="基于作物生长模型的关键节点智能提醒，不错过每一个农时"
        breadcrumb={['农事管理', '智能提醒']}
        actions={
          <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4" />
            提醒设置
          </button>
        }
      />

      <div className="card mb-6 p-0 overflow-hidden">
        <div className="flex items-center gap-1 p-1.5 bg-farm-surface-alt/60">
          {TAB_ITEMS.map((tab) => {
            const count =
              tab.key === 'all'
                ? reminders.length
                : tab.key === 'overdue'
                ? reminders.filter(
                    (r) => differenceInDays(parseISO(r.targetDate), today) < 0 && r.status !== 'completed'
                  ).length
                : reminders.filter((r) => {
                    if (tab.key === 'pending') {
                      return r.status !== 'completed' && differenceInDays(parseISO(r.targetDate), today) >= 0;
                    }
                    return r.status === tab.key;
                  }).length;
            return (
              <button
                key={tab.key}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-farm-surface text-farm-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-farm-surface/50'
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold',
                    activeTab === tab.key
                      ? 'bg-farm-primary/15 text-farm-primary-dark'
                      : 'bg-gray-200/60 text-gray-600'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredReminders.length === 0 ? (
        <div className="card">
          {hasFilter ? (
            <EmptyState
              icon={Bell}
              title="未找到匹配的提醒"
              description="当前筛选条件下没有提醒事项，试试调整筛选条件"
              variant="no-match"
              onClearFilter={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="暂无提醒事项"
              description="系统将根据作物生长周期自动生成关键节点提醒"
            />
          )}
        </div>
      ) : (
        <>
          <PrioritySection
            title="高优先级"
            priority="high"
            items={groupedByPriority.high}
            gradient="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
          />
          <PrioritySection
            title="中优先级"
            priority="medium"
            items={groupedByPriority.medium}
            gradient="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400"
          />
          <PrioritySection
            title="低优先级"
            priority="low"
            items={groupedByPriority.low}
            gradient="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
          />
        </>
      )}

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="提醒设置"
        maxWidth="max-w-4xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleSaveSettings}>
              保存设置
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="card bg-farm-surface-alt/40 border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-farm-primary/15 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-farm-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-farm-primary-dark">全局提醒提前天数</h4>
                  <p className="text-sm text-gray-500">在关键节点到达前N天开始提醒</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="w-9 h-9 rounded-lg bg-farm-surface border border-farm-border text-gray-600 hover:bg-farm-primary/5 hover:border-farm-primary/30 transition-colors"
                  onClick={() => setAdvanceDays(Math.max(0, advanceDays - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={advanceDays}
                  onChange={(e) => setAdvanceDays(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                  className="input-field w-20 text-center !py-1.5 font-semibold text-lg text-farm-primary"
                />
                <button
                  className="w-9 h-9 rounded-lg bg-farm-surface border border-farm-border text-gray-600 hover:bg-farm-primary/5 hover:border-farm-primary/30 transition-colors"
                  onClick={() => setAdvanceDays(Math.min(30, advanceDays + 1))}
                >
                  +
                </button>
                <span className="text-gray-500 text-sm">天</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-farm-primary-dark mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-farm-primary" />
              各作物品种关键节点设置
              <span className="text-xs font-normal text-gray-400 ml-1">（调整播种后天数）</span>
            </h4>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {cropVarieties.map((crop, cropIdx) => (
                <div key={crop.name} className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 bg-farm-surface-alt/50 border-b border-farm-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
                        {crop.name[0]}
                      </div>
                      <span className="font-semibold text-farm-primary-dark">{crop.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      全生育期 <span className="font-semibold text-farm-primary">{crop.growthDays}</span> 天
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {crop.keyNodes.map((node, nodeIdx) => (
                        <div
                          key={`${cropIdx}-${nodeIdx}`}
                          className="flex items-center gap-2 p-2 rounded-lg bg-farm-surface-alt/30 border border-farm-border/40"
                        >
                          <div className="shrink-0 w-7 h-7 rounded-md bg-white flex items-center justify-center text-sm">
                            {OPERATION_TYPE_EMOJI[node.operationType] ?? '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{node.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="number"
                                min={0}
                                max={crop.growthDays}
                                value={node.daysAfterSowing}
                                onChange={(e) =>
                                  handleUpdateKeyNode(cropIdx, nodeIdx, parseInt(e.target.value) || 0)
                                }
                                className="w-16 !py-1 !px-2 text-xs input-field text-center"
                              />
                              <span className="text-xs text-gray-400">天</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
