import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Filter,
  Trash2, Calendar, MapPin, Sprout, Coins,
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { DonutChart } from '@/components/charts';
import {
  COST_CATEGORY_LABEL, COST_CATEGORY_COLOR, type CostCategory,
} from '@/types';
import {
  calculateAllSeasonsFinanceSummary,
  calculateSeasonTotalCost,
  calculateSeasonRevenue,
  calculateSeasonProfit,
  getCostBreakdownByCategory,
  calculatePerMuMetrics,
} from '@/services/financeService';
import { cn } from '@/lib/utils';

const COST_CATEGORIES: CostCategory[] = ['seed', 'pesticide', 'fertilizer', 'labor', 'other'];

const categoryBadgeColor: Record<CostCategory, string> = {
  seed: 'bg-green-100 text-green-700',
  pesticide: 'bg-red-100 text-red-700',
  fertilizer: 'bg-blue-100 text-blue-700',
  labor: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

type TabKey = 'cost' | 'revenue';

export default function Finance() {
  const { fields, seasons, costs, harvests, showToast, addCost, deleteCost } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('cost');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<CostCategory | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey | null;
    if (tabFromUrl && ['cost', 'revenue'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    const seasonFromUrl = searchParams.get('season');
    const categoryFromUrl = searchParams.get('category') as CostCategory | null;
    const dateFromUrl = searchParams.get('dateFrom');
    const dateToUrl = searchParams.get('dateTo');
    if (seasonFromUrl) setSeasonFilter(seasonFromUrl);
    if (categoryFromUrl && ['seed','pesticide','fertilizer','labor','other'].includes(categoryFromUrl)) {
      setCategoryFilter(categoryFromUrl);
    }
    if (dateFromUrl) setDateFrom(dateFromUrl);
    if (dateToUrl) setDateTo(dateToUrl);
    if (searchParams.get('new') === '1') {
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    seasonId: '', category: 'seed' as CostCategory,
    amount: '', date: todayStr, description: '',
  });

  // 按时间范围过滤的成本和收成（全局用）
  const timeFilteredCosts = useMemo(() => {
    if (!dateFrom || !dateTo) return costs;
    return costs.filter(c =>
      isWithinInterval(parseISO(c.date), { start: parseISO(dateFrom), end: parseISO(dateTo) })
    );
  }, [costs, dateFrom, dateTo]);

  const timeFilteredHarvests = useMemo(() => {
    if (!dateFrom || !dateTo) return harvests;
    return harvests.filter(h =>
      isWithinInterval(parseISO(h.harvestDate), { start: parseISO(dateFrom), end: parseISO(dateTo) })
    );
  }, [harvests, dateFrom, dateTo]);

  const hasTimeFilter = Boolean(dateFrom && dateTo);

  const summary = useMemo(() =>
    calculateAllSeasonsFinanceSummary(seasons, fields, timeFilteredCosts, timeFilteredHarvests),
    [seasons, fields, timeFilteredCosts, timeFilteredHarvests]);

  const roi = summary.totalCost > 0
    ? Number((summary.totalRevenue / summary.totalCost).toFixed(2))
    : 0;

  const profitGradient = summary.totalProfit >= 0 ? 'primary' : 'info';

  const filteredCosts = useMemo(() =>
    [...costs]
      .filter(c => seasonFilter === 'all' || c.seasonId === seasonFilter)
      .filter(c => categoryFilter === 'all' || c.category === categoryFilter)
      .filter(c => {
        if (!dateFrom || !dateTo) return true;
        return isWithinInterval(parseISO(c.date), { start: parseISO(dateFrom), end: parseISO(dateTo) });
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [costs, seasonFilter, categoryFilter, dateFrom, dateTo]);

  const hasCostFilter = useMemo(() =>
    seasonFilter !== 'all' || categoryFilter !== 'all' || (dateFrom && dateTo),
    [seasonFilter, categoryFilter, dateFrom, dateTo]);

  const clearCostFilters = () => {
    setSeasonFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const costStructureData = useMemo(() => {
    const map = new Map<CostCategory, number>();
    COST_CATEGORIES.forEach(c => map.set(c, 0));
    filteredCosts.forEach(c => map.set(c.category, (map.get(c.category) || 0) + c.amount));
    return COST_CATEGORIES.map(c => ({
      label: COST_CATEGORY_LABEL[c],
      value: map.get(c) || 0,
      color: COST_CATEGORY_COLOR[c],
    }));
  }, [filteredCosts]);

  const totalFilteredCost = costStructureData.reduce((s, d) => s + d.value, 0);

  const harvestedSeasons = useMemo(() =>
    seasons.filter(s => s.status === 'harvested'),
    [seasons]);

  const getSeasonLabel = (seasonId: string) => {
    const s = seasons.find(x => x.id === seasonId);
    const f = fields.find(x => x.id === s?.fieldId);
    return s ? `${s.cropName} · ${f?.name || '未知'}` : '未知';
  };

  const seasonCards = useMemo(() => harvestedSeasons.map(season => {
    const field = fields.find(f => f.id === season.fieldId);
    const breakdown = getCostBreakdownByCategory(season.id, timeFilteredCosts);
    const totalCost = calculateSeasonTotalCost(season.id, timeFilteredCosts);
    const revenue = calculateSeasonRevenue(season.id, timeFilteredHarvests);
    const profit = calculateSeasonProfit(season.id, timeFilteredCosts, timeFilteredHarvests);
    const metrics = calculatePerMuMetrics(season.id, seasons, fields, timeFilteredCosts, timeFilteredHarvests);
    const roiSeason = totalCost > 0 ? (revenue / totalCost) : 0;

    const categoryBreakdown = COST_CATEGORIES.map(c => {
      const item = breakdown.find(b => b.category === c);
      return { category: c, label: COST_CATEGORY_LABEL[c], amount: item?.amount || 0 };
    });

    const seasonHarvests = timeFilteredHarvests.filter(h => h.seasonId === season.id);

    return {
      season, field, breakdown: categoryBreakdown,
      totalCost, revenue, profit, metrics, roi: roiSeason,
      totalYield: seasonHarvests.reduce((s, h) => s + h.actualYieldKg, 0),
      avgUnitPrice: (() => {
        const hs = seasonHarvests;
        if (hs.length === 0) return 0;
        const totalRev = hs.reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
        const totalKg = hs.reduce((s, h) => s + h.actualYieldKg, 0);
        return totalKg > 0 ? Number((totalRev / totalKg).toFixed(2)) : 0;
      })(),
      hasData: totalCost > 0 || revenue > 0,
    };
  }).filter(card => !hasTimeFilter || card.hasData),
  [harvestedSeasons, fields, timeFilteredCosts, timeFilteredHarvests, seasons, hasTimeFilter]);

  const openCreateModal = () => {
    setForm({ seasonId: seasons[0]?.id || '', category: 'seed', amount: '', date: todayStr, description: '' });
    setModalOpen(true);
  };

  const submitCreate = () => {
    const amt = parseFloat(form.amount);
    if (!form.seasonId) return showToast('请选择种植季', 'error');
    if (!form.category) return showToast('请选择类别', 'error');
    if (isNaN(amt) || amt <= 0) return showToast('请输入有效金额', 'error');
    if (!form.date) return showToast('请选择日期', 'error');
    addCost({
      seasonId: form.seasonId,
      category: form.category,
      amount: amt,
      date: form.date,
      description: form.description.trim(),
    });
    showToast('成本记录已添加', 'success');
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteDialog.id) {
      deleteCost(deleteDialog.id);
      showToast('成本记录已删除', 'success');
    }
    setDeleteDialog({ open: false, id: null });
  };

  const progressBarColor = (profit: number) =>
    profit >= 0 ? 'from-green-400 to-green-600' : 'from-red-400 to-red-600';

  return (
    <div className="space-y-6">
      <PageHeader
        title="成本与收益"
        subtitle="全方位追踪种植投入与产出，掌握农场经营盈亏"
        breadcrumb={['财务管理', '成本与收益']}
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4" />新增成本
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总投入成本"
          value={`¥${summary.totalCost.toLocaleString('zh-CN')}`}
          icon={Wallet}
          trend={8.2}
          gradient="accent"
        />
        <StatCard
          title="总产值"
          value={`¥${summary.totalRevenue.toLocaleString('zh-CN')}`}
          icon={Coins}
          trend={15.6}
          gradient="info"
        />
        <StatCard
          title="净利润"
          value={`¥${summary.totalProfit.toLocaleString('zh-CN')}`}
          icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown}
          trend={summary.totalProfit >= 0 ? 22.3 : -5.1}
          gradient={profitGradient}
        />
        <StatCard
          title="投入产出比"
          value={roi.toFixed(2)}
          suffix="倍"
          icon={TrendingUp}
          trend={6.8}
          gradient="warning"
        />
      </div>

      {hasTimeFilter && (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-farm-primary" />
            <span className="text-gray-600">时间范围：</span>
            <input
              type="date"
              className="input-field !w-32 !py-1.5 !text-sm"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              className="input-field !w-32 !py-1.5 !text-sm"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-gray-500 hover:text-farm-primary transition-colors"
          >
            清除时间筛选
          </button>
        </div>
      )}

      <div className="card p-1 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('cost')}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'cost'
              ? 'bg-gradient-primary text-white shadow-soft'
              : 'text-gray-600 hover:bg-farm-primary/8'
          )}
        >
          成本管理
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'revenue'
              ? 'bg-gradient-primary text-white shadow-soft'
              : 'text-gray-600 hover:bg-farm-primary/8'
          )}
        >
          收益核算
        </button>
      </div>

      {activeTab === 'cost' && (
        <>
          <div className="card">
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="font-medium">筛选：</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">种植季：</span>
                <select
                  className="select-field !w-auto min-w-[180px]"
                  value={seasonFilter}
                  onChange={e => setSeasonFilter(e.target.value)}
                >
                  <option value="all">全部种植季</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{getSeasonLabel(s.id)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">类别：</span>
                <select
                  className="select-field !w-auto min-w-[140px]"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as CostCategory | 'all')}
                >
                  <option value="all">全部类别</option>
                  {COST_CATEGORIES.map(c => (
                    <option key={c} value={c}>{COST_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              {!hasTimeFilter && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    className="input-field !w-32"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    placeholder="开始日期"
                  />
                  <span className="text-gray-400 text-sm">至</span>
                  <input
                    type="date"
                    className="input-field !w-32"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    placeholder="结束日期"
                  />
                </div>
              )}
              {hasCostFilter && (
                <button onClick={clearCostFilters} className="btn-ghost text-sm">
                  清除筛选
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-farm-primary-dark">成本明细列表</h2>
                <span className="text-sm text-gray-500">
                  共 {filteredCosts.length} 条，合计 ¥{totalFilteredCost.toLocaleString('zh-CN')}
                </span>
              </div>
              {filteredCosts.length === 0 ? (
                hasCostFilter ? (
                  <EmptyState
                    icon={Wallet}
                    title="未找到匹配的成本记录"
                    description="当前筛选条件下没有成本记录，试试调整筛选条件"
                    variant="no-match"
                    onClearFilter={clearCostFilters}
                  />
                ) : (
                  <EmptyState
                    icon={Wallet}
                    title="暂无成本记录"
                    description="点击右上角新增成本开始记录您的投入"
                    actionText="新增成本"
                    onAction={() => setModalOpen(true)}
                  />
                )
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="table-wrap">
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>地块/作物</th>
                        <th>类别</th>
                        <th>金额</th>
                        <th>描述</th>
                        <th className="text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCosts.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(parseISO(c.date), 'yyyy-MM-dd', { locale: zhCN })}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Sprout className="w-3.5 h-3.5 text-farm-primary" />
                              <span className="text-sm">{getSeasonLabel(c.seasonId)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={cn('badge', categoryBadgeColor[c.category])}>
                              {COST_CATEGORY_LABEL[c.category]}
                            </span>
                          </td>
                          <td className="font-semibold text-farm-primary-dark">
                            ¥{c.amount.toLocaleString('zh-CN')}
                          </td>
                          <td className="text-sm text-gray-600 max-w-[200px] truncate">
                            {c.description || '-'}
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => setDeleteDialog({ open: true, id: c.id })}
                              className="btn-ghost px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-farm-primary-dark mb-4">成本结构分布</h2>
              <DonutChart
                data={costStructureData}
                centerText={`¥${totalFilteredCost.toLocaleString('zh-CN')}`}
                centerSubtext="总成本"
                size={220}
              />
            </div>
          </div>
        </>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {seasonCards.length === 0 ? (
            hasTimeFilter ? (
              <EmptyState
                icon={Sprout}
                title="未找到匹配的收益记录"
                description="当前时间范围内没有已收获的种植季，试试调整时间范围"
                variant="no-match"
                onClearFilter={() => { setDateFrom(''); setDateTo(''); }}
              />
            ) : (
              <EmptyState icon={Sprout} title="暂无已收获种植季" description="等种植季收获后可查看收益明细" />
            )
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {seasonCards.map(({ season, field, breakdown, totalCost, revenue, profit, metrics, roi, totalYield, avgUnitPrice }) => {
                const maxVal = Math.max(totalCost, revenue, 1);
                const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
                return (
                  <div key={season.id} className="card card-hover">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-farm-primary-dark flex items-center gap-2">
                          <Sprout className="w-5 h-5 text-farm-primary" />
                          {season.cropName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {field?.name} · {field?.areaMu}亩
                        </div>
                      </div>
                      <span className={cn(
                        'badge text-sm px-3 py-1.5',
                        profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {profit >= 0 ? '盈利' : '亏损'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 p-3 bg-farm-surface-alt/60 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-2">成本明细</div>
                      {breakdown.map(b => (
                        <div key={b.category} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{b.label}</span>
                          <span className="font-medium text-gray-700">¥{b.amount.toLocaleString('zh-CN')}</span>
                        </div>
                      ))}
                      <div className="h-px bg-farm-border/60 my-2" />
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-gray-700">成本合计</span>
                        <span className="text-farm-primary-dark">¥{totalCost.toLocaleString('zh-CN')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2.5 bg-blue-50/60 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">产量</div>
                        <div className="text-lg font-bold text-blue-700">{(totalYield / 1000).toFixed(1)}t</div>
                      </div>
                      <div className="text-center p-2.5 bg-amber-50/60 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">单价</div>
                        <div className="text-lg font-bold text-amber-700">¥{avgUnitPrice}/kg</div>
                      </div>
                      <div className="text-center p-2.5 bg-farm-primary/10 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">产值</div>
                        <div className="text-lg font-bold text-farm-primary-dark">¥{(revenue / 10000).toFixed(1)}万</div>
                      </div>
                    </div>

                    <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-farm-primary/8 to-farm-accent/8 border border-farm-primary/15">
                      <div className="text-xs text-gray-500 mb-1">净利润</div>
                      <div className={cn(
                        'text-3xl font-bold',
                        profit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {profit >= 0 ? '+' : ''}¥{profit.toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        利润率 {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-farm-surface-alt/60 rounded-lg">
                        <div className="text-xs text-gray-500 mb-0.5">每亩净利润</div>
                        <div className={cn(
                          'text-base font-bold',
                          metrics.profitPerMu >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          ¥{metrics.profitPerMu.toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="p-3 bg-farm-surface-alt/60 rounded-lg">
                        <div className="text-xs text-gray-500 mb-0.5">投入产出比</div>
                        <div className="text-base font-bold text-farm-primary-dark">
                          {roi.toFixed(2)} 倍
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span>成本</span>
                        <span>盈亏状态</span>
                        <span>产值</span>
                      </div>
                      <div className="progress-bar h-3">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r', progressBarColor(profit))}
                          style={{
                            width: `${Math.max(5, Math.min(100, (revenue / maxVal) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新增成本记录"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn-primary" onClick={submitCreate}>提交</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-field">种植季 <span className="text-red-500">*</span></label>
            <select
              className="select-field"
              value={form.seasonId}
              onChange={e => setForm({ ...form, seasonId: e.target.value })}
            >
              <option value="">请选择种植季</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{getSeasonLabel(s.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">成本类别 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-5 gap-2">
              {COST_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium border transition-all',
                    form.category === c
                      ? 'border-farm-primary bg-farm-primary/10 text-farm-primary-dark'
                      : 'border-farm-border bg-farm-surface text-gray-600 hover:border-farm-primary/40'
                  )}
                >
                  {COST_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">金额（元） <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="input-field"
              placeholder="请输入金额"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">日期 <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">描述</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              placeholder="可选：补充说明"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="删除成本记录"
        message="确定要删除这条成本记录吗？此操作不可撤销。"
      />
    </div>
  );
}
