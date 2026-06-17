export type SoilType = 'sandy' | 'loam' | 'clay' | 'silty' | 'peaty' | 'saline';

export const SOIL_TYPE_LABEL: Record<SoilType, string> = {
  sandy: '沙质土',
  loam: '壤土',
  clay: '黏质土',
  silty: '粉砂土',
  peaty: '泥炭土',
  saline: '盐碱土',
};

export interface Field {
  id: string;
  name: string;
  areaMu: number;
  soilType: SoilType;
  location: string;
  note?: string;
  createdAt: string;
}

export type SeasonStatus = 'seeding' | 'growing' | 'harvested';

export const SEASON_STATUS_LABEL: Record<SeasonStatus, string> = {
  seeding: '播种期',
  growing: '生长期',
  harvested: '已收获',
};

export interface Season {
  id: string;
  fieldId: string;
  cropName: string;
  sowingDate: string;
  expectedHarvestDate: string;
  status: SeasonStatus;
  createdAt: string;
}

export type OperationType = 'fertilize' | 'pesticide' | 'irrigate' | 'weed' | 'prune' | 'other';

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  fertilize: '施肥',
  pesticide: '打药',
  irrigate: '灌溉',
  weed: '除草',
  prune: '修剪',
  other: '其他',
};

export const OPERATION_TYPE_EMOJI: Record<OperationType, string> = {
  fertilize: '🧪',
  pesticide: '💊',
  irrigate: '💧',
  weed: '🌿',
  prune: '✂️',
  other: '📋',
};

export interface Operation {
  id: string;
  seasonId: string;
  type: OperationType;
  date: string;
  dosage: string;
  operator: string;
  note?: string;
}

export type CostCategory = 'seed' | 'pesticide' | 'fertilizer' | 'labor' | 'other';

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  seed: '种子',
  pesticide: '农药',
  fertilizer: '化肥',
  labor: '人工',
  other: '其他',
};

export const COST_CATEGORY_COLOR: Record<CostCategory, string> = {
  seed: '#22c55e',
  pesticide: '#ef4444',
  fertilizer: '#3b82f6',
  labor: '#f59e0b',
  other: '#6b7280',
};

export interface Cost {
  id: string;
  seasonId: string;
  category: CostCategory;
  amount: number;
  description: string;
  date: string;
}

export type QualityLevel = 'excellent' | 'good' | 'normal' | 'poor';

export const QUALITY_LEVEL_LABEL: Record<QualityLevel, string> = {
  excellent: '优质',
  good: '良好',
  normal: '一般',
  poor: '较差',
};

export interface Harvest {
  id: string;
  seasonId: string;
  harvestDate: string;
  actualYieldKg: number;
  qualityLevel: QualityLevel;
  unitPrice: number;
  isAbnormal: boolean;
  abnormalReason?: string;
  analysisNote?: string;
}

export type ReminderPriority = 'high' | 'medium' | 'low';

export const REMINDER_PRIORITY_LABEL: Record<ReminderPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export type ReminderStatus = 'pending' | 'completed' | 'overdue';

export const REMINDER_STATUS_LABEL: Record<ReminderStatus, string> = {
  pending: '待处理',
  completed: '已完成',
  overdue: '已逾期',
};

export interface Reminder {
  id: string;
  seasonId: string;
  type: string;
  targetDate: string;
  status: ReminderStatus;
  priority: ReminderPriority;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

export const WEATHER_TYPE_LABEL: Record<WeatherType, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '雨天',
  stormy: '暴雨',
};

export const WEATHER_TYPE_EMOJI: Record<WeatherType, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  stormy: '⛈️',
};

export interface WeatherData {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  rainfall: number;
  weatherType: WeatherType;
}

export interface CropVarietyKeyNode {
  name: string;
  daysAfterSowing: number;
  operationType: OperationType;
  priority: number;
}

export interface CropVariety {
  name: string;
  growthDays: number;
  keyNodes: CropVarietyKeyNode[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface CostBreakdownItem {
  category: CostCategory;
  amount: number;
  percentage: number;
  label: string;
  color: string;
}

export interface PerMuMetrics {
  costPerMu: number;
  revenuePerMu: number;
  profitPerMu: number;
  yieldPerMu: number;
}

export interface FinanceSummary {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  averageYieldPerMu: number;
}

export interface VarietyComparison {
  cropName: string;
  averageYieldPerMu: number;
  averageCostPerMu: number;
  averageProfitPerMu: number;
  sampleCount: number;
}

export interface FieldEfficiencyRank {
  fieldId: string;
  fieldName: string;
  totalYield: number;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  rank: number;
}

export interface YieldAbnormalityResult {
  isAbnormal: boolean;
  deviation: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MonthlyYieldPoint {
  month: string;
  year: number;
  monthNum: number;
  totalYield: number;
  cropBreakdown: Record<string, number>;
}

export interface WeatherOperationCorrelation {
  weather: WeatherData;
  operations: Operation[];
  daysGap: number;
}
