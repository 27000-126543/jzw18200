import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, Edit, Trash2, Eye, Sprout, TrendingUp,
  Scale, Map, Calendar, Coins, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LineChart, BarChart, DonutChart } from '@/components/charts';
import { CROP_VARIETIES } from '@/data/mockData';
import { SOIL_TYPE_LABEL, OPERATION_TYPE_LABEL, SEASON_STATUS_LABEL, QUALITY_LEVEL_LABEL } from '@/types';
import type { Field, SoilType } from '@/types';

interface FieldFormState {
  name: string;
  areaMu: string;
  soilType: SoilType;
  location: string;
  note: string;
}

const emptyForm: FieldFormState = {
  name: '',
  areaMu: '',
  soilType: 'loam',
  location: '',
  note: '',
};

const soilTypeColors: Record<SoilType, string> = {
  sandy: 'bg-amber-100 text-amber-800',
  loam: 'bg-green-100 text-green-800',
  clay: 'bg-orange-100 text-orange-800',
  silty: 'bg-sky-100 text-sky-800',
  peaty: 'bg-emerald-100 text-emerald-800',
  saline: 'bg-purple-100 text-purple-800',
};

export default function Fields() {
  const navigate = useNavigate();
  const { fields, seasons, harvests, costs, showToast, addField, updateField, deleteField } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [form, setForm] = useState<FieldFormState>(emptyForm);
  const [detailField, setDetailField] = useState<Field | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Field | null>(null);

  const getFieldStats = (fieldId: string) => {
    const fieldSeasons = seasons.filter(s => s.fieldId === fieldId);
    const fieldHarvests = harvests.filter(h => fieldSeasons.some(s => s.id === h.seasonId));
    const fieldCosts = costs.filter(c => fieldSeasons.some(s => s.id === c.seasonId));
    const seasonCount = fieldSeasons.length;
    const totalYield = fieldHarvests.reduce((s, h) => s + h.actualYieldKg, 0);
    const totalRevenue = fieldHarvests.reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
    const totalCost = fieldCosts.reduce((s, c) => s + c.amount, 0);
    const field = fields.find(f => f.id === fieldId);
    const avgYieldPerMu = field && field.areaMu > 0 && seasonCount > 0
      ? totalYield / field.areaMu / seasonCount : 0;
    const avgProfitPerMu = field && field.areaMu > 0 && seasonCount > 0
      ? (totalRevenue - totalCost) / field.areaMu / seasonCount : 0;
    return { seasonCount, totalYield, totalRevenue, totalCost, avgYieldPerMu, avgProfitPerMu, fieldSeasons, fieldHarvests, fieldCosts };
  };

  const hasActiveSeason = (fieldId: string) => {
    return seasons.some(s => s.fieldId === fieldId && s.status !== 'harvested');
  };

  const handleAddClick = () => {
    setEditingField(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const handleEditClick = (field: Field) => {
    setEditingField(field);
    setForm({
      name: field.name,
      areaMu: String(field.areaMu),
      soilType: field.soilType,
      location: field.location,
      note: field.note || '',
    });
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    if (!form.name.trim()) { showToast('请输入地块名称', 'error'); return; }
    const area = parseFloat(form.areaMu);
    if (isNaN(area) || area <= 0) { showToast('请输入有效的面积', 'error'); return; }
    if (!form.location.trim()) { showToast('请输入位置描述', 'error'); return; }

    if (editingField) {
      updateField(editingField.id, {
        name: form.name.trim(),
        areaMu: area,
        soilType: form.soilType,
        location: form.location.trim(),
        note: form.note.trim() || undefined,
      });
      showToast('地块信息已更新', 'success');
    } else {
      addField({
        name: form.name.trim(),
        areaMu: area,
        soilType: form.soilType,
        location: form.location.trim(),
        note: form.note.trim() || undefined,
      });
      showToast('地块创建成功', 'success');
    }
    setFormOpen(false);
    setEditingField(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteField(deleteTarget.id);
      showToast(`地块"${deleteTarget.name}"已删除`, 'success');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="地块管理"
        subtitle="管理耕地信息，查看种植历史与收益统计"
        breadcrumb={['地块管理']}
        actions={
          <button onClick={handleAddClick} className="btn-primary">
            <Plus className="w-4 h-4" />
            新增地块
          </button>
        }
      />

      {fields.length === 0 ? (
        <EmptyState
          icon={Map}
          title="暂无地块数据"
          description="点击右上角按钮添加您的第一个地块"
          actionText="新增地块"
          onAction={handleAddClick}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {fields.map(field => {
            const stats = getFieldStats(field.id);
            const active = hasActiveSeason(field.id);
            return (
              <div key={field.id} className="card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-lg font-semibold text-farm-primary-dark truncate">{field.name}</h3>
                    <span className={`badge ${soilTypeColors[field.soilType]} shrink-0`}>
                      {SOIL_TYPE_LABEL[field.soilType]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Scale className="w-4 h-4 text-farm-primary" />
                    <span><strong>{field.areaMu}</strong> 亩</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                    <MapPin className="w-4 h-4 text-farm-secondary shrink-0" />
                    <span className="truncate">{field.location}</span>
                  </div>
                </div>

                <div className="mb-3">
                  {active ? (
                    <span className="badge badge-success">
                      <Sprout className="w-3 h-3" />
                      种植中
                    </span>
                  ) : (
                    <span className="badge badge-secondary">空闲</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-y border-farm-border/60">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-0.5">种植次数</div>
                    <div className="text-sm font-semibold text-farm-primary-dark">{stats.seasonCount}季</div>
                  </div>
                  <div className="text-center border-x border-farm-border/60">
                    <div className="text-xs text-gray-500 mb-0.5">累计产量</div>
                    <div className="text-sm font-semibold text-farm-primary-dark">
                      {stats.totalYield >= 1000 ? `${(stats.totalYield / 1000).toFixed(1)}t` : `${stats.totalYield}kg`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-0.5">平均亩产</div>
                    <div className="text-sm font-semibold text-farm-primary-dark">{stats.avgYieldPerMu.toFixed(0)}kg</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button onClick={() => setDetailField(field)} className="btn-secondary flex-1 py-2 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    详情
                  </button>
                  <button onClick={() => handleEditClick(field)} className="btn-secondary py-2 px-3 text-xs">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(field)} className="btn-secondary py-2 px-3 text-xs text-farm-danger hover:bg-farm-danger/10 hover:border-farm-danger/30">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditingField(null); }}
        title={editingField ? '编辑地块' : '新增地块'}
        maxWidth="max-w-xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setFormOpen(false); setEditingField(null); }}>取消</button>
            <button className="btn-primary" onClick={handleFormSubmit}>
              {editingField ? '保存修改' : '创建地块'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-field">地块名称 <span className="text-farm-danger">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="例如：东坡地"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">面积（亩） <span className="text-farm-danger">*</span></label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                placeholder="例如：15.5"
                value={form.areaMu}
                onChange={e => setForm({ ...form, areaMu: e.target.value })}
              />
            </div>
            <div>
              <label className="label-field">土质类型 <span className="text-farm-danger">*</span></label>
              <select
                className="select-field"
                value={form.soilType}
                onChange={e => setForm({ ...form, soilType: e.target.value as SoilType })}
              >
                {(Object.keys(SOIL_TYPE_LABEL) as SoilType[]).map(t => (
                  <option key={t} value={t}>{SOIL_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">位置描述 <span className="text-farm-danger">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="例如：村东头山坡下"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">备注</label>
            <textarea
              className="input-field min-h-[90px] resize-y"
              placeholder="灌溉条件、注意事项等..."
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailField}
        onClose={() => setDetailField(null)}
        title={detailField ? `地块详情 · ${detailField.name}` : ''}
        maxWidth="max-w-3xl"
      >
        {detailField && (() => {
          const stats = getFieldStats(detailField.id);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-farm-primary/8 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />累计种植
                  </div>
                  <div className="text-xl font-bold text-farm-primary-dark">{stats.seasonCount} 季</div>
                </div>
                <div className="bg-farm-success/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Scale className="w-3.5 h-3.5" />累计产量
                  </div>
                  <div className="text-xl font-bold text-farm-primary-dark">
                    {stats.totalYield.toLocaleString()} kg
                  </div>
                </div>
                <div className="bg-farm-secondary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Coins className="w-3.5 h-3.5" />平均亩收益
                  </div>
                  <div className="text-xl font-bold text-farm-primary-dark">
                    ¥{stats.avgProfitPerMu.toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">土质：</span><span className="font-medium">{SOIL_TYPE_LABEL[detailField.soilType]}</span></div>
                <div><span className="text-gray-500">面积：</span><span className="font-medium">{detailField.areaMu} 亩</span></div>
                <div className="col-span-2"><span className="text-gray-500">位置：</span><span className="font-medium">{detailField.location}</span></div>
                {detailField.note && (
                  <div className="col-span-2"><span className="text-gray-500">备注：</span><span className="font-medium">{detailField.note}</span></div>
                )}
              </div>

              <div className="border-t border-farm-border/60 pt-4">
                <h4 className="font-semibold text-farm-primary-dark mb-3 flex items-center gap-2">
                  <Sprout className="w-4 h-4" />种植季历史
                </h4>
                {stats.fieldSeasons.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">暂无种植记录</p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {[...stats.fieldSeasons]
                      .sort((a, b) => parseISO(b.sowingDate).getTime() - parseISO(a.sowingDate).getTime())
                      .map(season => {
                        const hs = stats.fieldHarvests.filter(h => h.seasonId === season.id);
                        const cs = stats.fieldCosts.filter(c => c.seasonId === season.id);
                        const rev = hs.reduce((s, h) => s + h.actualYieldKg * h.unitPrice, 0);
                        const cost = cs.reduce((s, c) => s + c.amount, 0);
                        const statusBadge = season.status === 'growing'
                          ? 'badge-success'
                          : season.status === 'seeding' ? 'badge-info' : 'badge-secondary';
                        return (
                          <div key={season.id} className="bg-farm-surface-alt/60 rounded-lg p-3 hover:bg-farm-surface-alt transition-colors">
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-farm-primary-dark">{season.cropName}</span>
                                <span className={`badge ${statusBadge}`}>{SEASON_STATUS_LABEL[season.status]}</span>
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">
                                {season.sowingDate} → {season.expectedHarvestDate}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-gray-500">产量：</span><strong>{hs.reduce((s, h) => s + h.actualYieldKg, 0).toLocaleString()}kg</strong></div>
                              <div><span className="text-gray-500">成本：</span><strong>¥{cost.toLocaleString()}</strong></div>
                              <div><span className="text-gray-500">收益：</span><strong className="text-farm-primary">¥{(rev - cost).toLocaleString()}</strong></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除地块？"
        message={`删除"${deleteTarget?.name}"将同时移除该地块的所有种植季、操作记录、成本与收成数据，此操作不可恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
