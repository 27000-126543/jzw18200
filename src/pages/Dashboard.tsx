import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Sprout, ClipboardList, TrendingUp,
  Plus, Calendar, ArrowRight, Bell, CheckCircle2,
  BarChart3, Coins, Leaf, Wheat, Droplets,
  ChevronDown, CircleDollarSign, CalendarRange,
  Trophy, Award, Target,
} from 'lucide-react';
import {
  format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth,
  subMonths, isWithinInterval, getYear, getMonth, addDays, differenceInDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { LineChart, BarChart } from '@/components/charts';
import { CROP_VARIETIES } from '@/data/mockData';
import {
  OPERATION_TYPE_LABEL,
  OPERATION_TYPE_EMOJI,
  type ReminderPriority,
  type OperationType,
} from '@/types';
import type { Season, Harvest, Cost } from '@/types';
import { cn } from '@/lib/utils';

const priorityColorMap: Record<ReminderPriority, string> = {
  high: 'bg-farm-danger',
  medium: 'bg-farm-warning',
  low: 'bg-farm-info',
};

const priorityBadgeMap: Record<ReminderPriority, string> = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-info',
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

type OverviewRange = 'year' | '12m';

interface OverviewPoint {
  label: string;
  value: number;
  yieldKg: number;
  revenue: number;
  cost: number;
  profit: number;
  [key: string]: string | number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { fields, seasons, operations, harvests, costs, reminders, showToast, updateReminderStatus } = useAppStore();
  const [overviewRange, setOverviewRange] = useState<OverviewRange>('12m');

  // ==== 1. 基础统计 ====
  const growingSeasons = useMemo(
    () => seasons.filter(s => s.status !== 'harvested'),
    [seasons]
  );

  const currentMonthOperations = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return operations.filter(op => op.date.startsWith(ym));
  }, [operations]);

  const lastMonthSameCount = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return operations.filter(op => op.date.startsWith(ym)).length;
  }, [operations]);

  const operationTrend = useMemo(() => {
    if (lastMonthSameCount === 0 && currentMonthOperations.length === 0) return undefined;
    if (lastMonthSameCount === 0) return currentMonthOperations.length > 0 ? undefined : 0;
    return Math.round(((currentMonthOperations.length - lastMonthSameCount) / lastMonthSameCount) * 100);
  }, [currentMonthOperations, lastMonthSameCount]);

  const totalRevenue = useMemo(
    () => harvests.reduce((sum, h) => sum + h.actualYieldKg * h.unitPrice, 0),
    [harvests]
  );

  const revenueTrend = useMemo(() => {
    if (harvests.length === 0) return undefined;
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;
    const sumThis = harvests
      .filter(h => h.harvestDate.startsWith(String(thisYear)))
      .reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
    const sumLast = harvests
      .filter(h => h.harvestDate.startsWith(String(lastYear)))
      .reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
    if (sumLast === 0) return undefined;
    return Math.round(((sumThis - sumLast) / sumLast) * 100);
  }, [harvests]);

  // ==== 2. 经营概览数据（自然月）====
  const { overviewData, overviewDateRange } = useMemo(() => {
    const now = new Date();
    const months: { year: number; month: number; label: string; start: Date; end: Date }[] = [];

    if (overviewRange === 'year') {
      // 本年度：1月-12月
      const yr = getYear(now);
      for (let m = 0; m < 12; m++) {
        const d = new Date(yr, m, 1);
        months.push({
          year: yr,
          month: m,
          label: format(d, 'M月', { locale: zhCN }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }
    } else {
      // 近12个月：最近12个完整月份（不包含当前月，从上月往前推11个月）
      const lastMonthEnd = subMonths(startOfMonth(now), 1);
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(lastMonthEnd, i);
        months.push({
          year: getYear(d),
          month: getMonth(d),
          label: format(d, 'M月', { locale: zhCN }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }
    }

    const points: OverviewPoint[] = months.map(m => ({
      label: m.label,
      value: 0,
      yieldKg: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    }));

    // 收成数据按自然月聚合
    harvests.forEach(h => {
      const hd = parseISO(h.harvestDate);
      const hYear = getYear(hd);
      const hMonth = getMonth(hd);
      const idx = months.findIndex(m => m.year === hYear && m.month === hMonth);
      if (idx !== -1) {
        points[idx].yieldKg += h.actualYieldKg;
        const rev = h.actualYieldKg * h.unitPrice;
        points[idx].revenue += rev;
        points[idx].profit += rev;
      }
    });

    // 成本数据按自然月聚合
    costs.forEach(c => {
      const cd = parseISO(c.date);
      const cYear = getYear(cd);
      const cMonth = getMonth(cd);
      const idx = months.findIndex(m => m.year === cYear && m.month === cMonth);
      if (idx !== -1) {
        points[idx].cost += c.amount;
        points[idx].profit -= c.amount;
      }
    });

    points.forEach(p => { p.value = p.profit; });

    const dateRange = months.length > 0
      ? { from: format(months[0].start, 'yyyy-MM-dd'), to: format(months[months.length - 1].end, 'yyyy-MM-dd') }
      : { from: '', to: '' };

    return { overviewData: points, overviewDateRange: dateRange };
  }, [overviewRange, harvests, costs]);

  const hasOverviewData = useMemo(
    () => overviewData.some(p => p.yieldKg > 0 || p.revenue > 0 || p.cost > 0),
    [overviewData]
  );

  const overviewSummary = useMemo(() => {
    return overviewData.reduce(
      (acc, p) => ({
        yieldKg: acc.yieldKg + p.yieldKg,
        revenue: acc.revenue + p.revenue,
        cost: acc.cost + p.cost,
        profit: acc.profit + p.profit,
      }),
      { yieldKg: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }, [overviewData]);

  // ==== 3. 产量趋势（品种分解，空态友好）====
  const { yieldTrendData, yieldLines, hasYieldData } = useMemo(() => {
    const now = new Date();
    interface LinePt { label: string; value: number; [k: string]: string | number; }
    const months: LinePt[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = addDays(now, -i * 30);
      months.push({ label: format(d, 'M月', { locale: zhCN }), value: 0 });
    }

    const usedCrops = new Set<string>();
    harvests.forEach(h => {
      const season = seasons.find(s => s.id === h.seasonId);
      if (!season) return;
      usedCrops.add(season.cropName);
      const hd = parseISO(h.harvestDate);
      const diff = differenceInDays(now, hd);
      const idx = 11 - Math.floor(diff / 30);
      if (idx >= 0 && idx < 12) {
        months[idx][season.cropName] = (Number(months[idx][season.cropName]) || 0) + h.actualYieldKg;
        months[idx].value += h.actualYieldKg;
      }
    });

    const lines = CROP_VARIETIES
      .filter(cv => usedCrops.has(cv.name))
      .map(cv => ({
        key: cv.name,
        label: cv.name,
        color: cropColors[cv.name] || '#2D6A4F',
      }));

    return {
      yieldTrendData: months,
      yieldLines: lines,
      hasYieldData: usedCrops.size > 0,
    };
  }, [harvests, seasons]);

  // ==== 3.5 近12个月排行榜（作物&地块）====
  const { cropRanking, fieldRanking, hasRankingData } = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 11));
    const endDate = endOfMonth(subMonths(now, 0));

    // 过滤时间范围内的收成和成本
    const inRangeHarvests = harvests.filter(h => {
      const hd = parseISO(h.harvestDate);
      return isWithinInterval(hd, { start: startDate, end: endDate });
    });
    const inRangeCosts = costs.filter(c => {
      const cd = parseISO(c.date);
      return isWithinInterval(cd, { start: startDate, end: endDate });
    });

    // 涉及的种植季
    const seasonIds = new Set<string>();
    inRangeHarvests.forEach(h => seasonIds.add(h.seasonId));
    inRangeCosts.forEach(c => seasonIds.add(c.seasonId));

    // 作物收益排行
    const cropMap = new Map<string, { revenue: number; cost: number; profit: number; yieldKg: number }>();
    inRangeHarvests.forEach(h => {
      const season = seasons.find(s => s.id === h.seasonId);
      if (!season) return;
      const crop = season.cropName;
      if (!cropMap.has(crop)) {
        cropMap.set(crop, { revenue: 0, cost: 0, profit: 0, yieldKg: 0 });
      }
      const data = cropMap.get(crop)!;
      const rev = h.actualYieldKg * h.unitPrice;
      data.revenue += rev;
      data.profit += rev;
      data.yieldKg += h.actualYieldKg;
    });
    inRangeCosts.forEach(c => {
      const season = seasons.find(s => s.id === c.seasonId);
      if (!season) return;
      const crop = season.cropName;
      if (!cropMap.has(crop)) {
        cropMap.set(crop, { revenue: 0, cost: 0, profit: 0, yieldKg: 0 });
      }
      const data = cropMap.get(crop)!;
      data.cost += c.amount;
      data.profit -= c.amount;
    });

    const cropList = Array.from(cropMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    // 地块效率排行
    const fieldMap = new Map<string, {
      fieldName: string; areaMu: number; revenue: number; cost: number;
      profit: number; yieldKg: number; yieldPerMu: number; profitPerMu: number;
    }>();

    // 初始化所有地块
    fields.forEach(f => {
      fieldMap.set(f.id, {
        fieldName: f.name,
        areaMu: f.areaMu,
        revenue: 0, cost: 0, profit: 0, yieldKg: 0,
        yieldPerMu: 0, profitPerMu: 0,
      });
    });

    inRangeHarvests.forEach(h => {
      const season = seasons.find(s => s.id === h.seasonId);
      if (!season) return;
      const fData = fieldMap.get(season.fieldId);
      if (!fData) return;
      const rev = h.actualYieldKg * h.unitPrice;
      fData.revenue += rev;
      fData.profit += rev;
      fData.yieldKg += h.actualYieldKg;
    });

    inRangeCosts.forEach(c => {
      const season = seasons.find(s => s.id === c.seasonId);
      if (!season) return;
      const fData = fieldMap.get(season.fieldId);
      if (!fData) return;
      fData.cost += c.amount;
      fData.profit -= c.amount;
    });

    // 计算亩均指标
    fieldMap.forEach(d => {
      if (d.areaMu > 0) {
        d.yieldPerMu = d.yieldKg / d.areaMu;
        d.profitPerMu = d.profit / d.areaMu;
      }
    });

    const fieldList = Array.from(fieldMap.entries())
      .filter(([, d]) => d.yieldKg > 0 || d.revenue > 0 || d.cost > 0)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.profitPerMu - a.profitPerMu)
      .slice(0, 3);

    return {
      cropRanking: cropList,
      fieldRanking: fieldList,
      hasRankingData: cropList.length > 0 || fieldList.length > 0,
    };
  }, [harvests, seasons, fields, costs]);

  // ==== 4. 待办提醒 & 最近操作 ====
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

  const recentOperations = useMemo(
    () => [...operations]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [operations]
  );

  // ==== 5. 交互 ====
  const handleQuickAction = (action: string) => {
    if (action === 'field') {
      navigate('/fields');
      showToast('已跳转至地块管理', 'info');
    } else if (action === 'operation') {
      navigate('/operations?new=1');
      showToast('已跳转至操作录入', 'info');
    } else if (action === 'harvest') {
      navigate('/harvest?new=1');
      showToast('已跳转至收成录入', 'info');
    }
  };

  const handleMarkReminderDone = (id: string) => {
    updateReminderStatus(id, 'completed');
    showToast('待办已标记完成', 'success');
  };

  const goToReminder = (status?: string, seasonId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('tab', status);
    if (seasonId) params.set('season', seasonId);
    navigate(`/reminders${params.toString() ? '?' + params.toString() : ''}`);
  };

  const goToOperations = (seasonId?: string, opType?: OperationType, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (seasonId) params.set('season', seasonId);
    if (opType) params.set('type', opType);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    navigate(`/operations${params.toString() ? '?' + params.toString() : ''}`);
  };

  const goToFinance = (tab: 'cost' | 'revenue' = 'cost', seasonId?: string, category?: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (seasonId) params.set('season', seasonId);
    if (category) params.set('category', category);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    navigate(`/finance?${params.toString()}`);
  };

  const goToHarvest = (seasonId?: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (seasonId) params.set('season', seasonId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    navigate(`/harvest${params.toString() ? '?' + params.toString() : ''}`);
  };

  const goToReports = (tab: 'variety' | 'field' | 'trend' = 'variety', year?: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (year) params.set('year', year);
    navigate(`/reports?${params.toString()}`);
  };

  const goToSeasons = (fieldId?: string) => {
    navigate('/seasons' + (fieldId ? `?field=${fieldId}` : ''));
  };

  // 格式化金额
  const fmtMoney = (v: number) => `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  const fmtKg = (v: number) => `${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}kg`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="工作台总览"
        subtitle="欢迎回来，今日农事概览一目了然"
        breadcrumb={[]}
      />

      {/* ==== 顶部统计卡：仅在有真实对比时显示趋势 ==== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="地块总数"
          value={fields.length}
          suffix="个"
          icon={MapPin}
          trend={undefined}
          gradient="primary"
        />
        <StatCard
          title="种植中季数"
          value={growingSeasons.length}
          suffix="季"
          icon={Sprout}
          trend={undefined}
          gradient="secondary"
        />
        <StatCard
          title="本月操作"
          value={currentMonthOperations.length}
          suffix="次"
          icon={ClipboardList}
          trend={operationTrend}
          gradient="accent"
        />
        <StatCard
          title="已登记收益"
          value={fmtMoney(totalRevenue)}
          icon={TrendingUp}
          trend={revenueTrend}
          gradient="info"
        />
      </div>

      {/* ==== 快捷操作 ==== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'field', title: '新增地块', desc: '登记新的耕地信息', icon: Plus, color: 'from-farm-primary to-farm-primary-light' },
          { key: 'operation', title: '记录操作', desc: '录入施肥/打药/灌溉等', icon: ClipboardList, color: 'from-farm-secondary to-farm-secondary-light' },
          { key: 'harvest', title: '录入产量', desc: '登记收成与品质数据', icon: BarChart3, color: 'from-farm-accent to-farm-accent-light' },
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

      {/* ==== 经营概览区 ==== */}
      <div className="card">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
              <Coins className="w-5 h-5 text-farm-secondary" />
              经营概览
              <span className="text-xs font-normal text-gray-500 ml-1">
                产量 · 收入 · 成本 · 利润
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              追踪核心经营指标的变化趋势，辅助种植决策
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-farm-surface-alt rounded-lg">
            <button
              onClick={() => setOverviewRange('year')}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                overviewRange === 'year'
                  ? 'bg-farm-surface text-farm-primary shadow-card'
                  : 'text-gray-500 hover:text-farm-primary'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              本年度
            </button>
            <button
              onClick={() => setOverviewRange('12m')}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                overviewRange === '12m'
                  ? 'bg-farm-surface text-farm-primary shadow-card'
                  : 'text-gray-500 hover:text-farm-primary'
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              近12个月
            </button>
          </div>
        </div>

        {!hasOverviewData ? (
          <EmptyState
            icon={Wheat}
            title="暂无经营数据"
            description="录入收成与成本记录后，这里将展示产量、收入、成本和利润的变化趋势"
            actionText="录入收成"
            onAction={() => handleQuickAction('harvest')}
          />
        ) : (
          <>
            {/* 概览汇总卡 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: '累计产量',
                  value: fmtKg(overviewSummary.yieldKg),
                  icon: Wheat,
                  color: 'text-farm-primary',
                  bg: 'bg-farm-primary/10',
                  onClick: () => goToHarvest(undefined, overviewDateRange.from, overviewDateRange.to),
                },
                {
                  label: '总收入',
                  value: fmtMoney(overviewSummary.revenue),
                  icon: TrendingUp,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  onClick: () => goToFinance('revenue', undefined, undefined, overviewDateRange.from, overviewDateRange.to),
                },
                {
                  label: '总成本',
                  value: fmtMoney(overviewSummary.cost),
                  icon: CircleDollarSign,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  onClick: () => goToFinance('cost', undefined, undefined, overviewDateRange.from, overviewDateRange.to),
                },
                {
                  label: overviewSummary.profit >= 0 ? '净利润' : '净亏损',
                  value: (overviewSummary.profit >= 0 ? '' : '-') + fmtMoney(Math.abs(overviewSummary.profit)),
                  icon: Coins,
                  color: overviewSummary.profit >= 0 ? 'text-farm-primary-dark' : 'text-farm-danger',
                  bg: overviewSummary.profit >= 0 ? 'bg-farm-primary/10' : 'bg-farm-danger/10',
                  onClick: () => goToFinance('revenue', undefined, undefined, overviewDateRange.from, overviewDateRange.to),
                },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="p-4 rounded-xl bg-farm-surface-alt/70 hover:bg-farm-surface-alt border border-farm-border/40 text-left transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${item.color} group-hover:translate-x-0.5 transition-transform`}>
                    {item.value}
                  </div>
                </button>
              ))}
            </div>

            {/* 趋势双图：收入/成本/利润 折线 + 产量 柱状 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <CircleDollarSign className="w-4 h-4 text-farm-secondary" />
                    收入 · 成本 · 利润趋势
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-farm-primary" />
                      收入
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-farm-warning" />
                      成本
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-farm-success" />
                      利润
                    </span>
                  </div>
                </div>
                <LineChart
                  data={overviewData}
                  lines={[
                    { key: 'revenue', label: '收入', color: '#2D6A4F' },
                    { key: 'cost', label: '成本', color: '#F4A261' },
                    { key: 'profit', label: '利润', color: '#52B788' },
                  ]}
                  height={240}
                  yUnit="¥"
                  showArea={false}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-farm-primary" />
                    月度产量
                  </h3>
                </div>
                <BarChart
                  data={overviewData.map(p => ({
                    label: p.label,
                    value: p.yieldKg,
                    color: '#D4A373',
                  }))}
                  height={240}
                  yUnit="kg"
                  showValue={false}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==== 作物&地块排行榜 ==== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 作物收益排行 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => goToReports('variety')}
              className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2 hover:text-farm-primary transition-colors group"
            >
              <Trophy className="w-5 h-5 text-farm-secondary" />
              作物收益排行
              <span className="text-xs font-normal text-gray-500">近12个月</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {cropRanking.length === 0 ? (
            <EmptyState
              icon={Leaf}
              title="暂无作物排行"
              description="录入收成与成本后，将展示各作物的收益排名"
            />
          ) : (
            <div className="space-y-3">
              {cropRanking.map((crop, idx) => (
                <button
                  key={crop.name}
                  onClick={() => goToReports('variety')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-farm-surface-alt transition-colors text-left group"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-200 text-gray-600' :
                    'bg-amber-50 text-amber-600'
                  )}>
                    {idx === 0 ? <Award className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-farm-primary-dark truncate">{crop.name}</span>
                      <span className="text-sm font-semibold text-farm-success shrink-0">
                        {fmtMoney(crop.profit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>累计产量 {fmtKg(crop.yieldKg)}</span>
                      <span>·</span>
                      <span>收入 {fmtMoney(crop.revenue)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 地块亩利润排行 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => goToReports('field')}
              className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2 hover:text-farm-primary transition-colors group"
            >
              <Target className="w-5 h-5 text-farm-primary" />
              地块亩利润排行
              <span className="text-xs font-normal text-gray-500">近12个月</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {fieldRanking.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="暂无地块排行"
              description="录入地块有收成记录后，将展示各地块的亩均效益排名"
            />
          ) : (
            <div className="space-y-3">
              {fieldRanking.map((field, idx) => (
                <button
                  key={field.id}
                  onClick={() => goToReports('field')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-farm-surface-alt transition-colors text-left group"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
                    idx === 0 ? 'bg-emerald-100 text-emerald-700' :
                    idx === 1 ? 'bg-teal-100 text-teal-600' :
                    'bg-green-50 text-green-600'
                  )}>
                    {idx === 0 ? <Award className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-farm-primary-dark truncate">{field.fieldName}</span>
                      <span className={cn(
                        'text-sm font-semibold shrink-0',
                        field.profitPerMu >= 0 ? 'text-farm-success' : 'text-farm-danger'
                      )}>
                        {field.profitPerMu >= 0 ? '' : '-'}{fmtMoney(Math.abs(field.profitPerMu))}/亩
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>面积 {field.areaMu}亩</span>
                      <span>·</span>
                      <span>亩产 {fmtKg(field.yieldPerMu)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==== 待办提醒 + 最近操作 ==== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待办提醒 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => goToReminder()}
              className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2 hover:text-farm-primary transition-colors group"
            >
              <Bell className="w-5 h-5 text-farm-warning" />
              待办提醒
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-xs font-normal text-gray-500">按优先级排序</span>
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
                    <button
                      onClick={() => goToReminder(r.status === 'overdue' ? 'overdue' : 'pending', r.seasonId)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-farm-primary-dark truncate">{r.type}</span>
                        <span className={`badge ${priorityBadgeMap[r.priority]} shrink-0`}>
                          {r.priority === 'high' ? '高' : r.priority === 'medium' ? '中' : '低'}
                        </span>
                        {r.status === 'overdue' && (
                          <span className="badge badge-danger shrink-0 animate-pulse-soft">已逾期</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{r.targetDate}</span>
                        {field && <span className="truncate">· {field.name}</span>}
                        {season && <span>· {season.cropName}</span>}
                      </div>
                    </button>
                    <button
                      onClick={() => handleMarkReminderDone(r.id)}
                      className="btn-ghost px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      标记完成
                    </button>
                    <button
                      onClick={() => goToOperations(r.seasonId)}
                      className="btn-secondary px-2.5 py-1 text-xs shrink-0"
                    >
                      记录操作
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 最近操作 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => goToOperations()}
              className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2 hover:text-farm-primary transition-colors group"
            >
              <ClipboardList className="w-5 h-5 text-farm-primary" />
              最近操作
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {recentOperations.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="暂无操作记录"
              description="开始记录您的农事操作"
              actionText="记录操作"
              onAction={() => handleQuickAction('operation')}
            />
          ) : (
            <div className="relative pl-2">
              <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-farm-border" />
              <div className="space-y-4">
                {recentOperations.map(op => {
                  const season = seasons.find(s => s.id === op.seasonId);
                  const field = fields.find(f => f.id === season?.fieldId);
                  return (
                    <button
                      key={op.id}
                      onClick={() => goToOperations(op.seasonId, op.type)}
                      className="w-full text-left relative flex items-start gap-3 pl-5 group"
                    >
                      <div className="absolute left-0 top-1.5 w-10 h-10 rounded-full bg-farm-primary/10 border-2 border-farm-surface flex items-center justify-center shrink-0 z-10 text-base group-hover:scale-110 transition-transform">
                        <span>{OPERATION_TYPE_EMOJI[op.type] ?? '📋'}</span>
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
                            {field && (
                              <span className="text-xs text-gray-500 truncate">· {field.name}</span>
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==== 产量趋势图：空数据时显示空态 ==== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button
            onClick={() => navigate('/harvest')}
            className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2 hover:text-farm-primary transition-colors group"
          >
            <BarChart3 className="w-5 h-5 text-farm-primary" />
            近12个月各品种产量趋势
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
          {hasYieldData && (
            <div className="flex items-center gap-3 flex-wrap">
              {yieldLines.map(line => (
                <div key={line.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
                  {line.label}
                </div>
              ))}
            </div>
          )}
        </div>
        {!hasYieldData ? (
          <EmptyState
            icon={Leaf}
            title="暂无收成趋势"
            description="录入首条收成记录后，这里将展示各品种的月度产量变化曲线"
            actionText="录入第一条收成"
            onAction={() => handleQuickAction('harvest')}
          />
        ) : (
          <LineChart
            data={yieldTrendData}
            lines={yieldLines.length > 0 ? yieldLines : [{ key: 'value', color: '#2D6A4F', label: '总产量' }]}
            height={280}
            yUnit="kg"
            showArea={false}
          />
        )}
      </div>
    </div>
  );
}
