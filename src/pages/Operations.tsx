import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  OPERATION_TYPE_LABEL,
  OPERATION_TYPE_EMOJI,
  type OperationType,
} from '@/types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Plus,
  Calendar,
  Filter,
  List,
  GitBranch,
  Trash2,
  User,
  MapPin,
  Leaf,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const OPERATION_COLORS: Record<OperationType, string> = {
  fertilize: 'bg-blue-500',
  pesticide: 'bg-red-500',
  irrigate: 'bg-cyan-500',
  weed: 'bg-green-500',
  prune: 'bg-amber-500',
  other: 'bg-gray-500',
};

const OPERATION_BADGE_COLORS: Record<OperationType, string> = {
  fertilize: 'bg-blue-100 text-blue-700 border-blue-200',
  pesticide: 'bg-red-100 text-red-700 border-red-200',
  irrigate: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  weed: 'bg-green-100 text-green-700 border-green-200',
  prune: 'bg-amber-100 text-amber-700 border-amber-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function Operations() {
  const operations = useAppStore((s) => s.operations);
  const seasons = useAppStore((s) => s.seasons);
  const fields = useAppStore((s) => s.fields);
  const addOperation = useAppStore((s) => s.addOperation);
  const deleteOperation = useAppStore((s) => s.deleteOperation);
  const showToast = useAppStore((s) => s.showToast);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<OperationType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsModalOpen(true);
      setSearchParams({}, { replace: true });
    }
    const seasonFromUrl = searchParams.get('season');
    const typeFromUrl = searchParams.get('type') as OperationType | null;
    if (seasonFromUrl) setSelectedSeasonId(seasonFromUrl);
    if (typeFromUrl) setSelectedType(typeFromUrl);
  }, [searchParams, setSearchParams]);

  const [form, setForm] = useState({
    seasonId: '',
    type: 'fertilize' as OperationType,
    date: format(new Date(), 'yyyy-MM-dd'),
    dosage: '',
    operator: '',
    note: '',
  });

  const unharvestedSeasons = useMemo(
    () => seasons.filter((s) => s.status !== 'harvested'),
    [seasons]
  );

  const filteredOperations = useMemo(() => {
    return operations
      .filter((op) => {
        if (selectedSeasonId !== 'all' && op.seasonId !== selectedSeasonId) return false;
        if (selectedType !== 'all' && op.type !== selectedType) return false;
        if (dateFrom && dateTo) {
          const opDate = parseISO(op.date);
          if (
            !isWithinInterval(opDate, {
              start: parseISO(dateFrom),
              end: parseISO(dateTo),
            })
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [operations, selectedSeasonId, selectedType, dateFrom, dateTo]);

  const getSeasonInfo = (seasonId: string) => {
    const season = seasons.find((s) => s.id === seasonId);
    const field = fields.find((f) => f.id === season?.fieldId);
    return { season, field };
  };

  const handleSubmit = () => {
    if (!form.seasonId || !form.date || !form.operator.trim()) {
      showToast('请填写必填项', 'warning');
      return;
    }
    addOperation({
      seasonId: form.seasonId,
      type: form.type,
      date: form.date,
      dosage: form.dosage,
      operator: form.operator.trim(),
      note: form.note.trim() || undefined,
    });
    showToast('操作记录已添加', 'success');
    setIsModalOpen(false);
    setForm({
      seasonId: '',
      type: 'fertilize',
      date: format(new Date(), 'yyyy-MM-dd'),
      dosage: '',
      operator: '',
      note: '',
    });
  };

  const handleDelete = () => {
    if (deleteDialog.id) {
      deleteOperation(deleteDialog.id);
      showToast('操作记录已删除', 'success');
    }
    setDeleteDialog({ open: false, id: null });
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="农事操作日志"
        subtitle="记录和管理日常农事活动，追溯每一次田间作业"
        breadcrumb={['农事管理', '操作日志']}
        actions={
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            新增操作记录
          </button>
        }
      />

      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Filter className="w-4 h-4 text-farm-primary" />
            筛选条件：
          </div>

          <div className="flex-1 min-w-[180px] max-w-xs">
            <select
              className="select-field"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
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

          <div className="min-w-[160px]">
            <select
              className="select-field"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as OperationType | 'all')}
            >
              <option value="all">全部操作类型</option>
              {(Object.keys(OPERATION_TYPE_LABEL) as OperationType[]).map((t) => (
                <option key={t} value={t}>
                  {OPERATION_TYPE_EMOJI[t]} {OPERATION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input-field w-[140px]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              className="input-field w-[140px]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <button
                className="p-2 rounded-lg text-gray-400 hover:text-farm-danger hover:bg-farm-danger/10 transition-colors"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 bg-farm-surface-alt rounded-lg border border-farm-border">
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                viewMode === 'timeline'
                  ? 'bg-farm-surface text-farm-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
              onClick={() => setViewMode('timeline')}
            >
              <GitBranch className="w-4 h-4" />
              时间线
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-farm-surface text-farm-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
              列表
            </button>
          </div>
        </div>
      </div>

      {filteredOperations.length === 0 ? (
        <div className="card py-16 text-center">
          <Leaf className="w-16 h-16 text-farm-border mx-auto mb-4" />
          <p className="text-gray-500 text-lg">暂无操作记录</p>
          <p className="text-gray-400 text-sm mt-1">点击右上角"新增操作记录"开始记录</p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-farm-border -translate-x-1/2" />
          <div className="space-y-8">
            {filteredOperations.map((op, idx) => {
              const { season, field } = getSeasonInfo(op.seasonId);
              const isLeft = idx % 2 === 0;
              return (
                <div
                  key={op.id}
                  className={cn(
                    'relative flex items-start gap-8',
                    isLeft ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  <div className="w-[calc(50%-2.5rem)]">
                    <div
                      className={cn(
                        'card card-hover relative group',
                        'animate-fade-in-up'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(op.date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                        </div>
                        <button
                          className="p-1.5 rounded-lg text-gray-300 hover:text-farm-danger hover:bg-farm-danger/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          onClick={() => setDeleteDialog({ open: true, id: op.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-farm-primary/5 border border-farm-primary/15">
                          <MapPin className="w-3.5 h-3.5 text-farm-primary" />
                          <span className="text-sm font-medium text-farm-primary-dark">
                            {field?.name ?? '未知地块'}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-600">{season?.cropName ?? '未知作物'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            OPERATION_BADGE_COLORS[op.type]
                          )}
                        >
                          <span>{OPERATION_TYPE_EMOJI[op.type]}</span>
                          {OPERATION_TYPE_LABEL[op.type]}
                        </span>
                        {op.dosage && (
                          <span className="badge badge-info">
                            <Leaf className="w-3 h-3" />
                            {op.dosage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {op.operator}
                        </div>
                      </div>

                      {op.note && (
                        <div className="mt-3 pt-3 border-t border-farm-border/50 text-sm text-gray-500">
                          {op.note}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute left-1/2 top-6 -translate-x-1/2 z-10">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-farm-surface',
                        OPERATION_COLORS[op.type]
                      )}
                    >
                      <span className="text-base">{OPERATION_TYPE_EMOJI[op.type]}</span>
                    </div>
                  </div>

                  <div className="w-[calc(50%-2.5rem)]" />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-wrap">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>地块 - 作物</th>
                  <th>操作类型</th>
                  <th>用量</th>
                  <th>操作人</th>
                  <th>备注</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((op) => {
                  const { season, field } = getSeasonInfo(op.seasonId);
                  return (
                    <tr key={op.id}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-farm-primary" />
                          {format(parseISO(op.date), 'yyyy-MM-dd')}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-farm-secondary" />
                          <span className="font-medium text-farm-primary-dark">
                            {field?.name ?? '-'}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-600">{season?.cropName ?? '-'}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            OPERATION_BADGE_COLORS[op.type]
                          )}
                        >
                          <span>{OPERATION_TYPE_EMOJI[op.type]}</span>
                          {OPERATION_TYPE_LABEL[op.type]}
                        </span>
                      </td>
                      <td className="text-gray-600">{op.dosage || '-'}</td>
                      <td>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {op.operator}
                        </div>
                      </td>
                      <td className="max-w-[200px]">
                        <div className="text-gray-500 truncate" title={op.note}>
                          {op.note || '-'}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          className="p-2 rounded-lg text-gray-400 hover:text-farm-danger hover:bg-farm-danger/10 transition-colors"
                          onClick={() => setDeleteDialog({ open: true, id: op.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新增操作记录"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleSubmit}>
              提交
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
              onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}
            >
              <option value="">请选择种植季</option>
              {unharvestedSeasons.map((s) => {
                const f = fields.find((f) => f.id === s.fieldId);
                return (
                  <option key={s.id} value={s.id}>
                    [{f?.name ?? '未知'}] {s.cropName}（{format(parseISO(s.sowingDate), 'M月d日')}播种）
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="label-field">
              操作类型 <span className="text-farm-danger">*</span>
            </label>
            <select
              className="select-field"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OperationType }))}
            >
              {(Object.keys(OPERATION_TYPE_LABEL) as OperationType[]).map((t) => (
                <option key={t} value={t}>
                  {OPERATION_TYPE_EMOJI[t]} {OPERATION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">
              日期 <span className="text-farm-danger">*</span>
            </label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="label-field">用量 / 数量</label>
            <input
              type="text"
              className="input-field"
              placeholder="如：尿素20kg、农药500ml、漫灌1次"
              value={form.dosage}
              onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
            />
          </div>

          <div>
            <label className="label-field">
              操作人 <span className="text-farm-danger">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="输入操作人姓名"
              value={form.operator}
              onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
            />
          </div>

          <div>
            <label className="label-field">备注</label>
            <textarea
              className="input-field min-h-[90px] resize-y"
              placeholder="补充说明..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="确认删除"
        message="确定要删除这条操作记录吗？此操作无法撤销。"
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
