import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, Plus, Eye, ClipboardList, TrendingUp,
  Calendar, Coins, Filter, MapPin,
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LineChart, BarChart, DonutChart } from '@/components/charts';
import { CROP_VARIETIES } from '@/data/mockData';
import { SOIL_TYPE_LABEL, OPERATION_TYPE_LABEL, SEASON_STATUS_LABEL, QUALITY_LEVEL_LABEL, COST_CATEGORY_LABEL, COST_CATEGORY_COLOR } from '@/types';
import type { Season, SeasonStatus } from '@/types';

type StatusFilter = 'all' | SeasonStatus;
const statusColorMap: Record<SeasonStatus, string> = { growing: 'bg-farm-success', seeding: 'bg-farm-info', harvested: 'bg-gray-400' };
const statusBadgeMap: Record<SeasonStatus, string> = { growing: 'badge-success', seeding: 'badge-info', harvested: 'badge-secondary' };
const todayStr = format(new Date(), 'yyyy-MM-dd');

export default function Seasons() {
  const navigate = useNavigate();
  const { fields, seasons, operations, costs, harvests, showToast, addSeason, addOperation, addHarvest } = useAppStore();
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ fieldId: '', cropName: '', sowingDate: todayStr, expectedHarvestDate: todayStr });
  const [detailSeason, setDetailSeason] = useState<Season | null>(null);
  const [opModal, setOpModal] = useState<Season | null>(null);
  const [hvModal, setHvModal] = useState<Season | null>(null);
  const [opForm, setOpForm] = useState({ type: 'irrigate' as const, date: todayStr, dosage: '', operator: '', note: '' });
  const [hvForm, setHvForm] = useState({ harvestDate: todayStr, actualYieldKg: '', qualityLevel: 'good' as const, unitPrice: '' });

  const filtered = useMemo(() => [...seasons]
    .filter(s => fieldFilter === 'all' || s.fieldId === fieldFilter)
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .sort((a, b) => {
      const o: Record<SeasonStatus, number> = { seeding: 0, growing: 1, harvested: 2 };
      return o[a.status] - o[b.status] || parseISO(b.sowingDate).getTime() - parseISO(a.sowingDate).getTime();
    }), [seasons, fieldFilter, statusFilter]);

  const progress = (s: Season) => {
    const total = differenceInDays(parseISO(s.expectedHarvestDate), parseISO(s.sowingDate));
    if (total <= 0) return 0;
    if (s.status === 'harvested') return 100;
    return Math.max(0, Math.min(100, Math.round(differenceInDays(new Date(), parseISO(s.sowingDate)) / total * 100)));
  };

  const nodes = (s: Season) => {
    const crop = CROP_VARIETIES.find(c => c.name === s.cropName);
    const el = differenceInDays(new Date(), parseISO(s.sowingDate));
    const list = (crop?.keyNodes.slice(0, 3) || []).map(n => ({
      name: n.name, day: n.daysAfterSowing,
      state: (s.status === 'harvested' || n.daysAfterSowing < el - 5) ? 'done' as const
        : Math.abs(n.daysAfterSowing - el) <= 7 ? 'current' as const : 'pending' as const,
    }));
    if (list.length === 0 && crop) {
      list.push({ name: '播种', day: 0, state: 'done' });
      list.push({ name: '生长', day: crop.growthDays / 2, state: s.status === 'growing' ? 'current' : 'done' });
      list.push({ name: '收获', day: crop.growthDays, state: s.status === 'harvested' ? 'done' : 'pending' });
    }
    return list;
  };

  const openCreate = () => {
    const first = CROP_VARIETIES[0];
    setForm({
      fieldId: fields[0]?.id || '',
      cropName: first?.name || '',
      sowingDate: todayStr,
      expectedHarvestDate: first ? format(addDays(parseISO(todayStr), first.growthDays), 'yyyy-MM-dd') : todayStr,
    });
    setFormOpen(true);
  };

  const onCropChange = (name: string) => {
    const c = CROP_VARIETIES.find(x => x.name === name);
    const hd = parseISO(form.sowingDate);
    setForm({ ...form, cropName: name, expectedHarvestDate: c ? format(addDays(hd, c.growthDays), 'yyyy-MM-dd') : form.sowingDate });
  };

  const onSowingChange = (d: string) => {
    const c = CROP_VARIETIES.find(x => x.name === form.cropName);
    const hd = parseISO(d);
    setForm({ ...form, sowingDate: d, expectedHarvestDate: c ? format(addDays(hd, c.growthDays), 'yyyy-MM-dd') : d });
  };

  const submitCreate = () => {
    if (!form.fieldId) return showToast('请选择地块', 'error');
    if (!form.cropName) return showToast('请选择作物品种', 'error');
    if (!form.sowingDate || !form.expectedHarvestDate) return showToast('请设置日期', 'error');
    addSeason({ ...form, status: 'seeding' });
    showToast('种植季创建成功', 'success');
    setFormOpen(false);
  };

  const submitOp = () => {
    if (!opModal) return;
    if (!opForm.operator.trim()) return showToast('请输入操作人员', 'error');
    if (!opForm.dosage.trim()) return showToast('请输入用量', 'error');
    addOperation({ seasonId: opModal.id, type: opForm.type, date: opForm.date, dosage: opForm.dosage.trim(), operator: opForm.operator.trim(), note: opForm.note.trim() || undefined });
    showToast('操作记录已保存', 'success');
    setOpModal(null);
  };

  const submitHv = () => {
    if (!hvModal) return;
    const y = parseFloat(hvForm.actualYieldKg), p = parseFloat(hvForm.unitPrice);
    if (isNaN(y) || y <= 0) return showToast('请输入有效产量', 'error');
    if (isNaN(p) || p <= 0) return showToast('请输入有效单价', 'error');
    addHarvest({ seasonId: hvModal.id, harvestDate: hvForm.harvestDate, actualYieldKg: y, qualityLevel: hvForm.qualityLevel, unitPrice: p, isAbnormal: false });
    showToast('收成录入成功', 'success');
    setHvModal(null);
  };

  const seasonStats = (s: Season) => {
    const so = operations.filter(o => o.seasonId === s.id);
    const sc = costs.filter(c => c.seasonId === s.id);
    const sh = harvests.filter(h => h.seasonId === s.id);
    return {
      ops: so, costs: sc, harvests: sh,
      totalCost: sc.reduce((q, c) => q + c.amount, 0),
      totalYield: sh.reduce((q, h) => q + h.actualYieldKg, 0),
      totalRev: sh.reduce((q, h) => q + h.actualYieldKg * h.unitPrice, 0),
      costByCat: sc.reduce<Record<string, number>>((a, c) => { a[c.category] = (a[c.category] || 0) + c.amount; return a; }, {}),
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="种植季管理" subtitle="查看作物生长进度，记录操作与收成" breadcrumb={['种植季管理']}
        actions={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />创建种植季</button>} />

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm"><Filter className="w-4 h-4 text-gray-500" /><span className="font-medium">筛选：</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">地块：</span>
            <select className="select-field !w-auto min-w-[140px]" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
              <option value="all">全部地块</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">状态：</span>
            <div className="flex gap-1">
              {[{ k: 'all', l: '全部' }, { k: 'seeding', l: '育苗中' }, { k: 'growing', l: '生长中' }, { k: 'harvested', l: '已收获' }].map(it => (
                <button key={it.k} onClick={() => setStatusFilter(it.k as StatusFilter)} className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === it.k ? 'bg-gradient-primary text-white shadow-soft' : 'bg-farm-surface-alt text-gray-600 hover:bg-farm-primary/10'}`}>{it.l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sprout} title="暂无种植季" description={fieldFilter === 'all' && statusFilter === 'all' ? '点击右上角创建新的种植季' : '无符合条件的数据'}
          actionText={fieldFilter === 'all' && statusFilter === 'all' ? '创建种植季' : undefined} onAction={fieldFilter === 'all' && statusFilter === 'all' ? openCreate : undefined} />
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const f = fields.find(x => x.id === s.fieldId);
            const pg = progress(s);
            const nd = nodes(s);
            const opCnt = operations.filter(o => o.seasonId === s.id).length;
            return (
              <div key={s.id} className="card-hover relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColorMap[s.status]}`} />
                <div className="pl-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-farm-primary-dark">{s.cropName}</h3>
                        {f && <span className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" />{f.name}</span>}
                        <span className={`badge ${statusBadgeMap[s.status]}`}>{SEASON_STATUS_LABEL[s.status]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{s.sowingDate}</span><span className="text-gray-400">→</span><span>{s.expectedHarvestDate}</span>
                        <span className="text-gray-400">·</span><span className="font-medium text-farm-primary">{pg}% 生长进度</span>
                      </div>
                    </div>
                  </div>
                  <div className="progress-bar mb-4"><div className="progress-bar-fill" style={{ width: `${pg}%` }} /></div>
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-farm-border/60 overflow-x-auto">
                    {nd.map((n, i) => (
                      <div key={i} className="flex items-center gap-2 shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-farm-surface ${n.state === 'done' ? 'bg-farm-success text-white' : n.state === 'current' ? 'bg-farm-warning text-white animate-pulse-soft' : 'bg-gray-200 text-gray-500'}`}>
                          {n.state === 'done' ? '✓' : n.state === 'current' ? '·' : i + 1}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${n.state === 'done' ? 'text-farm-primary-dark' : n.state === 'current' ? 'text-amber-700' : 'text-gray-400'}`}>{n.name}</div>
                          <div className="text-xs text-gray-400">第{n.day}天</div>
                        </div>
                        {i < nd.length - 1 && <div className={`w-10 h-0.5 ${n.state === 'done' ? 'bg-farm-success' : 'bg-gray-200'}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setDetailSeason(s)} className="btn-secondary py-2 text-xs"><Eye className="w-3.5 h-3.5" />查看详情</button>
                    {s.status !== 'harvested' && (<>
                      <button onClick={() => { setOpModal(s); setOpForm({ type: 'irrigate', date: todayStr, dosage: '', operator: '', note: '' }); }} className="btn-secondary py-2 text-xs"><ClipboardList className="w-3.5 h-3.5" />记录操作</button>
                      <button onClick={() => { setHvModal(s); setHvForm({ harvestDate: todayStr, actualYieldKg: '', qualityLevel: 'good', unitPrice: '' }); }} className="btn-primary py-2 text-xs ml-auto"><TrendingUp className="w-3.5 h-3.5" />录入收成</button>
                    </>)}
                    <div className="ml-auto flex items-center gap-1 text-xs text-gray-500"><ClipboardList className="w-3.5 h-3.5" />{opCnt} 次操作</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="创建种植季" maxWidth="max-w-xl"
        footer={<><button className="btn-secondary" onClick={() => setFormOpen(false)}>取消</button><button className="btn-primary" onClick={submitCreate}>创建</button></>}>
        <div className="space-y-4">
          <div><label className="label-field">选择地块 *</label>
            <select className="select-field" value={form.fieldId} onChange={e => setForm({ ...form, fieldId: e.target.value })}>
              <option value="">请选择</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}（{f.areaMu}亩，{SOIL_TYPE_LABEL[f.soilType]}）</option>)}
            </select>
          </div>
          <div><label className="label-field">作物品种 *</label>
            <select className="select-field" value={form.cropName} onChange={e => onCropChange(e.target.value)}>
              <option value="">请选择</option>
              {CROP_VARIETIES.map(c => <option key={c.name} value={c.name}>{c.name}（{c.growthDays}天）</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">播种日期 *</label><input type="date" className="input-field" value={form.sowingDate} onChange={e => onSowingChange(e.target.value)} /></div>
            <div><label className="label-field">预计收获期 *</label><input type="date" className="input-field" value={form.expectedHarvestDate} onChange={e => setForm({ ...form, expectedHarvestDate: e.target.value })} /></div>
          </div>
          {form.cropName && form.sowingDate && (
            <div className="bg-farm-primary/5 rounded-lg p-3 text-sm text-farm-primary-dark">
              <strong>生长周期：</strong>{CROP_VARIETIES.find(c => c.name === form.cropName)?.growthDays || '?'}天，共 {differenceInDays(parseISO(form.expectedHarvestDate), parseISO(form.sowingDate))} 天
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!detailSeason} onClose={() => setDetailSeason(null)} title={detailSeason ? `详情 · ${detailSeason.cropName}` : ''} maxWidth="max-w-3xl">
        {detailSeason && (() => {
          const f = fields.find(x => x.id === detailSeason.fieldId);
          const st = seasonStats(detailSeason);
          const pg = progress(detailSeason);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-farm-primary/8 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">生长进度</div><div className="text-xl font-bold">{pg}%</div><div className="progress-bar mt-2"><div className="progress-bar-fill" style={{ width: `${pg}%` }} /></div></div>
                <div className="bg-farm-success/10 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">累计产量</div><div className="text-xl font-bold">{st.totalYield.toLocaleString()} kg</div></div>
                <div className="bg-farm-danger/10 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1"><Coins className="w-3 h-3 inline" /> 成本</div><div className="text-xl font-bold">¥{st.totalCost.toLocaleString()}</div></div>
                <div className="bg-farm-secondary/20 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1"><TrendingUp className="w-3 h-3 inline" /> 收益</div><div className="text-xl font-bold">¥{(st.totalRev - st.totalCost).toLocaleString()}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">地块：</span><span className="font-medium">{f?.name}</span></div>
                <div><span className="text-gray-500">土质：</span><span className="font-medium">{f && SOIL_TYPE_LABEL[f.soilType]}</span></div>
                <div><span className="text-gray-500">播种：</span><span className="font-medium">{detailSeason.sowingDate}</span></div>
                <div><span className="text-gray-500">预计收获：</span><span className="font-medium">{detailSeason.expectedHarvestDate}</span></div>
              </div>
              {Object.keys(st.costByCat).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Coins className="w-4 h-4" />成本摘要</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(st.costByCat).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: `${COST_CATEGORY_COLOR[k as keyof typeof COST_CATEGORY_COLOR]}22`, color: COST_CATEGORY_COLOR[k as keyof typeof COST_CATEGORY_COLOR] }}>
                        <span className="font-medium">{COST_CATEGORY_LABEL[k as keyof typeof COST_CATEGORY_LABEL]}</span>¥{v.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" />操作记录（{st.ops.length}）</h4>
                {st.ops.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center bg-farm-surface-alt/50 rounded-lg">暂无记录</p> : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {[...st.ops].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(op => (
                      <div key={op.id} className="bg-farm-surface-alt/60 rounded-lg p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-farm-primary/10 flex items-center justify-center font-bold">{OPERATION_TYPE_LABEL[op.type][0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2 mb-1"><div className="flex items-center gap-2"><span className="font-semibold">{OPERATION_TYPE_LABEL[op.type]}</span><span className="text-xs text-gray-500">{op.date}</span></div><span className="text-xs text-gray-500">{op.operator}</span></div>
                          <div className="text-xs text-gray-600"><span className="font-medium">用量：</span>{op.dosage}{op.note && <span className="ml-2">· {op.note}</span>}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!opModal} onClose={() => setOpModal(null)} title={`记录操作 · ${opModal?.cropName || ''}`} maxWidth="max-w-lg"
        footer={<><button className="btn-secondary" onClick={() => setOpModal(null)}>取消</button><button className="btn-primary" onClick={submitOp}>保存</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">操作类型</label>
              <select className="select-field" value={opForm.type} onChange={e => setOpForm({ ...opForm, type: e.target.value as typeof opForm.type })}>
                {(Object.keys(OPERATION_TYPE_LABEL) as Array<keyof typeof OPERATION_TYPE_LABEL>).map(t => <option key={t} value={t}>{OPERATION_TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div><label className="label-field">日期</label><input type="date" className="input-field" value={opForm.date} onChange={e => setOpForm({ ...opForm, date: e.target.value })} /></div>
          </div>
          <div><label className="label-field">用量/方式 *</label><input type="text" className="input-field" placeholder="如：200kg复合肥" value={opForm.dosage} onChange={e => setOpForm({ ...opForm, dosage: e.target.value })} /></div>
          <div><label className="label-field">操作人员 *</label><input type="text" className="input-field" placeholder="张师傅" value={opForm.operator} onChange={e => setOpForm({ ...opForm, operator: e.target.value })} /></div>
          <div><label className="label-field">备注</label><textarea className="input-field min-h-[70px] resize-y" value={opForm.note} onChange={e => setOpForm({ ...opForm, note: e.target.value })} /></div>
        </div>
      </Modal>

      <Modal isOpen={!!hvModal} onClose={() => setHvModal(null)} title={`录入收成 · ${hvModal?.cropName || ''}`} maxWidth="max-w-lg"
        footer={<><button className="btn-secondary" onClick={() => setHvModal(null)}>取消</button><button className="btn-primary" onClick={submitHv}>保存</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">收获日期</label><input type="date" className="input-field" value={hvForm.harvestDate} onChange={e => setHvForm({ ...hvForm, harvestDate: e.target.value })} /></div>
            <div><label className="label-field">品质等级</label>
              <select className="select-field" value={hvForm.qualityLevel} onChange={e => setHvForm({ ...hvForm, qualityLevel: e.target.value as typeof hvForm.qualityLevel })}>
                {(Object.keys(QUALITY_LEVEL_LABEL) as Array<keyof typeof QUALITY_LEVEL_LABEL>).map(k => <option key={k} value={k}>{QUALITY_LEVEL_LABEL[k]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">产量(kg) *</label><input type="number" min="0" step="0.1" className="input-field" placeholder="5000" value={hvForm.actualYieldKg} onChange={e => setHvForm({ ...hvForm, actualYieldKg: e.target.value })} /></div>
            <div><label className="label-field">单价(元/kg) *</label><input type="number" min="0" step="0.1" className="input-field" placeholder="2.8" value={hvForm.unitPrice} onChange={e => setHvForm({ ...hvForm, unitPrice: e.target.value })} /></div>
          </div>
          {hvForm.actualYieldKg && hvForm.unitPrice && !isNaN(parseFloat(hvForm.actualYieldKg)) && !isNaN(parseFloat(hvForm.unitPrice)) && (
            <div className="bg-farm-success/10 rounded-lg p-3 text-sm"><strong>预计收入：</strong>¥{(parseFloat(hvForm.actualYieldKg) * parseFloat(hvForm.unitPrice)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
