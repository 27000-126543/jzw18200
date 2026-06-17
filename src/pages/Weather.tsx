import { useMemo, useState } from 'react';
import {
  CloudSun, CloudRain, Wind, Droplets, Thermometer,
  AlertTriangle, Lightbulb, Calendar, Leaf, RefreshCw,
  Cloud, Filter, BarChart3,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { LineChart, BarChart } from '@/components/charts';
import {
  WEATHER_TYPE_LABEL, WEATHER_TYPE_EMOJI,
  OPERATION_TYPE_LABEL,
} from '@/types';
import {
  generateMockWeatherData,
  correlateOperationsWithWeather,
} from '@/services/weatherService';
import { cn } from '@/lib/utils';

type TabKey = 'trend' | 'correlation';

const weatherBgGradient: Record<string, string> = {
  sunny: 'from-yellow-400 via-orange-300 to-amber-200',
  cloudy: 'from-slate-400 via-gray-300 to-slate-200',
  rainy: 'from-blue-500 via-sky-400 to-cyan-300',
  stormy: 'from-purple-600 via-indigo-500 to-blue-500',
};

const windLevels = ['1级', '2级', '3级', '2级', '3级', '4级', '2级'];
const humidityLevels = [45, 52, 60, 78, 88, 72, 48];

export default function Weather() {
  const { weather, operations, seasons, fields, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabKey>('trend');
  const [selectedRainEvent, setSelectedRainEvent] = useState<string>('all');

  const todayWeather = weather[weather.length - 1] || generateMockWeatherData(1)[0];

  const combinedTrendData = useMemo(() =>
    weather.map((w) => ({
      label: format(parseISO(w.date), 'M/d', { locale: zhCN }),
      value: w.temperatureMax,
      最高温: w.temperatureMax,
      最低温: w.temperatureMin,
      降雨量: w.rainfall,
    })), [weather]);

  const rainfallData = useMemo(() =>
    weather.map(w => ({
      label: format(parseISO(w.date), 'M/d', { locale: zhCN }),
      value: w.rainfall,
      color: w.rainfall > 20 ? '#3b82f6' : w.rainfall > 5 ? '#60a5fa' : '#93c5fd',
    })), [weather]);

  const correlations = useMemo(() =>
    correlateOperationsWithWeather(operations, weather, 3),
    [operations, weather]);

  const rainEvents = useMemo(() =>
    weather.filter(w => w.rainfall > 1).sort((a, b) =>
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    ), [weather]);

  const filteredCorrelations = useMemo(() => {
    if (selectedRainEvent === 'all') return correlations;
    return correlations.filter(c => c.weather.date === selectedRainEvent);
  }, [correlations, selectedRainEvent]);

  const operationTypeDistribution = useMemo(() => {
    const distMap = new Map<string, number[]>();
    for (let day = 0; day <= 3; day++) {
      distMap.set(`雨后${day}天`, [0, 0, 0, 0, 0, 0]);
    }
    filteredCorrelations.forEach(c => {
      c.operations.forEach(op => {
        const gapDays = Math.min(3, Math.max(0,
          Math.floor((parseISO(op.date).getTime() - parseISO(c.weather.date).getTime()) / 86400000)
        ));
        const typeIdx = ['fertilize', 'pesticide', 'irrigate', 'weed', 'prune', 'other'].indexOf(op.type);
        if (typeIdx >= 0) {
          const key = `雨后${gapDays}天`;
          const arr = distMap.get(key)!;
          arr[typeIdx] = (arr[typeIdx] || 0) + 1;
        }
      });
    });
    return Array.from(distMap.entries()).map(([label, counts]) => ({
      label,
      施肥: counts[0],
      打药: counts[1],
      灌溉: counts[2],
      除草: counts[3],
      修剪: counts[4],
      其他: counts[5],
      总数: counts.reduce((s, v) => s + v, 0),
    }));
  }, [filteredCorrelations]);

  const opTypeBarData = useMemo(() =>
    operationTypeDistribution.map(d => ({
      label: d.label,
      value: d.总数,
      color: '#2D6A4F',
    })), [operationTypeDistribution]);

  const abnormalWarnings = useMemo(() => {
    const warnings: Array<{ level: 'high' | 'medium' | 'low'; type: string; desc: string; advice: string }> = [];
    const recent = weather.slice(-3);
    recent.forEach(w => {
      if (w.weatherType === 'stormy' || w.rainfall >= 50) {
        warnings.push({
          level: 'high', type: '暴雨预警',
          desc: `${format(parseISO(w.date), 'M月d日')} 降雨量${w.rainfall}mm，达到暴雨级别`,
          advice: '及时排水防涝，加固大棚设施，雨后注意防治病害',
        });
      }
      if (w.temperatureMax >= 35) {
        warnings.push({
          level: 'medium', type: '高温预警',
          desc: `${format(parseISO(w.date), 'M月d日')} 最高温${w.temperatureMax}℃，需防暑`,
          advice: '避免正午田间作业，加强灌溉频率，可喷施抗旱剂',
        });
      }
      if (w.rainfall >= 20 && w.rainfall < 50) {
        warnings.push({
          level: 'low', type: '降雨提醒',
          desc: `${format(parseISO(w.date), 'M月d日')} 中到大雨${w.rainfall}mm`,
          advice: '雨后2-3天是追肥最佳时机，注意观察病害发生',
        });
      }
    });
    return warnings.slice(0, 3);
  }, [weather]);

  const insights = useMemo(() => [
    { title: '追肥时机', text: '雨后追肥建议在雨后2天进行，此时土壤湿润度适宜，肥效最佳' },
    { title: '病害预防', text: '连续降雨后3天内重点防治霜霉病、灰霉病等高湿病害' },
    { title: '灌溉调度', text: '若预报未来3天有降雨，可适当推迟或减少人工灌溉计划' },
    { title: '作业安排', text: '雨后1天土壤较粘重，建议避免重型机械进地作业' },
  ], []);

  const refreshWeather = () => {
    showToast('正在获取最新气象数据...', 'info');
    setTimeout(() => showToast('气象数据已更新（模拟）', 'success'), 1000);
  };

  const getSeasonInfo = (seasonId: string) => {
    const s = seasons.find(x => x.id === seasonId);
    const f = fields.find(x => x.id === s?.fieldId);
    return { season: s, field: f };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="气象信息"
        subtitle="实时天气与农事关联分析，科学指导田间作业"
        breadcrumb={['气象服务', '气象信息']}
        actions={
          <button className="btn-secondary" onClick={refreshWeather}>
            <RefreshCw className="w-4 h-4" />刷新数据
          </button>
        }
      />

      <div className={cn(
        'rounded-2xl p-6 md:p-8 bg-gradient-to-br shadow-card-hover',
        weatherBgGradient[todayWeather.weatherType] || weatherBgGradient.sunny
      )}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div className="flex items-center gap-6">
            <div className="text-7xl md:text-8xl drop-shadow-lg">
              {WEATHER_TYPE_EMOJI[todayWeather.weatherType]}
            </div>
            <div>
              <div className="text-white/80 text-sm md:text-base mb-1">
                {format(parseISO(todayWeather.date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
              </div>
              <div className="text-5xl md:text-6xl font-bold drop-shadow mb-2">
                {WEATHER_TYPE_LABEL[todayWeather.weatherType]}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-white/90">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-lg md:text-xl font-semibold">
                    {todayWeather.temperatureMin}° ~ {todayWeather.temperatureMax}°C
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4" />
                  <span className="text-lg md:text-xl font-semibold">
                    降雨 {todayWeather.rainfall}mm
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="w-4 h-4" />
                  <span className="text-lg md:text-xl font-semibold">
                    风力 {windLevels[6] || '2级'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" />
                  <span className="text-lg md:text-xl font-semibold">
                    湿度 {humidityLevels[6] || 50}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 text-center md:text-right">
            <div className="text-sm text-white/70 mb-1">今日农事建议</div>
            <div className="text-base md:text-lg font-medium max-w-xs leading-relaxed">
              {todayWeather.rainfall > 10
                ? '今日有雨，建议暂停田间作业，做好排水准备'
                : todayWeather.temperatureMax > 32
                  ? '气温偏高，建议早晚作业，午间注意防暑补水'
                  : '天气晴好，适宜进行施肥、打药、灌溉等田间作业'}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-1 inline-flex gap-1">
        {[
          { k: 'trend', label: '近7天趋势', icon: CloudSun },
          { k: 'correlation', label: '气象农事关联', icon: Leaf },
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

      {activeTab === 'trend' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-farm-primary-dark flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-farm-danger" />
                温度与降雨趋势（近7天）
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-red-500 rounded-full" />
                  <span className="text-gray-600">最高温度</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
                  <span className="text-gray-600">最低温度</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-sky-400 rounded-sm" />
                  <span className="text-gray-600">降雨量</span>
                </div>
              </div>
            </div>
            <LineChart
              data={combinedTrendData}
              lines={[
                { key: '最高温', color: '#EF4444', label: '最高温(°C)' },
                { key: '最低温', color: '#3B82F6', label: '最低温(°C)' },
              ]}
              height={260}
              yUnit="°C"
              showArea={false}
            />
            <div className="mt-4 pt-4 border-t border-farm-border/60">
              <BarChart
                data={rainfallData}
                height={160}
                yUnit="mm"
              />
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-farm-primary" />
              7日天气预报
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {weather.map((w, i) => (
                <div
                  key={w.date}
                  className={cn(
                    'rounded-xl p-4 text-center transition-all',
                    i === weather.length - 1
                      ? 'bg-gradient-to-br from-farm-primary/15 to-farm-accent/15 border-2 border-farm-primary/30 shadow-soft'
                      : 'bg-farm-surface-alt/60 hover:bg-farm-surface-alt border border-farm-border/40'
                  )}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {format(parseISO(w.date), 'M月d日', { locale: zhCN })}
                  </div>
                  <div className="text-xs font-medium text-farm-primary mb-2">
                    {i === weather.length - 1 ? '今天' :
                      i === weather.length - 2 ? '昨天' :
                        format(parseISO(w.date), 'EEE', { locale: zhCN })}
                  </div>
                  <div className="text-4xl mb-2">
                    {WEATHER_TYPE_EMOJI[w.weatherType]}
                  </div>
                  <div className="text-sm font-semibold text-farm-primary-dark mb-2">
                    {WEATHER_TYPE_LABEL[w.weatherType]}
                  </div>
                  <div className="text-sm font-bold text-gray-700 mb-2">
                    {w.temperatureMin}° ~ {w.temperatureMax}°
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center justify-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-500" />
                      <span>{w.rainfall}mm</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Cloud className="w-3 h-3 text-gray-400" />
                      <span>湿度 {humidityLevels[i] || 55}%</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Wind className="w-3 h-3 text-teal-500" />
                      <span>风力 {windLevels[i] || '2级'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'correlation' && (
        <>
          <div className="card">
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="font-medium">筛选降雨事件：</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="select-field !w-auto min-w-[200px]"
                value={selectedRainEvent}
                onChange={e => setSelectedRainEvent(e.target.value)}
              >
                <option value="all">全部降雨事件（共{rainEvents.length}次）</option>
                {rainEvents.map(w => (
                  <option key={w.date} value={w.date}>
                    {format(parseISO(w.date), 'yyyy年M月d日', { locale: zhCN })} -
                    降雨{w.rainfall}mm ({WEATHER_TYPE_LABEL[w.weatherType]})
                  </option>
                ))}
              </select>
              {rainEvents.length === 0 && (
                <span className="text-sm text-gray-400">近7天无明显降雨</span>
              )}
            </div>
          </div>

          {abnormalWarnings.length > 0 && (
            <div className="card border-l-4 !border-l-amber-400">
              <h2 className="text-lg font-semibold text-farm-primary-dark mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                异常天气预警与农事建议
              </h2>
              <div className="space-y-3">
                {abnormalWarnings.map((w, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-lg border',
                      w.level === 'high' ? 'bg-red-50 border-red-200' :
                        w.level === 'medium' ? 'bg-amber-50 border-amber-200' :
                          'bg-sky-50 border-sky-200'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        'badge shrink-0',
                        w.level === 'high' ? 'bg-red-100 text-red-700' :
                          w.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-sky-100 text-sky-700'
                      )}>
                        {w.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-700 font-medium">{w.desc}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                          <Lightbulb className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                          <span>建议：{w.advice}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-sky-500" />
                降雨事件 → 农事操作统计
              </h2>
              {filteredCorrelations.length === 0 ? (
                <EmptyState icon={CloudRain} title="暂无关联数据" description="暂未检测到降雨后3天内的农事操作" />
              ) : (
                <div className="space-y-3">
                  {filteredCorrelations.map((c, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-farm-surface-alt/60 border border-farm-border/40"
                    >
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{WEATHER_TYPE_EMOJI[c.weather.weatherType]}</span>
                          <div>
                            <div className="font-semibold text-farm-primary-dark">
                              {format(parseISO(c.weather.date), 'M月d日', { locale: zhCN })} 降雨
                            </div>
                            <div className="text-xs text-gray-500">
                              降雨量 {c.weather.rainfall}mm · 随后 {c.daysGap} 天内共 {c.operations.length} 次操作
                            </div>
                          </div>
                        </div>
                        <span className="badge badge-info">
                          操作 {c.operations.length} 次
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {c.operations.slice(0, 5).map(op => {
                          const { season, field } = getSeasonInfo(op.seasonId);
                          return (
                            <div
                              key={op.id}
                              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-farm-surface/60 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg">
                                  {{
                                    fertilize: '🧪', pesticide: '💊', irrigate: '💧',
                                    weed: '🌿', prune: '✂️', other: '📋'
                                  }[op.type]}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-medium text-gray-700">
                                    {OPERATION_TYPE_LABEL[op.type]}
                                  </span>
                                  {season && (
                                    <span className="text-xs text-gray-400 ml-1.5">
                                      · {season.cropName} {field?.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500 shrink-0 ml-2">
                                {format(parseISO(op.date), 'M月d日', { locale: zhCN })}
                              </span>
                            </div>
                          );
                        })}
                        {c.operations.length > 5 && (
                          <div className="text-xs text-center text-gray-400 pt-1">
                            ... 还有 {c.operations.length - 5} 次操作
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-farm-primary-dark mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-farm-primary" />
                  雨后天数 vs 操作次数分布
                </h2>
                {opTypeBarData.every(d => d.value === 0) ? (
                  <EmptyState icon={BarChart3} title="暂无数据" />
                ) : (
                  <BarChart
                    data={opTypeBarData}
                    height={240}
                    yUnit="次"
                  />
                )}
              </div>

              <div className="card border-l-4 !border-l-farm-primary">
                <h2 className="text-lg font-semibold text-farm-primary-dark mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  关联洞察与建议
                </h2>
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-gradient-to-r from-farm-primary/5 to-transparent border border-farm-primary/10"
                    >
                      <div className="flex items-start gap-2">
                        <span className="badge badge-success shrink-0 !px-2 !py-0.5">
                          {ins.title}
                        </span>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {ins.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
