import { useMemo, useState } from 'react';
import {
  BarChart3, Download, Trophy, MapPin, Calendar,
  TrendingUp, Award, Star, Target, Zap, Leaf,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { LineChart, BarChart } from '@/components/charts';
import {
  compareCropVarieties,
  rankFieldsByEfficiency,
  getMonthlyYieldTrend,
} from '@/services/reportService';
import { cn } from '@/lib/utils';

type TabKey = 'variety' | 'field' | 'trend';

export default function Reports() {
  const { fields, seasons, costs, harvests, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('variety');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    harvests.forEach(h => years.add(new Date(h.harvestDate).getFullYear()));
    seasons.forEach(s => years.add(new Date(s.sowingDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [harvests, seasons]);

  const filteredHarvests = useMemo(() =>
    yearFilter === 'all'
      ? harvests
      : harvests.filter(h => new Date(h.harvestDate).getFullYear() === parseInt(yearFilter)),
    [harvests, yearFilter]);

  const filteredSeasons = useMemo(() => {
    if (yearFilter === 'all') return seasons;
    const yr = parseInt(yearFilter);
    return seasons.filter(s => {
      const sowYr = new Date(s.sowingDate).getFullYear();
      const harvestYr = new Date(s.expectedHarvestDate).getFullYear();
      return sowYr === yr || harvestYr === yr;
    });
  }, [seasons, yearFilter]);

  const varietyComparisons = useMemo(() =>
    compareCropVarieties(filteredSeasons, fields, costs, filteredHarvests),
    [filteredSeasons, fields, costs, filteredHarvests]);

  const varietyBarData = useMemo(() =>
    varietyComparisons.map(v => ({
      label: v.cropName,
      value: v.averageYieldPerMu,
      color: '#2D6A4F',
    })), [varietyComparisons]);

  const varietyRevenueData = useMemo(() =>
    varietyComparisons.map(v => ({
      label: v.cropName,
      value: v.averageProfitPerMu,
      color: '#D4A373',
    })), [varietyComparisons]);

  const avgYield = useMemo(() => {
    const vals = varietyComparisons.map(v => v.averageYieldPerMu);
    return vals.length > 0 ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(0)) : 0;
  }, [varietyComparisons]);

  const avgProfit = useMemo(() => {
    const vals = varietyComparisons.map(v => v.averageProfitPerMu);
    return vals.length > 0 ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(0)) : 0;
  }, [varietyComparisons]);

  const fieldRanks = useMemo(() =>
    rankFieldsByEfficiency(filteredSeasons, fields, costs, filteredHarvests),
    [filteredSeasons, fields, costs, filteredHarvests]);

  const maxNetProfit = useMemo(() =>
    Math.max(...fieldRanks.map(r => Math.abs(r.netProfit)), 1),
    [fieldRanks]);

  const monthlyTrend = useMemo(() => {
    const trend = getMonthlyYieldTrend(filteredHarvests, filteredSeasons, 12);
    return trend.map(t => {
      const yr = t.year;
      const mn = t.monthNum;
      const monthCosts = costs.filter(c => {
        const d = new Date(c.date);
        return d.getFullYear() === yr && d.getMonth() + 1 === mn;
      }).reduce((s, c) => s + c.amount, 0);
      const monthRevenue = filteredHarvests.filter(h => {
        const d = new Date(h.harvestDate);
        return d.getFullYear() === yr && d.getMonth() + 1 === mn;
      }).reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
      const costVal = Number(monthCosts.toFixed(0));
      const revVal = Number(monthRevenue.toFixed(0));
      return {
        label: `${mn}月`,
        value: revVal,
        投入: costVal,
        产出: revVal,
      };
    });
  }, [filteredHarvests, filteredSeasons, costs]);

  const profitRateTrend = useMemo(() =>
    monthlyTrend.map(m => {
      const profit = m.产出 - m.投入;
      const rate = m.投入 > 0 ? Number(((profit / m.投入) * 100).toFixed(1)) : 0;
      return { label: m.label, value: rate };
    }), [monthlyTrend]);

  const insights = useMemo(() => {
    const bestVariety = varietyComparisons[0];
    const bestField = fieldRanks[0];
    const bestMonth = (() => {
      let best = monthlyTrend[0];
      let bestProfit = -Infinity;
      monthlyTrend.forEach(m => {
        const p = m.产出 - m.投入;
        if (p > bestProfit) { bestProfit = p; best = m; }
      });
      return best;
    })();
    return { bestVariety, bestField, bestMonth, bestMonthProfit: bestMonth ? bestMonth.产出 - bestMonth.投入 : 0 };
  }, [varietyComparisons, fieldRanks, monthlyTrend]);

  const handleExport = () => {
    showToast('报告导出中...（模拟）', 'info');
    setTimeout(() => showToast('报告导出成功！', 'success'), 1200);
  };

  const rankRowBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-50 via-yellow-50 to-transparent';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 via-slate-50 to-transparent';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 via-amber-50/50 to-transparent';
    return '';
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return { icon: Trophy, cls: 'bg-yellow-400 text-yellow-900', label: '第1名' };
    if (rank === 2) return { icon: Award, cls: 'bg-gray-300 text-gray-700', label: '第2名' };
    if (rank === 3) return { icon: MedalPlaceholder, cls: 'bg-amber-600 text-white', label: '第3名' };
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="分析报告"
        subtitle="多维度数据分析报告，洞察农场经营效益"
        breadcrumb={['数据分析', '分析报告']}
        actions={
          <button className="btn-primary" onClick={handleExport}>
            <Download className="w-4 h-4" />导出报告
          </button>
        }
      />

      <div className="card p-1 inline-flex gap-1">
        {[
          { k: 'variety', label: '品种对比', icon: Leaf },
          { k: 'field', label: '地块排行', icon: MapPin },
          { k: 'trend', label: '投入产出', icon: TrendingUp },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k as TabKey)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5',
              activeTab === t.k
                ? 'bg-gradient-primary text-white shadow-soft'
                : 'text-gray-600 hover:bg-farm-primary/8'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'variety' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-600">年度筛选：</span>
                <select
                  className="select-field !w-auto min-w-[140px]"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                >
                  <option value="all">全部年度</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                共 {varietyComparisons.length} 个品种参与对比
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-farm-primary" />
                品种亩产与亩均净利润对比
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: '#2D6A4F' }} />
                  <span className="text-gray-600">平均亩产(kg)</span>
                  <span className="text-gray-400">参考线: {avgYield}kg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: '#D4A373' }} />
                  <span className="text-gray-600">亩净利润(元)</span>
                  <span className="text-gray-400">参考线: ¥{avgProfit}</span>
                </div>
              </div>
            </div>
            {varietyBarData.length === 0 ? (
              <EmptyState icon={Leaf} title="暂无对比数据" description="请先录入收成数据" />
            ) : (
              <BarChart
                data={varietyBarData}
                compareData={varietyRevenueData}
                height={320}
                yUnit=""
              />
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-farm-primary-dark mb-4">品种效益明细</h2>
            {varietyComparisons.length === 0 ? (
              <EmptyState icon={Leaf} title="暂无数据" description="请选择年度或录入收成" />
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="table-wrap">
                  <thead>
                    <tr>
                      <th>品种</th>
                      <th>种植次数</th>
                      <th>平均亩产</th>
                      <th>亩均成本</th>
                      <th>亩均净利润</th>
                      <th>投入产出比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varietyComparisons.map((v, i) => {
                      const roi = v.averageCostPerMu > 0
                        ? (v.averageProfitPerMu + v.averageCostPerMu) / v.averageCostPerMu
                        : 0;
                      return (
                        <tr key={v.cropName}>
                          <td>
                            <div className="flex items-center gap-2">
                              {i < 3 && <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>}
                              <span className="font-semibold text-farm-primary-dark">{v.cropName}</span>
                            </div>
                          </td>
                          <td className="text-gray-600">{v.sampleCount} 次</td>
                          <td className="font-medium">{v.averageYieldPerMu.toLocaleString()} kg</td>
                          <td className="text-gray-600">¥{v.averageCostPerMu.toLocaleString()}</td>
                          <td className={cn(
                            'font-semibold',
                            v.averageProfitPerMu >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {v.averageProfitPerMu >= 0 ? '+' : ''}¥{v.averageProfitPerMu.toLocaleString()}
                          </td>
                          <td className="font-medium text-farm-primary-dark">{roi.toFixed(2)} 倍</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'field' && (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              地块效益排行榜
            </h2>
            {fieldRanks.length === 0 ? (
              <EmptyState icon={MapPin} title="暂无排行数据" />
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="table-wrap">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>地块名称</th>
                      <th>累计产量</th>
                      <th>总投入</th>
                      <th>总产出</th>
                      <th>净利润</th>
                      <th>亩产</th>
                      <th className="min-w-[180px]">净利润可视化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldRanks.map((r) => {
                      const field = fields.find(f => f.id === r.fieldId);
                      const areaMu = field?.areaMu || 1;
                      const yieldPerMu = areaMu > 0 ? r.totalYield / areaMu : 0;
                      const badge = rankBadge(r.rank);
                      return (
                        <tr key={r.fieldId} className={rankRowBg(r.rank)}>
                          <td>
                            <div className="flex items-center gap-2">
                              {badge ? (
                                <span className={cn('badge flex items-center gap-1', badge.cls)}>
                                  <badge.icon className="w-3.5 h-3.5" />
                                  {r.rank}
                                </span>
                              ) : (
                                <span className="text-gray-500 font-medium w-6 text-center">{r.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="font-semibold text-farm-primary-dark">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-farm-primary" />
                              {r.fieldName}
                              <span className="text-xs text-gray-400">({field?.areaMu || 0}亩)</span>
                            </div>
                          </td>
                          <td className="text-gray-600">{(r.totalYield / 1000).toFixed(1)} t</td>
                          <td className="text-gray-600">¥{(r.totalCost / 10000).toFixed(1)}万</td>
                          <td className="text-gray-600">¥{(r.totalRevenue / 10000).toFixed(1)}万</td>
                          <td className={cn(
                            'font-bold',
                            r.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {r.netProfit >= 0 ? '+' : ''}¥{r.netProfit.toLocaleString()}
                          </td>
                          <td className="font-medium text-farm-primary-dark">{yieldPerMu.toFixed(0)} kg</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-700',
                                    r.netProfit >= 0
                                      ? 'bg-gradient-to-r from-green-400 to-green-600'
                                      : 'bg-gradient-to-r from-red-400 to-red-600'
                                  )}
                                  style={{
                                    width: `${Math.max(3, Math.min(100, (Math.abs(r.netProfit) / maxNetProfit) * 100))}%`,
                                  }}
                                />
                              </div>
                              <span className={cn(
                                'text-xs font-medium w-14 text-right',
                                r.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              )}>
                                {((Math.abs(r.netProfit) / maxNetProfit) * 100).toFixed(0)}%
                              </span>
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

          <div className="card">
            <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-farm-primary" />
              地块效率多维度评分
            </h2>
            {fieldRanks.length === 0 ? (
              <EmptyState icon={Target} title="暂无评分数据" />
            ) : (
              <BarChart
                horizontal
                data={fieldRanks.slice(0, 6).map(r => ({
                  label: r.fieldName,
                  value: Number((r.totalRevenue / Math.max(r.totalCost, 1)).toFixed(2)),
                  color: '#2D6A4F',
                }))}
                height={320}
                yUnit="x"
                showValue
              />
            )}
          </div>
        </>
      )}

      {activeTab === 'trend' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card card-hover !p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 text-white">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <Star className="w-4 h-4" />最佳品种
                </div>
                <div className="text-2xl font-bold mt-1">
                  {insights.bestVariety?.cropName || '-'}
                </div>
                <div className="text-sm text-white/80 mt-0.5">
                  亩净利润 {insights.bestVariety ? `¥${insights.bestVariety.averageProfitPerMu.toLocaleString()}` : '-'}
                </div>
              </div>
            </div>
            <div className="card card-hover !p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 text-white">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <MapPin className="w-4 h-4" />最佳地块
                </div>
                <div className="text-2xl font-bold mt-1">
                  {insights.bestField?.fieldName || '-'}
                </div>
                <div className="text-sm text-white/80 mt-0.5">
                  净利润 {insights.bestField ? `¥${insights.bestField.netProfit.toLocaleString()}` : '-'}
                </div>
              </div>
            </div>
            <div className="card card-hover !p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 text-white">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <Calendar className="w-4 h-4" />最佳月份
                </div>
                <div className="text-2xl font-bold mt-1">
                  {insights.bestMonth?.label || '-'}
                </div>
                <div className="text-sm text-white/80 mt-0.5">
                  净收益 {insights.bestMonthProfit >= 0 ? '+' : ''}¥{insights.bestMonthProfit.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-farm-primary" />
                近12个月投入产出趋势
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-farm-danger rounded-full" />
                  <span className="text-gray-600">投入成本</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-farm-primary rounded-full" />
                  <span className="text-gray-600">产出收益</span>
                </div>
              </div>
            </div>
            <LineChart
              data={monthlyTrend}
              lines={[
                { key: '投入', color: '#E76F51', label: '投入(元)' },
                { key: '产出', color: '#2D6A4F', label: '产出(元)' },
              ]}
              height={300}
              yUnit="元"
              showArea
            />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              月度利润率趋势（%）
            </h2>
            <BarChart
              data={profitRateTrend.map(p => ({
                label: p.label,
                value: p.value,
                color: p.value >= 0 ? '#52B788' : '#E76F51',
              }))}
              height={260}
              yUnit="%"
            />
          </div>
        </>
      )}
    </div>
  );
}

function MedalPlaceholder() {
  return <Star className="w-3.5 h-3.5" />;
}
