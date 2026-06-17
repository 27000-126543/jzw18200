import type {
  Cost,
  Harvest,
  Season,
  Field,
  CostBreakdownItem,
  PerMuMetrics,
  FinanceSummary,
  CostCategory,
} from '../types';

const COST_CATEGORY_CONFIG: Record<CostCategory, { label: string; color: string }> = {
  seed: { label: '种子费', color: '#2D6A4F' },
  pesticide: { label: '农药费', color: '#E63946' },
  fertilizer: { label: '化肥费', color: '#D4A373' },
  labor: { label: '人工费', color: '#457B9D' },
  other: { label: '其他费用', color: '#6C757D' },
};

export const calculateSeasonTotalCost = (
  seasonId: string,
  costs: Cost[]
): number => {
  return costs
    .filter((c) => c.seasonId === seasonId)
    .reduce((sum, c) => sum + c.amount, 0);
};

export const calculateSeasonRevenue = (
  seasonId: string,
  harvests: Harvest[]
): number => {
  return harvests
    .filter((h) => h.seasonId === seasonId)
    .reduce((sum, h) => sum + h.actualYieldKg * h.unitPrice, 0);
};

export const calculateSeasonProfit = (
  seasonId: string,
  costs: Cost[],
  harvests: Harvest[]
): number => {
  const revenue = calculateSeasonRevenue(seasonId, harvests);
  const totalCost = calculateSeasonTotalCost(seasonId, costs);
  return revenue - totalCost;
};

export const calculatePerMuMetrics = (
  seasonId: string,
  seasons: Season[],
  fields: Field[],
  costs: Cost[],
  harvests: Harvest[]
): PerMuMetrics => {
  const season = seasons.find((s) => s.id === seasonId);
  const field = season ? fields.find((f) => f.id === season.fieldId) : undefined;
  const areaMu = field?.areaMu ?? 0;

  const totalCost = calculateSeasonTotalCost(seasonId, costs);
  const revenue = calculateSeasonRevenue(seasonId, harvests);
  const profit = revenue - totalCost;
  const totalYield = harvests
    .filter((h) => h.seasonId === seasonId)
    .reduce((sum, h) => sum + h.actualYieldKg, 0);

  if (areaMu <= 0) {
    return {
      costPerMu: 0,
      revenuePerMu: 0,
      profitPerMu: 0,
      yieldPerMu: 0,
    };
  }

  return {
    costPerMu: Number((totalCost / areaMu).toFixed(2)),
    revenuePerMu: Number((revenue / areaMu).toFixed(2)),
    profitPerMu: Number((profit / areaMu).toFixed(2)),
    yieldPerMu: Number((totalYield / areaMu).toFixed(2)),
  };
};

export const getCostBreakdownByCategory = (
  seasonId: string,
  costs: Cost[]
): CostBreakdownItem[] => {
  const seasonCosts = costs.filter((c) => c.seasonId === seasonId);
  const total = seasonCosts.reduce((sum, c) => sum + c.amount, 0);

  const categoryMap = new Map<CostCategory, number>();
  for (const cost of seasonCosts) {
    const current = categoryMap.get(cost.category) ?? 0;
    categoryMap.set(cost.category, current + cost.amount);
  }

  const result: CostBreakdownItem[] = [];
  for (const [category, amount] of categoryMap.entries()) {
    const config = COST_CATEGORY_CONFIG[category];
    result.push({
      category,
      amount,
      percentage: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
      label: config.label,
      color: config.color,
    });
  }

  result.sort((a, b) => b.amount - a.amount);
  return result;
};

export const calculateAllSeasonsFinanceSummary = (
  seasons: Season[],
  fields: Field[],
  costs: Cost[],
  harvests: Harvest[]
): FinanceSummary => {
  let totalCost = 0;
  let totalRevenue = 0;
  let totalYield = 0;
  let totalArea = 0;

  const harvestedSeasons = seasons.filter((s) => s.status === 'harvested');

  for (const season of harvestedSeasons) {
    const field = fields.find((f) => f.id === season.fieldId);
    if (field) {
      totalArea += field.areaMu;
    }
    totalCost += calculateSeasonTotalCost(season.id, costs);
    const seasonHarvests = harvests.filter((h) => h.seasonId === season.id);
    for (const h of seasonHarvests) {
      totalRevenue += h.actualYieldKg * h.unitPrice;
      totalYield += h.actualYieldKg;
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const averageYieldPerMu = totalArea > 0 ? Number((totalYield / totalArea).toFixed(2)) : 0;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    averageYieldPerMu,
  };
};
