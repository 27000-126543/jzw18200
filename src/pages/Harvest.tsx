import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import BarChart from '@/components/charts/BarChart';
import {
  QUALITY_LEVEL_LABEL,
  type QualityLevel,
  type Harvest,
} from '@/types';
import { format, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import {
  Plus,
  Scale,
  Map as MapIcon,
  TrendingUp,
  CircleDollarSign,
  Edit3,
  Trash2,
  BarChart3,
  FileBarChart2,
  AlertTriangle,
  Calendar,
  Sprout,
  CheckCircle2,
  Award,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabKey = 'records' | 'comparison';

const QUALITY_COLORS: Record<QualityLevel, string> = {
  excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  good: 'bg-blue-100 text-blue-700 border-blue-200',
  normal: 'bg-amber-100 text-amber-700 border-amber-200',
  poor: 'bg-red-100 text-red-700 border-red-200',
};

const ABNORMAL_REASONS = ['病虫害', '气候', '土壤', '管理', '其他'];

export default function Harvest() {
  const harvests = useAppStore((s) => s.harvests);
  const seasons = useAppStore((s) => s.seasons);
  const fields = useAppStore((s) => s.fields);
  const addHarvest = useAppStore((s) => s.addHarvest);
  const updateHarvest = useAppStore((s) => s.updateHarvest);
  const deleteHarvest = useAppStore((s) => s.deleteHarvest);
  const showToast = useAppStore((s) => s.showToast);

  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>('records');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAbnormalAlertOpen, setIsAbnormalAlertOpen] = useState(false);
  const [pendingHarvest, setPendingHarvest] = useState<{
    seasonId: string;
    harvestDate: string;
    actualYieldKg: number;
    qualityLevel: QualityLevel;
    unitPrice: number;
    isAbnormal: boolean;
    deviation: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [compareFieldId, setCompareFieldId] = useState<string>('all');
  const [compareCropName, setCompareCropName] = useState<string>('all');
  const [abnormalReasons, setAbnormalReasons] = useState<Record<string, string>>({});
  const [abnormalNotes, setAbnormalNotes] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    seasonId: '',
    harvestDate: format(new Date(), 'yyyy-MM-dd'),
    actualYieldKg: '',
    qualityLevel: 'good' as QualityLevel,
    unitPrice: '',
  });

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsAddModalOpen(true);
      setSearchParams({}, { replace: true });
    }
    const dateFromUrl = searchParams.get('dateFrom');
    const dateToUrl = searchParams.get('dateTo');
    const seasonFromUrl = searchParams.get('season');
    if (dateFromUrl) setDateFrom(dateFromUrl);
    if (dateToUrl) setDateTo(dateToUrl);
    if (seasonFromUrl) setSeasonFilter(seasonFromUrl);
  }, [searchParams, setSearchParams]);

  const getSeasonInfo = useCallback(
    (seasonId: string) => {
      const season = seasons.find((s) => s.id === seasonId);
      const field = fields.find((f) => f.id === season?.fieldId);
      return { season, field };
    },
    [seasons, fields]
  );

  const availableSeasonsForHarvest = useMemo(() => {
    const today = new Date();
    return seasons.filter((s) => {
      if (s.status === 'harvested') return false;
      const expected = parseISO(s.expectedHarvestDate);
      const sowing = parseISO(s.sowingDate);
      const totalDays = differenceInDays(expected, sowing);
      const passedDays = differenceInDays(today, sowing);
      return passedDays >= totalDays * 0.8;
    });
  }, [seasons]);

  const filteredHarvests = useMemo(() => {
    return harvests.filter((h) => {
      if (seasonFilter !== 'all' && h.seasonId !== seasonFilter) return false;
      if (dateFrom && dateTo) {
        const hd = parseISO(h.harvestDate);
        if (!isWithinInterval(hd, { start: parseISO(dateFrom), end: parseISO(dateTo) })) {
          return false;
        }
      }
      return true;
    });
  }, [harvests, seasonFilter, dateFrom, dateTo]);

  const hasFilter = useMemo(() => {
    return seasonFilter !== 'all' || (dateFrom && dateTo);
  }, [seasonFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSeasonFilter('all');
  };

  const summary = useMemo(() => {
    let totalYield = 0;
    let totalArea = 0;
    let totalRevenue = 0;

    filteredHarvests.forEach((h) => {
      const { field } = getSeasonInfo(h.seasonId);
      totalYield += h.actualYieldKg;
      totalArea += field?.areaMu ?? 0;
      totalRevenue += h.actualYieldKg * h.unitPrice;
    });

    const avgPerMu = totalArea > 0 ? totalYield / totalArea : 0;
    return {
      totalYield: Math.round(totalYield),
      totalArea: totalArea.toFixed(1),
      avgPerMu: Math.round(avgPerMu),
      totalRevenue: Math.round(totalRevenue).toLocaleString(),
    };
  }, [filteredHarvests, getSeasonInfo]);

  const checkAbnormality = (seasonId: string, actualYieldKg: number) => {
    const { season, field } = getSeasonInfo(seasonId);
    if (!season || !field) return { isAbnormal: false, deviation: 0, compareValue: 0 };

    const currentYieldPerMu = actualYieldKg / field.areaMu;

    const sameCropHarvests = harvests.filter((h) => {
      const { season: s } = getSeasonInfo(h.seasonId);
      return s?.cropName === season.cropName;
    });

    if (sameCropHarvests.length === 0) {
      return { isAbnormal: false, deviation: 0, compareValue: 0 };
    }

    const avgPerMu =
      sameCropHarvests.reduce((sum, h) => {
        const { season: s, field: f } = getSeasonInfo(h.seasonId);
        if (!s || !f) return sum;
        return sum + h.actualYieldKg / f.areaMu;
      }, 0) / sameCropHarvests.length;

    const deviation = ((currentYieldPerMu - avgPerMu) / avgPerMu) * 100;
    return {
      isAbnormal: Math.abs(deviation) >= 15,
      deviation: Math.round(deviation * 10) / 10,
      compareValue: Math.round(avgPerMu),
    };
  };

  const handleSubmit = () => {
    if (!form.seasonId || !form.harvestDate || !form.actualYieldKg || !form.unitPrice) {
      showToast('请填写必填项', 'warning');
      return;
    }

    const yieldNum = parseFloat(form.actualYieldKg);
    const priceNum = parseFloat(form.unitPrice);
    const abnormalCheck = checkAbnormality(form.seasonId, yieldNum);

    const harvestData = {
      seasonId: form.seasonId,
      harvestDate: form.harvestDate,
      actualYieldKg: yieldNum,
      qualityLevel: form.qualityLevel,
      unitPrice: priceNum,
      isAbnormal: abnormalCheck.isAbnormal,
    };

    if (editId) {
      updateHarvest(editId, harvestData);
      showToast('收成记录已更新', 'success');
      setEditId(null);
    } else if (abnormalCheck.isAbnormal) {
      setPendingHarvest({ ...harvestData, deviation: abnormalCheck.deviation });
      setIsAbnormalAlertOpen(true);
      return;
    } else {
      addHarvest(harvestData);
      showToast('收成记录已添加', 'success');
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const confirmAbnormalHarvest = () => {
    if (pendingHarvest) {
      const { deviation, ...rest } = pendingHarvest;
      addHarvest(rest);
      showToast(`收成记录已添加（异常偏差${deviation > 0 ? '+' : ''}${deviation}%）`, 'warning');
    }
    setIsAbnormalAlertOpen(false);
    setPendingHarvest(null);
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      seasonId: '',
      harvestDate: format(new Date(), 'yyyy-MM-dd'),
      actualYieldKg: '',
      qualityLevel: 'good',
      unitPrice: '',
    });
  };

  const handleEdit = (h: Harvest) => {
    setEditId(h.id);
    setForm({
      seasonId: h.seasonId,
      harvestDate: h.harvestDate,
      actualYieldKg: h.actualYieldKg.toString(),
      qualityLevel: h.qualityLevel,
      unitPrice: h.unitPrice.toString(),
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteDialog.id) {
      deleteHarvest(deleteDialog.id);
      showToast('收成记录已删除', 'success');
    }
    setDeleteDialog({ open: false, id: null });
  };

  const handleSaveAbnormalAnalysis = (harvestId: string) => {
    const reason = abnormalReasons[harvestId];
    const note = abnormalNotes[harvestId];
    if (!reason) {
      showToast('请选择异常原因', 'warning');
      return;
    }
    updateHarvest(harvestId, {
      abnormalReason: reason,
      analysisNote: note,
      isAbnormal: true,
    });
    showToast('异常分析已保存', 'success');
  };

  const comparisonData = useMemo(() => {
    const filteredHarvests = harvests.filter((h) => {
      const { season, field } = getSeasonInfo(h.seasonId);
      if (!season || !field) return false;
      if (compareFieldId !== 'all' && field.id !== compareFieldId) return false;
      if (compareCropName !== 'all' && season.cropName !== compareCropName) return false;
      return true;
    });

    const cropGroups: Record<string, Harvest[]> = {};
    filteredHarvests.forEach((h) => {
      const { season } = getSeasonInfo(h.seasonId);
      if (!season) return;
      if (!cropGroups[season.cropName]) cropGroups[season.cropName] = [];
      cropGroups[season.cropName].push(h);
    });

    const currentSeasonData: { label: string; value: number }[] = [];
    const comparisonSeasonData: { label: string; value: number }[] = [];
    const annotations: Record<string, { deviation: number; abnormal: boolean }> = {};

    Object.keys(cropGroups).forEach((cropName) => {
      const hs = cropGroups[cropName];
      if (hs.length === 0) return;

      hs.sort((a, b) => b.harvestDate.localeCompare(a.harvestDate));

      const latest = hs[0];
      const { field: f1 } = getSeasonInfo(latest.seasonId);
      if (!f1) return;
      const currentPerMu = Math.round(latest.actualYieldKg / f1.areaMu);

      let comparePerMu = 0;
      if (hs.length > 1) {
        const history = hs.slice(1);
        comparePerMu = Math.round(
          history.reduce((sum, h) => {
            const { field: f } = getSeasonInfo(h.seasonId);
            return sum + (f ? h.actualYieldKg / f.areaMu : 0);
          }, 0) / history.length
        );
      } else {
        comparePerMu = currentPerMu;
      }

      currentSeasonData.push({ label: cropName, value: currentPerMu });
      comparisonSeasonData.push({ label: cropName, value: comparePerMu });

      if (comparePerMu > 0) {
        const deviation = Math.round(((currentPerMu - comparePerMu) / comparePerMu) * 1000) / 10;
        annotations[cropName] = {
          deviation,
          abnormal: Math.abs(deviation) >= 15,
        };
      }
    });

    return { currentSeasonData, comparisonSeasonData, annotations };
  }, [harvests, compareFieldId, compareCropName, getSeasonInfo]);

  const abnormalHarvests = useMemo(() => harvests.filter((h) => h.isAbnormal), [harvests]);

  const uniqueCrops = useMemo(() => {
    const set = new Set<string>();
    seasons.forEach((s) => set.add(s.cropName));
    return Array.from(set);
  }, [seasons]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="收成管理"
        subtitle="记录和分析各季作物收成数据，智能识别异常产量"
        breadcrumb={['农事管理', '收成管理']}
        actions={
          <button className="btn-primary" onClick={() => { setEditId(null); resetForm(); setIsAddModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            录入收成
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="总产量"
          value={summary.totalYield}
          suffix="kg"
          icon={Scale}
          gradient="primary"
        />
        <StatCard
          title="总面积"
          value={summary.totalArea}
          suffix="亩"
          icon={MapIcon}
          gradient="secondary"
        />
        <StatCard
          title="平均亩产"
          value={summary.avgPerMu}
          suffix="kg/亩"
          icon={TrendingUp}
          gradient="accent"
        />
        <StatCard
          title="总产值"
          value={summary.totalRevenue}
          suffix="¥"
          icon={CircleDollarSign}
          gradient="info"
        />
      </div>

      {activeTab === 'records' && (
        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Filter className="w-4 h-4 text-farm-primary" />
              筛选条件：
            </div>
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                className="select-field"
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
              >
                <option value="all">全部种植季</option>
                {seasons.map((s) => {
                  const f = fields.find((f) => f.id === s.fieldId);
                  return (
                    <option key={s.id} value={s.id}>
                      {f?.name ?? '未知'} - {s.cropName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                className="input-field w-36"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="开始日期"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                className="input-field w-36"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="结束日期"
              />
            </div>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="btn-ghost text-sm"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card mb-6 p-0 overflow-hidden">
        <div className="flex items-center gap-1 p-1.5 bg-farm-surface-alt/60">
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'records'
                ? 'bg-farm-surface text-farm-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-farm-surface/50'
            )}
            onClick={() => setActiveTab('records')}
          >
            <FileBarChart2 className="w-4 h-4" />
            收成记录
            <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold bg-gray-200/60 text-gray-600">
              {filteredHarvests.length}
            </span>
          </button>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'comparison'
                ? 'bg-farm-surface text-farm-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-farm-surface/50'
            )}
            onClick={() => setActiveTab('comparison')}
          >
            <BarChart3 className="w-4 h-4" />
            产量对比
          </button>
        </div>
      </div>

      {activeTab === 'records' ? (
        <div className="card p-0 overflow-hidden">
          {filteredHarvests.length === 0 ? (
            hasFilter ? (
              <EmptyState
                icon={Sprout}
                title="未找到匹配的收成记录"
                description="当前筛选条件下没有收成记录，试试调整筛选条件"
                variant="no-match"
                onClearFilter={clearFilters}
              />
            ) : (
              <EmptyState
                icon={Sprout}
                title="暂无收成记录"
                description="点击右上角录入收成开始记录您的收获"
                actionText="录入收成"
                onAction={() => { setEditId(null); resetForm(); setIsAddModalOpen(true); }}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="table-wrap">
                <thead>
                  <tr>
                    <th>地块</th>
                    <th>作物</th>
                    <th>播种日期</th>
                    <th>收获日期</th>
                    <th>实际产量</th>
                    <th>品质等级</th>
                    <th>单价</th>
                    <th>产值</th>
                    <th>状态</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHarvests.map((h) => {
                    const { season, field } = getSeasonInfo(h.seasonId);
                    const revenue = h.actualYieldKg * h.unitPrice;
                    return (
                      <tr key={h.id} className={h.isAbnormal ? 'bg-farm-danger/5' : ''}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <MapIcon className="w-3.5 h-3.5 text-farm-secondary" />
                            <span className="font-medium">{field?.name ?? '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Sprout className="w-3.5 h-3.5 text-farm-primary" />
                            <span>{season?.cropName ?? '-'}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-gray-600">
                          {season ? format(parseISO(season.sowingDate), 'yyyy-MM-dd') : '-'}
                        </td>
                        <td className="whitespace-nowrap text-gray-600">
                          {format(parseISO(h.harvestDate), 'yyyy-MM-dd')}
                        </td>
                        <td className="font-semibold text-farm-primary-dark">
                          {h.actualYieldKg.toLocaleString()} kg
                        </td>
                        <td>
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                              QUALITY_COLORS[h.qualityLevel]
                            )}
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {QUALITY_LEVEL_LABEL[h.qualityLevel]}
                          </span>
                        </td>
                        <td className="text-gray-700">¥{h.unitPrice.toFixed(2)}/kg</td>
                        <td className="font-semibold text-farm-accent">
                          ¥{Math.round(revenue).toLocaleString()}
                        </td>
                        <td>
                          {h.isAbnormal ? (
                            <span className="badge-danger">
                              <AlertTriangle className="w-3 h-3" />
                              异常
                            </span>
                          ) : (
                            <span className="badge-success">
                              <CheckCircle2 className="w-3 h-3" />
                              正常
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="p-2 rounded-lg text-gray-400 hover:text-farm-primary hover:bg-farm-primary/10 transition-colors"
                              onClick={() => handleEdit(h)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg text-gray-400 hover:text-farm-danger hover:bg-farm-danger/10 transition-colors"
                              onClick={() => setDeleteDialog({ open: true, id: h.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Filter className="w-4 h-4 text-farm-primary" />
                筛选：
              </div>
              <div className="min-w-[160px]">
                <select
                  className="select-field"
                  value={compareFieldId}
                  onChange={(e) => setCompareFieldId(e.target.value)}
                >
                  <option value="all">全部地块</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <select
                  className="select-field"
                  value={compareCropName}
                  onChange={(e) => setCompareCropName(e.target.value)}
                >
                  <option value="all">全部品种</option>
                  {uniqueCrops.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparisonData.currentSeasonData.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart3 className="w-16 h-16 text-farm-border mx-auto mb-4" />
                <p className="text-gray-500 text-lg">暂无对比数据</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-6 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-gradient-to-b from-farm-primary-light to-farm-primary-dark"></span>
                    <span className="text-gray-600">当前季亩产</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-gradient-to-b from-farm-secondary-light to-farm-secondary"></span>
                    <span className="text-gray-600">历史平均亩产</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-gradient-to-b from-green-400 to-green-600"></span>
                    <span className="text-gray-600">偏高 ≥15%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-gradient-to-b from-orange-400 to-red-500"></span>
                    <span className="text-gray-600">偏低 ≥15%</span>
                  </div>
                </div>
                <BarChart
                  data={comparisonData.currentSeasonData}
                  compareData={comparisonData.comparisonSeasonData}
                  height={320}
                  yUnit="kg/亩"
                />
              </>
            )}
          </div>

          {abnormalHarvests.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-farm-danger/10 to-farm-warning/10 border-b border-farm-danger/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-farm-danger" />
                  <h3 className="font-semibold text-farm-primary-dark">异常地块分析</h3>
                  <span className="badge-danger">{abnormalHarvests.length} 条异常</span>
                </div>
              </div>
              <div className="divide-y divide-farm-border/60">
                {abnormalHarvests.map((h) => {
                  const { season, field } = getSeasonInfo(h.seasonId);
                  const check = checkAbnormality(h.seasonId, h.actualYieldKg);
                  return (
                    <div key={h.id} className="p-5 bg-farm-danger/5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg text-farm-primary-dark">
                              {field?.name ?? '-'}
                            </span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-700">{season?.cropName ?? '-'}</span>
                            <span
                              className={cn(
                                'badge',
                                check.deviation > 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              )}
                            >
                              {check.deviation > 0 ? '↑' : '↓'}
                              {Math.abs(check.deviation)}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(parseISO(h.harvestDate), 'yyyy-MM-dd')}
                            </span>
                            <span>亩产 {Math.round(h.actualYieldKg / (field?.areaMu ?? 1))} kg/亩</span>
                            <span className="text-gray-400">对比历史均值 {check.compareValue} kg/亩</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label-field">异常原因</label>
                          <select
                            className="select-field"
                            value={abnormalReasons[h.id] ?? h.abnormalReason ?? ''}
                            onChange={(e) =>
                              setAbnormalReasons((prev) => ({ ...prev, [h.id]: e.target.value }))
                            }
                          >
                            <option value="">请选择异常原因</option>
                            {ABNORMAL_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label-field">分析备注</label>
                          <div className="flex gap-2">
                            <textarea
                              className="input-field min-h-[44px] resize-y flex-1"
                              placeholder="详细分析..."
                              value={abnormalNotes[h.id] ?? h.analysisNote ?? ''}
                              onChange={(e) =>
                                setAbnormalNotes((prev) => ({ ...prev, [h.id]: e.target.value }))
                              }
                            />
                            <button
                              className="btn-primary self-end"
                              onClick={() => handleSaveAbnormalAnalysis(h.id)}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editId ? '编辑收成记录' : '录入收成'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleSubmit}>
              {editId ? '保存修改' : '提交'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label-field">
              选择种植季 <span className="text-farm-danger">*</span>
            </label>
            <select
              className="select-field"
              value={form.seasonId}
              disabled={!!editId}
              onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}
            >
              <option value="">请选择种植季</option>
              {(editId ? seasons.filter((s) => s.id === form.seasonId) : availableSeasonsForHarvest).map((s) => {
                const f = fields.find((f) => f.id === s.fieldId);
                return (
                  <option key={s.id} value={s.id}>
                    [{f?.name ?? '未知'}] {s.cropName}（预{format(parseISO(s.expectedHarvestDate), 'M月d日')}）
                  </option>
                );
              })}
            </select>
            {!editId && availableSeasonsForHarvest.length === 0 && (
              <p className="text-xs text-farm-warning mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                当前没有到达收获期80%以上的种植季
              </p>
            )}
          </div>

          <div>
            <label className="label-field">
              收获日期 <span className="text-farm-danger">*</span>
            </label>
            <input
              type="date"
              className="input-field"
              value={form.harvestDate}
              onChange={(e) => setForm((f) => ({ ...f, harvestDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">
                实际产量 (kg) <span className="text-farm-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input-field"
                placeholder="如：8500"
                value={form.actualYieldKg}
                onChange={(e) => setForm((f) => ({ ...f, actualYieldKg: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field">
                单价 (¥/kg) <span className="text-farm-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                placeholder="如：2.50"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
          </div>

          {form.actualYieldKg && form.unitPrice && (
            <div className="p-4 rounded-xl bg-farm-primary/5 border border-farm-primary/15">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">预计产值</span>
                <span className="text-xl font-bold text-farm-accent">
                  ¥{Math.round(parseFloat(form.actualYieldKg) * parseFloat(form.unitPrice)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="label-field">
              品质等级 <span className="text-farm-danger">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(QUALITY_LEVEL_LABEL) as QualityLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, qualityLevel: level }))}
                  className={cn(
                    'py-2.5 rounded-lg border text-sm font-medium transition-all duration-200',
                    form.qualityLevel === level
                      ? cn(QUALITY_COLORS[level], 'border-current shadow-sm scale-[1.02]')
                      : 'bg-farm-surface border-farm-border text-gray-500 hover:border-farm-primary/30 hover:text-gray-700'
                  )}
                >
                  {QUALITY_LEVEL_LABEL[level]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isAbnormalAlertOpen}
        onClose={() => {
          setIsAbnormalAlertOpen(false);
          setPendingHarvest(null);
        }}
        onConfirm={confirmAbnormalHarvest}
        title="产量异常检测"
        message={`系统检测到本次录入的亩产与历史均值偏差达 ${pendingHarvest?.deviation ?? 0}%，已超过 ±15% 阈值，将标记为异常产量。是否继续提交？后续可在产量对比页补充异常原因分析。`}
        confirmText="标记异常并提交"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="确认删除"
        message="确定要删除这条收成记录吗？此操作无法撤销。"
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}

