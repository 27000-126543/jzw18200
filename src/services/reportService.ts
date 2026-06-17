import { subMonths, format } from 'date-fns';
import type {
  Season,
  Field,
  Cost,
  Harvest,
  VarietyComparison,
  FieldEfficiencyRank,
  YieldAbnormalityResult,
  MonthlyYieldPoint,
} from '../types';
import {
  calculateSeasonTotalCost,
  calculateSeasonRevenue,
} from './financeService';

export const compareCropVarieties = (
  seasons: Season[],
  fields: Field[],
  costs: Cost[],
  harvests: Harvest[]
): VarietyComparison[] => {
  const harvestedSeasons = seasons.filter((s) => s.status === 'harvested');

  const cropMap = new Map<
    string,
    {
      yieldsPerMu: number[];
      costsPerMu: number[];
      profitsPerMu: number[];
    }
  >();

  for (const season of harvestedSeasons) {
    const field = fields.find((f) => f.id === season.fieldId);
    if (!field || field.areaMu <= 0) continue;

    const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
    if (seasonHarvests.length === 0) continue;

    const totalYield = seasonHarvests.reduce((s, h) => s + h.actualYieldKg, 0);
    const totalCost = calculateSeasonTotalCost(season.id, costs);
    const revenue = calculateSeasonRevenue(season.id, harvests);
    const profit = revenue - totalCost;

    const yieldPerMu = totalYield / field.areaMu;
    const costPerMu = totalCost / field.areaMu;
    const profitPerMu = profit / field.areaMu;

    if (!cropMap.has(season.cropName)) {
      cropMap.set(season.cropName, {
        yieldsPerMu: [],
        costsPerMu: [],
        profitsPerMu: [],
      });
    }
    const data = cropMap.get(season.cropName)!;
    data.yieldsPerMu.push(yieldPerMu);
    data.costsPerMu.push(costPerMu);
    data.profitsPerMu.push(profitPerMu);
  }

  const result: VarietyComparison[] = [];
  for (const [cropName, data] of cropMap.entries()) {
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    result.push({
      cropName,
      averageYieldPerMu: Number(avg(data.yieldsPerMu).toFixed(2)),
      averageCostPerMu: Number(avg(data.costsPerMu).toFixed(2)),
      averageProfitPerMu: Number(avg(data.profitsPerMu).toFixed(2)),
      sampleCount: data.yieldsPerMu.length,
    });
  }

  result.sort((a, b) => b.averageProfitPerMu - a.averageProfitPerMu);
  return result;
};

export const rankFieldsByEfficiency = (
  seasons: Season[],
  fields: Field[],
  costs: Cost[],
  harvests: Harvest[]
): FieldEfficiencyRank[] => {
  const fieldStats = new Map<
    string,
    {
      fieldName: string;
      totalYield: number;
      totalCost: number;
      totalRevenue: number;
    }
  >();

  for (const field of fields) {
    fieldStats.set(field.id, {
      fieldName: field.name,
      totalYield: 0,
      totalCost: 0,
      totalRevenue: 0,
    });
  }

  for (const season of seasons) {
    const stats = fieldStats.get(season.fieldId);
    if (!stats) continue;

    stats.totalCost += calculateSeasonTotalCost(season.id, costs);
    stats.totalRevenue += calculateSeasonRevenue(season.id, harvests);

    const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
    for (const h of seasonHarvests) {
      stats.totalYield += h.actualYieldKg;
    }
  }

  const result: FieldEfficiencyRank[] = [];
  for (const [fieldId, stats] of fieldStats.entries()) {
    result.push({
      fieldId,
      fieldName: stats.fieldName,
      totalYield: Number(stats.totalYield.toFixed(2)),
      totalCost: Number(stats.totalCost.toFixed(2)),
      totalRevenue: Number(stats.totalRevenue.toFixed(2)),
      netProfit: Number((stats.totalRevenue - stats.totalCost).toFixed(2)),
      rank: 0,
    });
  }

  result.sort((a, b) => b.netProfit - a.netProfit);
  for (let i = 0; i < result.length; i++) {
    result[i].rank = i + 1;
  }

  return result;
};

export const detectYieldAbnormality = (
  currentYield: number,
  historicalYields: number[],
  threshold: number = 0.15
): YieldAbnormalityResult => {
  if (historicalYields.length === 0) {
    return { isAbnormal: false, deviation: 0, trend: 'stable' };
  }

  const avgHistorical =
    historicalYields.reduce((s, v) => s + v, 0) / historicalYields.length;

  if (avgHistorical === 0) {
    return { isAbnormal: false, deviation: 0, trend: 'stable' };
  }

  const deviation = (currentYield - avgHistorical) / avgHistorical;
  const isAbnormal = Math.abs(deviation) >= threshold;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (deviation > threshold * 0.5) {
    trend = 'up';
  } else if (deviation < -threshold * 0.5) {
    trend = 'down';
  }

  return {
    isAbnormal,
    deviation: Number(deviation.toFixed(4)),
    trend,
  };
};

export const getMonthlyYieldTrend = (
  harvests: Harvest[],
  seasons: Season[],
  months: number = 12
): MonthlyYieldPoint[] => {
  const now = new Date();
  const result: MonthlyYieldPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const year = date.getFullYear();
    const monthNum = date.getMonth() + 1;
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'yyyy年MM月');

    result.push({
      month: monthLabel,
      year,
      monthNum,
      totalYield: 0,
      cropBreakdown: {},
    });
    void monthKey;
  }

  const seasonMap = new Map(seasons.map((s) => [s.id, s]));

  for (const harvest of harvests) {
    const harvestDate = new Date(harvest.harvestDate);
    const harvestMonth = harvestDate.getMonth() + 1;
    const harvestYear = harvestDate.getFullYear();

    const point = result.find(
      (p) => p.year === harvestYear && p.monthNum === harvestMonth
    );
    if (!point) continue;

    const season = seasonMap.get(harvest.seasonId);
    const cropName = season?.cropName ?? '未知作物';

    point.totalYield += harvest.actualYieldKg;
    point.cropBreakdown[cropName] =
      (point.cropBreakdown[cropName] ?? 0) + harvest.actualYieldKg;
  }

  for (const point of result) {
    point.totalYield = Number(point.totalYield.toFixed(2));
    for (const crop of Object.keys(point.cropBreakdown)) {
      point.cropBreakdown[crop] = Number(point.cropBreakdown[crop].toFixed(2));
    }
  }

  return result;
};
