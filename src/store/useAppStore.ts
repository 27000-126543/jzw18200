import { create } from 'zustand';
import type {
  Field,
  Season,
  Operation,
  Cost,
  Harvest,
  Reminder,
  WeatherData,
  ToastMessage,
  ToastType,
  ReminderStatus,
} from '../types';
import {
  initialFields,
  initialSeasons,
  initialOperations,
  initialCosts,
  initialHarvests,
  initialReminders,
  initialWeather,
} from '../data/mockData';

const STORAGE_KEY = 'farm-app-state';

interface AppState {
  fields: Field[];
  seasons: Season[];
  operations: Operation[];
  costs: Cost[];
  harvests: Harvest[];
  reminders: Reminder[];
  weather: WeatherData[];
  toast: ToastMessage | null;

  addField: (field: Omit<Field, 'id' | 'createdAt'>) => void;
  updateField: (id: string, updates: Partial<Field>) => void;
  deleteField: (id: string) => void;

  addSeason: (season: Omit<Season, 'id' | 'createdAt'>) => void;
  updateSeason: (id: string, updates: Partial<Season>) => void;
  deleteSeason: (id: string) => void;

  addOperation: (operation: Omit<Operation, 'id'>) => void;
  deleteOperation: (id: string) => void;

  addCost: (cost: Omit<Cost, 'id'>) => void;
  deleteCost: (id: string) => void;

  addHarvest: (harvest: Omit<Harvest, 'id'>) => void;
  updateHarvest: (id: string, updates: Partial<Harvest>) => void;
  deleteHarvest: (id: string) => void;

  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  updateReminderStatus: (id: string, status: ReminderStatus) => void;

  showToast: (message: string, type?: ToastType) => void;

  hydrate: () => void;
  persist: () => void;
}

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useAppStore = create<AppState>((set, get) => {
  return {
    fields: [],
    seasons: [],
    operations: [],
    costs: [],
    harvests: [],
    reminders: [],
    weather: [],
    toast: null,

    addField: (field) =>
      set((state) => ({
        fields: [
          ...state.fields,
          { ...field, id: generateId('field'), createdAt: new Date().toISOString() },
        ],
      })),
    updateField: (id, updates) =>
      set((state) => ({
        fields: state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      })),
    deleteField: (id) =>
      set((state) => ({
        fields: state.fields.filter((f) => f.id !== id),
        seasons: state.seasons.filter((s) => s.fieldId !== id),
      })),

    addSeason: (season) =>
      set((state) => ({
        seasons: [
          ...state.seasons,
          { ...season, id: generateId('season'), createdAt: new Date().toISOString() },
        ],
      })),
    updateSeason: (id, updates) =>
      set((state) => ({
        seasons: state.seasons.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      })),
    deleteSeason: (id) =>
      set((state) => ({
        seasons: state.seasons.filter((s) => s.id !== id),
        operations: state.operations.filter((o) => o.seasonId !== id),
        costs: state.costs.filter((c) => c.seasonId !== id),
        harvests: state.harvests.filter((h) => h.seasonId !== id),
        reminders: state.reminders.filter((r) => r.seasonId !== id),
      })),

    addOperation: (operation) =>
      set((state) => ({
        operations: [...state.operations, { ...operation, id: generateId('op') }],
      })),
    deleteOperation: (id) =>
      set((state) => ({
        operations: state.operations.filter((o) => o.id !== id),
      })),

    addCost: (cost) =>
      set((state) => ({
        costs: [...state.costs, { ...cost, id: generateId('cost') }],
      })),
    deleteCost: (id) =>
      set((state) => ({
        costs: state.costs.filter((c) => c.id !== id),
      })),

    addHarvest: (harvest) =>
      set((state) => ({
        harvests: [...state.harvests, { ...harvest, id: generateId('harvest') }],
      })),
    updateHarvest: (id, updates) =>
      set((state) => ({
        harvests: state.harvests.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      })),
    deleteHarvest: (id) =>
      set((state) => ({
        harvests: state.harvests.filter((h) => h.id !== id),
      })),

    addReminder: (reminder) =>
      set((state) => ({
        reminders: [...state.reminders, { ...reminder, id: generateId('reminder') }],
      })),
    updateReminder: (id, updates) =>
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      })),
    deleteReminder: (id) =>
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
      })),
    updateReminderStatus: (id, status) =>
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? { ...r, status } : r)),
      })),

    showToast: (message, type: ToastType = 'info') => {
      const id = generateId('toast');
      set({ toast: { id, message, type } });
      setTimeout(() => {
        const current = get().toast;
        if (current?.id === id) {
          set({ toast: null });
        }
      }, 3000);
    },

    hydrate: () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            fields: parsed.fields ?? [],
            seasons: parsed.seasons ?? [],
            operations: parsed.operations ?? [],
            costs: parsed.costs ?? [],
            harvests: parsed.harvests ?? [],
            reminders: parsed.reminders ?? [],
            weather: parsed.weather ?? initialWeather,
          });
        } else {
          set({
            fields: initialFields,
            seasons: initialSeasons,
            operations: initialOperations,
            costs: initialCosts,
            harvests: initialHarvests,
            reminders: initialReminders,
            weather: initialWeather,
          });
        }
      } catch {
        set({
          fields: initialFields,
          seasons: initialSeasons,
          operations: initialOperations,
          costs: initialCosts,
          harvests: initialHarvests,
          reminders: initialReminders,
          weather: initialWeather,
        });
      }
    },

    persist: () => {
      const state = get();
      try {
        const data = {
          fields: state.fields,
          seasons: state.seasons,
          operations: state.operations,
          costs: state.costs,
          harvests: state.harvests,
          reminders: state.reminders,
          weather: state.weather,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    },
  };
});

useAppStore.getState().hydrate();
useAppStore.subscribe(() => {
  useAppStore.getState().persist();
});

export default useAppStore;
